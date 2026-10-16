import React, { useEffect, useState, useCallback } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  Row,
  Select,
  Space,
  Tabs,
  Typography,
  message,
} from "antd";
import { CheckCircleFilled, CloseOutlined, InfoCircleFilled, SaveOutlined } from "@ant-design/icons";
import { BsInfoCircleFill } from "react-icons/bs";
import { FaLightbulb } from "react-icons/fa";
import Service from "../../../service";
import { SettingsSkeleton } from "../../../components/common/SkeletonLoader";
import GmailIcon from "../../../assets/images/AppLogo/GmailIcon";
import OutLookIcon from "../../../assets/images/OutLookIcon";
import "./SettingsModule.scss";

const { Title, Text } = Typography;
const { Option } = Select;
const { Password } = Input;

// Gmail defaults — what "Reset to Default" puts back (same as HRMS).
const GMAIL_DEFAULTS = { smtpHost: "smtp.gmail.com", smtpPort: "465", smtpSecure: true };
const DEFAULT_FILE_LIMIT_MB = 1;
const MAX_FILE_LIMIT_MB = 80;

/**
 * System Settings — same layout as WeekMate HRMS (components/SettingsModule):
 * tabs, page-header cards, Manual SMTP Configuration card with a live
 * connection status, and File Upload Limits. Only settings TaskHub's server
 * actually supports are shown.
 */
