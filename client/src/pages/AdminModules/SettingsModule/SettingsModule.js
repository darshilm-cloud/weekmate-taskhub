import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Card,
  Button,
  Row,
  Col,
  Typography,
  Input,
  Select,
  Alert,
  message,
  Space,
  Tooltip,
} from "antd";
import {
  MailOutlined,
  GlobalOutlined,
  LockOutlined,
  UserOutlined,
  SaveOutlined,
  BulbOutlined,
  SyncOutlined,
  InfoCircleOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
} from "@ant-design/icons";
import Service from "../../../service";
import { SettingsSkeleton } from "../../../components/common/SkeletonLoader";
import "./SettingsModule.scss";

const { Title, Text } = Typography;
const { Option } = Select;

const SettingsModule = () => {
  const [loading, setLoading] = useState(true);
  const [savingLoading, setSavingLoading] = useState(false);
  const [fileSizeLoading, setFileSizeLoading] = useState(false);
  const [company, setCompany] = useState(null);

  // SMTP States
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [smtpSecure, setSmtpSecure] = useState("SSL/TLS");
  const [fromName, setFromName] = useState("");
  const [smtpEmail, setSmtpEmail] = useState("");
  const [appPassword, setAppPassword] = useState("");

  // File Upload States
  const [maxFileSize, setMaxFileSize] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch SMTP Config
      const smtpRes = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.smtpGetConfig,
      });

      if (smtpRes?.data?.status === 1) {
        const config = smtpRes.data.data;
        setSmtpHost(config.smtpHost || "");
        setSmtpPort(config.smtpPort?.toString() || "");
        setSmtpSecure(config.smtpSecure ? "SSL/TLS" : "STARTTLS");
        setFromName(config.fromName || "");
        setSmtpEmail(config.smtpEmail || "");
        setAppPassword(config.smtpPassword || "");
      }

      // Fetch Company Details for File Upload Limit
      const companyRes = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getCompanyList,
        body: { page: 1, limit: 1 },
      });

      if (companyRes?.data?.status === 1) {
        const comp = companyRes.data.data?.[0];
        setCompany(comp);
        // Convert KB to MB if stored in KB
        const sizeInMb = comp?.fileUploadSize ? Math.round(comp.fileUploadSize / 1024) : 1;
        setMaxFileSize(sizeInMb);
      }
    } catch (error) {
      console.error("Failed to fetch settings data", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleQuickSetup = (provider) => {
    if (provider === "gmail") {
      setSmtpHost("smtp.gmail.com");
      setSmtpPort("465");
      setSmtpSecure("SSL/TLS");
      message.info("Gmail SMTP settings pre-filled. Please enter your App Password.");
    } else if (provider === "outlook") {
      setSmtpHost("smtp.office365.com");
      setSmtpPort("587");
      setSmtpSecure("STARTTLS");
      message.info("Outlook SMTP settings pre-filled. Please enter your App Password.");
    }
  };

  const handleTestAndSave = async () => {
    if (!smtpHost || !smtpPort || !smtpEmail || !appPassword) {
      message.warning("Please fill in all required SMTP fields.");
      return;
    }

    setSavingLoading(true);
    try {
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.smtpConfig,
        body: {
          smtpHost,
          smtpPort: parseInt(smtpPort),
          smtpEmail,
          smtpPassword: appPassword,
          smtpSecure: smtpSecure === "SSL/TLS",
          fromName,
        },
      });

      if (res?.data?.status === 1) {
        message.success("SMTP configuration verified and saved successfully!");
      } else {
        message.error(res?.data?.message || "Failed to verify SMTP configuration.");
      }
    } catch (error) {
      message.error("An error occurred while saving SMTP configuration.");
    } finally {
      setSavingLoading(false);
    }
  };

  const handleSaveFileSize = async () => {
    setFileSizeLoading(true);
    try {
      const res = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: Service.fileSizeUpload,
        body: {
          fileUploadSize: parseInt(maxFileSize),
        },
      });

      if (res?.data?.status === 1) {
        message.success("File upload limit updated successfully!");
      } else {
        message.error(res?.data?.message || "Failed to update file upload limit.");
      }
    } catch (error) {
      message.error("An error occurred while updating file upload limit.");
    } finally {
      setFileSizeLoading(false);
    }
  };

  if (loading) return <SettingsSkeleton />;

  return (
    <div className="settings-overview">
      <div className="settings-overview-shell">
        <Typography.Title level={4} className="section-main-title smtp-section-title">
          SMTP Configuration
        </Typography.Title>

        <Card className="settings-card smtp-config-card" bordered={false}>
          <div className="smtp-section-container">
            <div className="quick-setup-section">
              <div className="quick-setup-text">
                <Title level={5}>Quick Setup</Title>
                <Text type="secondary">Choose a provider to auto-configure SMTP settings</Text>
              </div>
              <Space size={16} className="provider-buttons">
                <Button
                type="primary"
                  className="add-btn"
                  icon={<img src="/assets/images/google-icon.png" alt="" style={{ width: 14, marginRight: 6 }} onError={(e) => e.target.style.display='none'} />}
                  onClick={() => handleQuickSetup("gmail")}
                >
                  Gmail
                </Button>
                <Button
                  className="provider-btn outlook-btn"
                  icon={<img src="/assets/images/outlook-icon.png" alt="" style={{ width: 14, marginRight: 6 }} onError={(e) => e.target.style.display='none'} />}
                  onClick={() => handleQuickSetup("outlook")}
                >
                  Outlook
                </Button>
              </Space>
            </div>

            <div className="manual-config-section">
              <div className="section-header">
                <Title level={5}>Manual Configuration</Title>
                <Text type="secondary">Configure your SMTP settings manually for custom email providers</Text>
              </div>

              <Row gutter={[24, 20]} className="form-grid">
                <Col xs={24} md={8}>
                  <div className="input-group">
                    <label className="required-label">SMTP Host</label>
                    <Input
                      placeholder="smtp.gmail.com"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      prefix={<GlobalOutlined style={{ color: '#bfbfbf', fontSize: '14px' }} />}
                      styles={{ input: { background: 'transparent', backgroundColor: 'transparent' } }}
                    />
                  </div>
                </Col>
                <Col xs={24} md={8}>
                  <div className="input-group">
                    <label className="required-label">Port</label>
                    <Input
                      placeholder="465"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(e.target.value)}
                      prefix={<LockOutlined style={{ color: '#bfbfbf', fontSize: '14px' }} />}
                      styles={{ input: { background: 'transparent', backgroundColor: 'transparent' } }}
                    />
                  </div>
                </Col>
                <Col xs={24} md={8}>
                  <div className="input-group">
                    <label className="required-label">Security Protocol</label>
                    <Select
                      value={smtpSecure}
                      onChange={(value) => setSmtpSecure(value)}
                      style={{ width: "100%" }}
                    >
                      <Option value="SSL/TLS">SSL/TLS (Recommended)</Option>
                      <Option value="STARTTLS">STARTTLS</Option>
                    </Select>
                  </div>
                </Col>
                <Col xs={24} md={8}>
                  <div className="input-group">
                    <label className="required-label">From Name</label>
                    <Input
                      placeholder="Your Company Name"
                      value={fromName}
                      onChange={(e) => setFromName(e.target.value)}
                      prefix={<UserOutlined style={{ color: '#bfbfbf', fontSize: '14px' }} />}
                      styles={{ input: { background: 'transparent', backgroundColor: 'transparent' } }}
                    />
                  </div>
                </Col>
                <Col xs={24} md={8}>
                  <div className="input-group">
                    <label className="required-label">Email Address</label>
                    <Input
                      placeholder="demo@weekmate.com"
                      value={smtpEmail}
                      onChange={(e) => setSmtpEmail(e.target.value)}
                      prefix={<MailOutlined style={{ color: '#bfbfbf', fontSize: '14px' }} />}
                      styles={{ input: { background: 'transparent', backgroundColor: 'transparent' } }}
                    />
                  </div>
                </Col>
                <Col xs={24} md={8}>
                  <div className="input-group">
                    <label className="required-label">App Password</label>
                    <Input.Password
                      placeholder="••••••••••••"
                      value={appPassword}
                      onChange={(e) => setAppPassword(e.target.value)}
                      prefix={<LockOutlined style={{ color: '#bfbfbf', fontSize: '14px' }} />}
                      iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                      styles={{ input: { background: 'transparent', backgroundColor: 'transparent' } }}
                    />
                  </div>
                </Col>
              </Row>

              <Alert
                className="config-tips-alert"
                message={
                  <div className="alert-content">
                    <div className="alert-title">
                      <BulbOutlined className="bulb-icon" />
                      <span>Configuration Tips</span>
                    </div>
                    <ul>
                      <li>Ensure your email provider allows SMTP access</li>
                      <li>For Gmail/Yahoo, use an App Password (not your regular password)</li>
                      <li>Test the connection before saving to verify settings</li>
                    </ul>
                  </div>
                }
                type="info"
              />

              <div className="card-actions">
                <div className="left-actions">
                  <Button className="delete-btn" onClick={() => fetchData()}>Reset to Default</Button>
                  <Button className="delete-btn">Cancel</Button>
                </div>
                <Button
                  type="primary"
                  className="add-btn"
                  icon={<SyncOutlined spin={savingLoading} style={{ fontSize: '14px' }} />}
                  onClick={handleTestAndSave}
                  loading={savingLoading}
                >
                  Test & Save Configuration
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Typography.Title level={4} className="section-main-title mt-40">
          File Upload Limits
        </Typography.Title>

        <Card className="settings-card file-limit-card" bordered={false}>
          <Row gutter={[24, 24]} align="bottom">
            <Col xs={24} md={18}>
              <div className="input-group">
                <label className="required-label">Maximum File Size (MB)</label>
                <div className="input-with-suffix">
                  <Input
                    type="number"
                    value={maxFileSize}
                    onChange={(e) => setMaxFileSize(e.target.value)}
                    suffix={<span className="suffix-text">MB</span>}
                  />
                </div>
              </div>
            </Col>
            <Col xs={24} md={6}>
              <Button
                type="primary"
                className="add-btn"
                icon={<SaveOutlined />}
                onClick={handleSaveFileSize}
                loading={fileSizeLoading}
                block
              >
                Save Limits
              </Button>
            </Col>
          </Row>
        </Card>
      </div>
    </div>
  );
};

export default SettingsModule;