const SettingsModule = () => {
  const [form] = Form.useForm();
  const [fileForm] = Form.useForm();
  const [outlookForm] = Form.useForm();
  const [activeEmailProvider, setActiveEmailProvider] = useState("smtp");

  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fileSaving, setFileSaving] = useState(false);
  const [currentConfig, setCurrentConfig] = useState(null);
  const [error, setError] = useState(null);
  // idle | checking | connected | failed — the "Connected" banner only shows
  // once the saved settings have actually connected.
  const [smtpCheck, setSmtpCheck] = useState({ status: "idle", reason: "" });

  const runSmtpVerification = useCallback(async () => {
    setSmtpCheck({ status: "checking", reason: "" });
    try {
      const res = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.smtpVerify,
      });
      const result = res?.data?.data;
      setSmtpCheck(
        result?.connected
          ? { status: "connected", reason: "" }
          : { status: "failed", reason: result?.reason || res?.data?.message || "Could not connect to the mail server." }
      );
    } catch (e) {
      setSmtpCheck({ status: "failed", reason: "Could not connect to the mail server." });
    }
  }, []);

  const fetchData = useCallback(async () => {
    setPageLoading(true);
    try {
      const [smtpRes, companyRes] = await Promise.all([
        Service.makeAPICall({ methodName: Service.getMethod, api_url: Service.smtpGetConfig }),
        Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.getCompanyList,
          body: { page: 1, limit: 1 },
        }),
      ]);

      const config = smtpRes?.data?.status === 1 ? smtpRes.data.data : null;
      const configured = Boolean(config?.smtpHost && config?.smtpEmail);
      setCurrentConfig(configured ? config : null);
      form.setFieldsValue({
        smtpHost: config?.smtpHost || GMAIL_DEFAULTS.smtpHost,
        smtpPort: config?.smtpPort?.toString() || GMAIL_DEFAULTS.smtpPort,
        smtpSecure: config ? Boolean(config.smtpSecure) : GMAIL_DEFAULTS.smtpSecure,
        fromName: config?.fromName || "",
        smtpEmail: config?.smtpEmail || "",
        smtpPassword: "",
      });
      if (configured) runSmtpVerification();

      const company = companyRes?.data?.status === 1 ? companyRes.data.data?.[0] : null;
      // Stored in KB on the company.
      const sizeInMb = company?.fileUploadSize ? Math.round(company.fileUploadSize / 1024) : DEFAULT_FILE_LIMIT_MB;
      fileForm.setFieldsValue({ maxFileLimit: String(sizeInMb) });
    } catch (e) {
      console.error("Failed to fetch settings data", e);
    } finally {
      setPageLoading(false);
    }
  }, [form, fileForm, runSmtpVerification]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePortChange = (port) => {
    if (port === 465 || port === 587) {
      form.setFieldsValue({ smtpSecure: true });
    }
  };

  const handleSubmit = async (values) => {
    setSaving(true);
    setError(null);
    try {
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.smtpConfig,
        body: {
          smtpHost: values.smtpHost,
          smtpPort: parseInt(values.smtpPort, 10),
          smtpEmail: values.smtpEmail,
          smtpPassword: values.smtpPassword || "",
          smtpSecure: Boolean(values.smtpSecure),
          fromName: values.fromName || "",
        },
      });

      if (res?.data?.status === 1) {
        message.success("SMTP configuration verified and saved successfully!");
        setCurrentConfig(res.data.data);
        form.setFieldsValue({ smtpPassword: "" });
        runSmtpVerification();
      } else {
        setError(res?.data?.message || "Failed to verify SMTP configuration.");
      }
    } catch (e) {
      setError(e?.response?.data?.message || "An error occurred while saving SMTP configuration.");
    } finally {
      setSaving(false);
    }
  };

  // TaskHub's server only sends through SMTP, so the Outlook actions are not
  // wired to a backend yet; say so instead of silently doing nothing.
  const handleOutlookUnavailable = () => {
    message.info("Outlook / Microsoft 365 sending is not available on the TaskHub server yet.");
  };

  const handleResetToDefault = () => {
    form.setFieldsValue({ ...GMAIL_DEFAULTS, fromName: "", smtpEmail: "", smtpPassword: "" });
  };

  const handleFileSubmit = async (values) => {
    setFileSaving(true);
    try {
      const res = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: Service.fileSizeUpload,
        body: { fileUploadSize: Math.round(parseFloat(values.maxFileLimit)) },
      });
      if (res?.data?.status === 1) {
        message.success("File upload limit updated successfully!");
      } else {
        message.error(res?.data?.message || "Failed to update file upload limit.");
      }
    } catch (e) {
      message.error(e?.response?.data?.message || "An error occurred while updating file upload limit.");
    } finally {
      setFileSaving(false);
    }
  };

  const handleFileReset = () => {
    fileForm.setFieldsValue({ maxFileLimit: String(DEFAULT_FILE_LIMIT_MB) });
  };

  if (pageLoading) return <SettingsSkeleton />;

  const emailTabContent = (
    <div className="settings-content">
      <div className="inout-header text-left">
        <h2>Email Configuration</h2>
      </div>

      {error && (
        <Alert
          type="error"
          showIcon
          message="SMTP configuration failed"
          description={error}
          closable
          closeIcon={<CloseOutlined />}
          onClose={() => setError(null)}
          style={{ marginBottom: 24 }}
        />
      )}


      {currentConfig && !error && smtpCheck.status === "checking" && (
        <Alert
          type="info"
          showIcon
          message="Checking SMTP connection…"
          description="Verifying the saved settings against the mail server."
          style={{ marginBottom: 24 }}
        />
      )}

      {currentConfig && !error && smtpCheck.status === "failed" && (
        <Alert
          type="error"
          showIcon
          message="SMTP connection not working"
          description={
            <>
              <div>{smtpCheck.reason}</div>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Outgoing email is currently failing. Correct the settings below and save to reconnect.
                </Text>
              </div>
            </>
          }
          action={<Button size="small" onClick={runSmtpVerification}>Retry</Button>}
          style={{ marginBottom: 24 }}
        />
      )}

      {currentConfig && !error && smtpCheck.status === "connected" && (
        <Alert
          type="success"
          showIcon
          icon={<CheckCircleFilled />}
          message={
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Text strong>SMTP Connection Active</Text>
              <span className="smtp-connected-badge">Connected</span>
            </div>
          }
          description={
            <Row gutter={[24, 0]} style={{ marginTop: 8 }}>
              <Col span={8}>
                <Text type="secondary" style={{ fontSize: 12 }}>Host</Text>
                <div><Text strong>{currentConfig.smtpHost}</Text></div>
              </Col>
              <Col span={8}>
                <Text type="secondary" style={{ fontSize: 12 }}>Port</Text>
                <div><Text strong>{currentConfig.smtpPort}</Text></div>
              </Col>
              <Col span={8}>
                <Text type="secondary" style={{ fontSize: 12 }}>From Email</Text>
                <div><Text strong>{currentConfig.smtpEmail}</Text></div>
              </Col>
            </Row>
          }
          closable
          closeIcon={<CloseOutlined />}
          style={{ marginBottom: 24 }}
        />
      )}

      <Card className="manual-config-section">
        <Title level={5} style={{ marginBottom: 8 }}>Manual SMTP Configuration</Title>
        <Text type="secondary" style={{ fontSize: 13, display: "block", marginBottom: 36 }}>
          Configure SMTP settings for Gmail, Outlook, custom mail servers, or any SMTP-compatible provider
        </Text>

        <Form form={form} layout="vertical" className="modal-form-col" onFinish={handleSubmit}>
          <Row gutter={[24]}>
            <Col xs={24} md={8}>
              <Form.Item label="SMTP Host" name="smtpHost" rules={[{ required: true, message: "SMTP host is required" }]}>
                <Input placeholder="smtp.gmail.com" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Port" name="smtpPort" rules={[{ required: true, message: "Port is required" }]}>
                <Input placeholder="465" onChange={(e) => handlePortChange(parseInt(e.target.value, 10))} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Security Protocol" name="smtpSecure" rules={[{ required: true, message: "Security setting is required" }]}>
                <Select>
                  <Option value={true}>SSL/TLS (Recommended)</Option>
                  <Option value={false}>STARTTLS / None</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[24]}>
            <Col xs={24} md={8}>
              <Form.Item label="From Name" name="fromName">
                <Input placeholder="SMTP Notifications" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Email Address" name="smtpEmail" rules={[{ required: true, message: "Email address is required" }]}>
                {/* An email + password pair reads as a login form to the browser,
                    which would autofill both with the user's own credentials. */}
                <Input placeholder="youremail@company.com" autoComplete="off" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="App Password"
                name="smtpPassword"
                // Required only until one is saved; blank keeps the saved password.
                rules={[{ required: !currentConfig?.smtpPasswordSet, message: "Password is required" }]}
                extra={
                  currentConfig?.smtpPasswordSet ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>Leave blank to keep the saved password.</Text>
                  ) : null
                }
              >
                <Password
                  placeholder={currentConfig?.smtpPasswordSet ? "Unchanged" : "••••••••••••••••"}
                  autoComplete="new-password"
                />
              </Form.Item>
            </Col>
          </Row>

          <Alert
            type="info"
            showIcon
            icon={<FaLightbulb />}
            message="Configuration Tips"
            description={
              <ul style={{ margin: "8px 0 0 0", paddingLeft: 20 }}>
                <li>For Gmail: use an App Password (not your regular password) and enable 2-Step Verification</li>
                <li>Gmail SMTP: host <code>smtp.gmail.com</code>, port <code>465</code> (SSL) or <code>587</code> (STARTTLS)</li>
                <li>Outlook / Microsoft 365 SMTP: host <code>smtp.office365.com</code>, port <code>587</code> (STARTTLS)</li>
                <li>Settings are verified against the server before saving</li>
              </ul>
            }
            style={{ marginBottom: 36 }}
          />

          <div style={{ display: "flex", gap: 12 }}>
            <Button className="btn-secondary" onClick={handleResetToDefault}>
              Reset to Default
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={saving}
              style={{ marginLeft: "auto" }}
            >
              {saving ? "Testing & Saving..." : "Test & Save Configuration"}
            </Button>
          </div>
        </Form>
      </Card>

      <Divider />

      <div className="inout-header text-left">
        <h2>File Upload Limits</h2>
      </div>
      <Card className="file-upload-section">
        <Form form={fileForm} layout="vertical" className="modal-form-col" onFinish={handleFileSubmit}>
          <Row gutter={[24]}>
            <Col xs={24} md={8}>
              <Form.Item
                label="Maximum File Size (MB)"
                name="maxFileLimit"
                rules={[
                  { required: true, message: "File size is required" },
                  { pattern: /^\d*\.?\d+$/, message: "Only numbers are allowed" },
                  {
                    validator: (_, value) => {
                      const size = parseFloat(value);
                      if (size < 1) return Promise.reject("File size must be at least 1 MB");
                      if (size > MAX_FILE_LIMIT_MB) return Promise.reject(`File size must not exceed ${MAX_FILE_LIMIT_MB} MB`);
                      return Promise.resolve();
                    },
                  },
                ]}
                extra="Maximum size per file"
              >
                <Input placeholder="35" suffix="MB" />
              </Form.Item>
            </Col>
          </Row>

          <Alert
            className="limit-alert"
            type="info"
            showIcon
            icon={<BsInfoCircleFill />}
            message="These limits apply across the system for all uploads."
            style={{ marginBottom: 36 }}
          />

          <div style={{ display: "flex", gap: 12 }}>
            <Button className="btn-secondary" onClick={handleFileReset}>
              Reset to Default
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={fileSaving}
              style={{ marginLeft: "auto" }}
            >
              Save File Settings
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );

  return (
    <div className="settings-module-redesign">
      <div className="settings-content">
      <div className="inout-header text-left">
        <h2>Email Configuration</h2>
      </div>

      {/* Provider selection, same card as HRMS. */}
      <Card className="setup-section" style={{ marginBottom: 24 }}>
        <Title level={5} style={{ marginBottom: 8 }}>Select Email Provider</Title>
        <Text type="secondary" style={{ fontSize: 13, display: "block", marginBottom: 16 }}>
          Choose how outgoing emails will be sent from this company
        </Text>
        <Space size={16} wrap>
          <Button
            type={activeEmailProvider === "smtp" ? "primary" : "default"}
            className="btn-secondary"
            icon={<GmailIcon />}
            onClick={() => setActiveEmailProvider("smtp")}
          >
            Google / Custom SMTP
          </Button>
          <Button
            type={activeEmailProvider === "outlook" ? "primary" : "default"}
            className="btn-secondary"
            icon={<OutLookIcon />}
            onClick={() => setActiveEmailProvider("outlook")}
          >
            Outlook / Microsoft 365
          </Button>
        </Space>
      </Card>

      {activeEmailProvider === "smtp" ? (
      <>
      {error && (
        <Alert
          type="error"
          showIcon
          message="SMTP configuration failed"
          description={error}
          closable
          closeIcon={<CloseOutlined />}
          onClose={() => setError(null)}
          style={{ marginBottom: 24 }}
        />
      )}


      {currentConfig && !error && smtpCheck.status === "checking" && (
        <Alert
          type="info"
          showIcon
          message="Checking SMTP connection…"
          description="Verifying the saved settings against the mail server."
          style={{ marginBottom: 24 }}
        />
      )}

      {currentConfig && !error && smtpCheck.status === "failed" && (
        <Alert
          type="error"
          showIcon
          message="SMTP connection not working"
          description={
            <>
              <div>{smtpCheck.reason}</div>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Outgoing email is currently failing. Correct the settings below and save to reconnect.
                </Text>
              </div>
            </>
          }
          action={<Button size="small" onClick={runSmtpVerification}>Retry</Button>}
          style={{ marginBottom: 24 }}
        />
      )}

      {currentConfig && !error && smtpCheck.status === "connected" && (
        <Alert
          type="success"
          showIcon
          icon={<CheckCircleFilled />}
          message={
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Text strong>SMTP Connection Active</Text>
              <span className="smtp-connected-badge">Connected</span>
            </div>
          }
          description={
            <Row gutter={[24, 0]} style={{ marginTop: 8 }}>
              <Col span={8}>
                <Text type="secondary" style={{ fontSize: 12 }}>Host</Text>
                <div><Text strong>{currentConfig.smtpHost}</Text></div>
              </Col>
              <Col span={8}>
                <Text type="secondary" style={{ fontSize: 12 }}>Port</Text>
                <div><Text strong>{currentConfig.smtpPort}</Text></div>
              </Col>
              <Col span={8}>
                <Text type="secondary" style={{ fontSize: 12 }}>From Email</Text>
                <div><Text strong>{currentConfig.smtpEmail}</Text></div>
              </Col>
            </Row>
          }
          closable
          closeIcon={<CloseOutlined />}
          style={{ marginBottom: 24 }}
        />
      )}

      <Card className="manual-config-section">
        <Title level={5} style={{ marginBottom: 8 }}>Manual SMTP Configuration</Title>
        <Text type="secondary" style={{ fontSize: 13, display: "block", marginBottom: 36 }}>
          Configure SMTP settings for Gmail, Outlook, custom mail servers, or any SMTP-compatible provider
        </Text>

        <Form form={form} layout="vertical" className="modal-form-col" onFinish={handleSubmit}>
          <Row gutter={[24]}>
            <Col xs={24} md={8}>
              <Form.Item label="SMTP Host" name="smtpHost" rules={[{ required: true, message: "SMTP host is required" }]}>
                <Input placeholder="smtp.gmail.com" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Port" name="smtpPort" rules={[{ required: true, message: "Port is required" }]}>
                <Input placeholder="465" onChange={(e) => handlePortChange(parseInt(e.target.value, 10))} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Security Protocol" name="smtpSecure" rules={[{ required: true, message: "Security setting is required" }]}>
                <Select>
                  <Option value={true}>SSL/TLS (Recommended)</Option>
                  <Option value={false}>STARTTLS / None</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[24]}>
            <Col xs={24} md={8}>
              <Form.Item label="From Name" name="fromName">
                <Input placeholder="SMTP Notifications" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Email Address" name="smtpEmail" rules={[{ required: true, message: "Email address is required" }]}>
                {/* An email + password pair reads as a login form to the browser,
                    which would autofill both with the user's own credentials. */}
                <Input placeholder="youremail@company.com" autoComplete="off" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="App Password"
                name="smtpPassword"
                // Required only until one is saved; blank keeps the saved password.
                rules={[{ required: !currentConfig?.smtpPasswordSet, message: "Password is required" }]}
                extra={
                  currentConfig?.smtpPasswordSet ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>Leave blank to keep the saved password.</Text>
                  ) : null
                }
              >
                <Password
                  placeholder={currentConfig?.smtpPasswordSet ? "Unchanged" : "••••••••••••••••"}
                  autoComplete="new-password"
                />
              </Form.Item>
            </Col>
          </Row>

          <Alert
            type="info"
            showIcon
            icon={<FaLightbulb />}
            message="Configuration Tips"
            description={
              <ul style={{ margin: "8px 0 0 0", paddingLeft: 20 }}>
                <li>For Gmail: use an App Password (not your regular password) and enable 2-Step Verification</li>
                <li>Gmail SMTP: host <code>smtp.gmail.com</code>, port <code>465</code> (SSL) or <code>587</code> (STARTTLS)</li>
                <li>Outlook / Microsoft 365 SMTP: host <code>smtp.office365.com</code>, port <code>587</code> (STARTTLS)</li>
                <li>Settings are verified against the server before saving</li>
              </ul>
            }
            style={{ marginBottom: 36 }}
          />

          <div style={{ display: "flex", gap: 12 }}>
            <Button className="btn-secondary" onClick={handleResetToDefault}>
              Reset to Default
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={saving}
              style={{ marginLeft: "auto" }}
            >
              {saving ? "Testing & Saving..." : "Test & Save Configuration"}
            </Button>
          </div>
        </Form>
      </Card>

      </>
      ) : (
      <>
        <Alert
          type="info"
          showIcon
          icon={<InfoCircleFilled />}
          message="Microsoft 365 not connected"
          description="Save your Azure app credentials below, then click 'Connect to Microsoft 365' to authorize."
          style={{ marginBottom: 24 }}
        />

        <Card className="setup-section" style={{ marginBottom: 24 }}>
          <Title level={5} style={{ marginBottom: 8 }}>Azure App Credentials</Title>
          <Text type="secondary" style={{ fontSize: 13, display: "block", marginBottom: 12 }}>
            Register an app in Microsoft Entra ID (Azure AD). The redirect URI must match exactly:{" "}
            <Text code style={{ fontSize: 12 }}>
              https://&lt;your-api-host&gt;/api/smtp_config/outlook/callback
            </Text>
          </Text>
          <Form form={outlookForm} layout="vertical" className="modal-form-col" onFinish={handleOutlookUnavailable}>
            <Row gutter={[24]}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Application (client) ID"
                  name="outlookClientId"
                  rules={[{ required: true, message: "Client ID is required" }]}
                >
                  <Input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Redirect URI"
                  name="outlookRedirectUri"
                  rules={[
                    { required: true, message: "Redirect URI is required" },
                    { type: "url", message: "Enter a valid URL" },
                  ]}
                >
                  <Input placeholder="https://api.yourcompany.com/api/smtp_config/outlook/callback" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={[24]}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Client Secret"
                  name="outlookClientSecret"
                  extra="From Certificates & secrets in Azure."
                  rules={[{ required: true, message: "Client secret is required" }]}
                >
                  <Password placeholder="••••••••••••••••" autoComplete="new-password" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="Display Name (From Name)" name="outlookFromName">
                  <Input placeholder="Company Notifications" />
                </Form.Item>
              </Col>
            </Row>
            <Button type="default" htmlType="submit" icon={<SaveOutlined />}>
              Save App Credentials
            </Button>
          </Form>
        </Card>

        <Card className="manual-config-section">
          <Title level={5} style={{ marginBottom: 8 }}>Connect to Microsoft 365</Title>
          <Text type="secondary" style={{ fontSize: 13, display: "block", marginBottom: 16 }}>
            After saving your app credentials above, click below to sign in to your Microsoft account and authorize email sending.
          </Text>
          <Alert
            type="warning"
            showIcon
            message="Save your Application (client) ID, Redirect URI, and Client Secret above before connecting."
            style={{ marginBottom: 16 }}
          />
          <Button type="primary" icon={<OutLookIcon />} disabled>
            Connect to Microsoft 365
          </Button>
          <Alert
            type="info"
            showIcon
            icon={<FaLightbulb />}
            message="How Outlook / Microsoft 365 sending works"
            description={
              <ul style={{ margin: "8px 0 0 0", paddingLeft: 20 }}>
                <li>Emails are sent via Microsoft Graph API (not SMTP) - no SMTP credentials needed</li>
                <li>The connected mailbox is used as the sender address automatically</li>
                <li>Tokens are refreshed automatically; re-connect if you change your Azure app settings</li>
                <li>Required Azure API permissions: <code>Mail.Send</code>, <code>User.Read</code>, <code>offline_access</code></li>
              </ul>
            }
            style={{ marginTop: 16 }}
          />
        </Card>
      </>
      )}

      <Divider />

      <div className="inout-header text-left">
        <h2>File Upload Limits</h2>
      </div>
      <Card className="file-upload-section">
        <Form form={fileForm} layout="vertical" className="modal-form-col" onFinish={handleFileSubmit}>
          <Row gutter={[24]}>
            <Col xs={24} md={8}>
              <Form.Item
                label="Maximum File Size (MB)"
                name="maxFileLimit"
                rules={[
                  { required: true, message: "File size is required" },
                  { pattern: /^\d*\.?\d+$/, message: "Only numbers are allowed" },
                  {
                    validator: (_, value) => {
                      const size = parseFloat(value);
                      if (size < 1) return Promise.reject("File size must be at least 1 MB");
                      if (size > MAX_FILE_LIMIT_MB) return Promise.reject(`File size must not exceed ${MAX_FILE_LIMIT_MB} MB`);
                      return Promise.resolve();
                    },
                  },
                ]}
                extra="Maximum size per file"
              >
                <Input placeholder="35" suffix="MB" />
              </Form.Item>
            </Col>
          </Row>

          <Alert
            className="limit-alert"
            type="info"
            showIcon
            icon={<BsInfoCircleFill />}
            message="These limits apply across the system for all uploads."
            style={{ marginBottom: 36 }}
          />

          <div style={{ display: "flex", gap: 12 }}>
            <Button className="btn-secondary" onClick={handleFileReset}>
              Reset to Default
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={fileSaving}
              style={{ marginLeft: "auto" }}
            >
              Save File Settings
            </Button>
          </div>
        </Form>
      </Card>
    </div>
      {/* <Tabs
        defaultActiveKey="email"
        items={[{ key: "email", label: "Email Configuration", children: emailTabContent }]}
      /> */}
    </div>
  );
};

export default SettingsModule;
