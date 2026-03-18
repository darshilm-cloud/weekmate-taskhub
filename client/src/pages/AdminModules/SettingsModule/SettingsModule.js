import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Alert,
  Space,
  Typography,
  message,
  Spin,
  Tabs,
  Row,
  Col,
  Tag,
  Tooltip,
  Badge,
} from "antd";
import {
  MailOutlined,
  SaveOutlined,
  CheckCircleOutlined,
  FileOutlined,
  EditOutlined,
  SecurityScanOutlined,
  CloudServerOutlined,
  InfoCircleOutlined,
  SettingOutlined,
  LockOutlined,
} from "@ant-design/icons";
import Service from "../../../service";
import { SettingsSkeleton } from "../../../components/common/SkeletonLoader";
import "./SettingsModule.scss";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Password } = Input;
const { TabPane } = Tabs;

// Quick setup providers
const PROVIDERS = {
  gmail: {
    name: "Gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    color: "gmail",
    description: "Google Gmail SMTP",
  },
};

const SMTPConfig = () => {
  // Get user data once and memoize
  const userData = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user_data")) || {};
    } catch {
      return {};
    }
  }, []);

  const [form] = Form.useForm();
  const [fileForm] = Form.useForm();

  // State management
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [currentConfig, setCurrentConfig] = useState(null);
  const [error, setError] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);

  // Calculate file limit once
  const fileLimit = useMemo(() => {
    const size = Number(userData?.companyDetails?.fileUploadSize);
    if (!size) return null;
    return size > 80 ? (size / 1024).toFixed(0) : size.toFixed(0);
  }, [userData?.companyDetails?.fileUploadSize]);

  useEffect(() => {
    fileForm.setFieldsValue({ maxFileLimit: fileLimit });
  }, [fileForm, fileLimit]);

  // Fetch existing config
  const fetchConfig = useCallback(async () => {
    try {
      setFetchLoading(true);
      setError(null);

      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.smtpGetConfig,
      });

      if (response.data.statusCode === 200) {
        const config = response.data.data;
        setCurrentConfig(config);

        // Set form values
        form.setFieldsValue({
          smtpHost: config.smtpHost,
          smtpPort: config.smtpPort.toString(),
          smtpEmail: config.smtpEmail,
          smtpSecure: config.smtpSecure,
          fromName: config.fromName,
        });

        const matchedProvider = Object.entries(PROVIDERS).find(
          ([, provider]) =>
            provider.host === config.smtpHost &&
            String(provider.port) === String(config.smtpPort)
        );
        setSelectedProvider(matchedProvider?.[0] || null);
      } else {
        // Auto-select Gmail as default if no config exists
        handleProviderSelect("gmail");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to fetch configuration");
      // Fallback to Gmail
      handleProviderSelect("gmail");
    } finally {
      setFetchLoading(false);
    }
  }, [form]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Handle provider selection
  const handleProviderSelect = useCallback(
    (key) => {
      const provider = PROVIDERS[key];
      if (provider) {
        setSelectedProvider(key);
        form.setFieldsValue({
          smtpHost: provider.host,
          smtpPort: provider.port.toString(),
          smtpSecure: provider.secure,
        });
      }
    },
    [form]
  );

  // Handle port change
  const handlePortChange = useCallback(
    (port) => {
      const portNum = parseInt(port);
      if (portNum === 465 || portNum === 587) {
        form.setFieldsValue({ smtpSecure: true });
      }
    },
    [form]
  );

  // Handle SMTP form submit
  const handleSubmit = useCallback(
    async (values) => {
      try {
        setLoading(true);
        setError(null);

        const response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.smtpConfig,
          body: {
            smtpHost: values.smtpHost,
            smtpPort: parseInt(values.smtpPort),
            smtpEmail: values.smtpEmail,
            smtpPassword: values.smtpPassword,
            smtpSecure: values.smtpSecure,
            fromName: values.fromName,
          },
        });

        if (response.data.status == 1) {
          message.success(response.data.message);
          setCurrentConfig(response.data.data);
          await fetchConfig();
        } else {
          setError(response.data.message || "Configuration failed");
        }
      } catch (err) {
        const errorMsg =
          err.response?.data?.message || "Failed to save configuration";
        setError(errorMsg);
        message.error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [fetchConfig]
  );

  // Handle file upload limit
  const handleFileSubmit = useCallback(async ({ maxFileLimit }) => {
    setFileLoading(true);
    try {
      const normalizedLimit = Number(maxFileLimit);
      const res = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: Service.fileSizeUpload,
        body: { fileUploadSize: normalizedLimit },
      });

      if (res?.data?.status === 1) {
        const successMessage =
          res?.data?.message || "File size limit updated successfully";

        // Update localStorage
        const currentUserData =
          JSON.parse(localStorage.getItem("user_data")) || {};
        const newUserData = {
          ...currentUserData,
          companyDetails: {
            ...currentUserData.companyDetails,
            fileUploadSize: normalizedLimit * 1024,
          },
        };
        localStorage.setItem("user_data", JSON.stringify(newUserData));

        message.success(successMessage);
        setIsEditing(false);
        return true;
      } else {
        throw new Error(
          res?.data?.message || "Failed to update file size limit"
        );
      }
    } catch (err) {
      console.error("File size update failed:", err);
      message.error(err?.message || "Failed to update file size limit");
      return false;
    } finally {
      setFileLoading(false);
    }
  }, []);

  const handleFileFormFinish = useCallback(
    async (values) => {
      await handleFileSubmit(values);
    },
    [handleFileSubmit]
  );

  // Loading state
  if (fetchLoading) return <SettingsSkeleton />;

  return (
    <div className="smtp-config">
      <div className="header-section">
        <Title level={2} className="main-title">
          <SettingOutlined className="title-icon" />
          System Settings
        </Title>
      </div>

      <Card className="main-card">
        <Tabs defaultActiveKey="1" size="large" className="main-tabs">
          <TabPane
            tab={
              <Space size="middle">
                <Badge
                  dot={!!currentConfig}
                  status={currentConfig ? "success" : "default"}
                >
                  <MailOutlined className="tab-icon" />
                </Badge>
                <span className="tab-label">SMTP Configuration</span>
              </Space>
            }
            key="1"
          >
            <div className="smtp-content">
              {/* Current Configuration Status */}
              {currentConfig && (
                <Alert
                  type="success"
                  showIcon
                  icon={<CheckCircleOutlined />}
                  message={
                    <Space>
                      <Text strong>SMTP Configuration Active</Text>
                      <Tag color="success">Connected</Tag>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size="small">
                      <Text>
                        <strong>Host:</strong> {currentConfig.smtpHost}:
                        {currentConfig.smtpPort}
                      </Text>
                      <Text>
                        <strong>Security:</strong>
                        <Tag
                          color={currentConfig.smtpSecure ? "green" : "orange"}
                          className="security-tag"
                        >
                          {currentConfig.smtpSecure
                            ? "SSL/TLS Enabled"
                            : "Insecure"}
                        </Tag>
                      </Text>
                      <Text>
                        <strong>From:</strong> {currentConfig.fromName} (
                        {currentConfig.smtpEmail})
                      </Text>
                    </Space>
                  }
                  className="config-alert"
                />
              )}

              {/* Error Alert */}
              {error && (
                <Alert
                  type="error"
                  showIcon
                  message="Configuration Error"
                  description={error}
                  closable
                  onClose={() => setError(null)}
                  className="error-alert"
                />
              )}

              {/* Configuration Form */}
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                size="large"
                className="smtp-form"
              >
                <div className="settings-form-flow">
                  <div className="settings-form-section">
                    <div className="section-heading">
                      <span className="section-step">1</span>
                      <div>
                        <Title level={5}>Connection Details</Title>
                        <Text>Set the outgoing mail server and protocol values.</Text>
                      </div>
                    </div>

                    <Row gutter={24}>
                      <Col xs={24} md={12}>
                        <Form.Item
                          label={
                            <Space>
                              <CloudServerOutlined />
                              <span>SMTP Host</span>
                            </Space>
                          }
                          name="smtpHost"
                          rules={[
                            { required: true, message: "SMTP host is required" },
                          ]}
                        >
                          <Input
                            placeholder="smtp.gmail.com"
                            className="form-input"
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          label={
                            <Space>
                              <span>Port</span>
                              <Tooltip title="Common ports: 465 (SSL), 587 (TLS), 25 (Unsecured)">
                                <InfoCircleOutlined className="info-icon" />
                              </Tooltip>
                            </Space>
                          }
                          name="smtpPort"
                          rules={[{ required: true, message: "Port is required" }]}
                        >
                          <Select
                            placeholder="Select port"
                            onChange={handlePortChange}
                            className="form-select"
                          >
                            <Option value="465">
                              <Space>
                                <LockOutlined className="ssl-icon" />
                                465 (SSL - Gmail/Yahoo)
                              </Space>
                            </Option>
                            <Option value="587">
                              <Space>
                                <SecurityScanOutlined className="tls-icon" />
                                587 (TLS - Outlook)
                              </Space>
                            </Option>
                            <Option value="25">
                              <Space>
                                <span className="warning-icon">⚠️</span>
                                25 (Unsecured)
                              </Space>
                            </Option>
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={24}>
                      <Col xs={24} md={12}>
                        <Form.Item
                          label={
                            <Space>
                              <SecurityScanOutlined />
                              <span>Security Protocol</span>
                            </Space>
                          }
                          name="smtpSecure"
                          rules={[
                            {
                              required: true,
                              message: "Security setting is required",
                            },
                          ]}
                        >
                          <Select
                            placeholder="Select security protocol"
                            className="form-select"
                          >
                            <Option value={true}>
                              <Space>
                                <LockOutlined className="ssl-icon" />
                                SSL/TLS (Recommended)
                              </Space>
                            </Option>
                            <Option value={false}>
                              <Space>
                                <span className="warning-icon">⚠️</span>
                                None (Not Recommended)
                              </Space>
                            </Option>
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>

                  <div className="settings-form-section">
                    <div className="section-heading">
                      <span className="section-step">2</span>
                      <div>
                        <Title level={5}>Sender Identity</Title>
                        <Text>Enter the display name and mailbox credentials used to send emails.</Text>
                      </div>
                    </div>

                    <Row gutter={24}>
                      <Col xs={24} md={12}>
                        <Form.Item
                          label="From Name (Display Name)"
                          name="fromName"
                          rules={[
                            { required: true, message: "From name is required" },
                          ]}
                        >
                          <Input
                            placeholder="Your Company Name"
                            className="form-input"
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item
                          label={
                            <Space>
                              <MailOutlined />
                              <span>Email Address</span>
                            </Space>
                          }
                          name="smtpEmail"
                          rules={[
                            { required: true, message: "Email is required" },
                            { type: "email", message: "Invalid email format" },
                          ]}
                        >
                          <Input
                            placeholder="your-email@gmail.com"
                            className="form-input"
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={24}>
                      <Col xs={24} md={12}>
                        <Form.Item
                          label={
                            <Space>
                              <LockOutlined />
                              <span>Password</span>
                              <Tooltip title="Use App Password for Gmail/Yahoo">
                                <InfoCircleOutlined className="info-icon" />
                              </Tooltip>
                            </Space>
                          }
                          name="smtpPassword"
                          rules={[
                            { required: true, message: "Password is required" },
                          ]}
                        >
                          <Password
                            placeholder="App password or account password"
                            className="form-input"
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>

                  <Form.Item className="submit-section">
                    <div className="submit-panel">
                      <div className="submit-copy">
                        <Text strong>Save after verifying the SMTP values.</Text>
                        <Text type="secondary">
                          We will test the configuration before storing it.
                        </Text>
                      </div>
                      <Button
                        type="primary"
                        htmlType="submit"
                        icon={<SaveOutlined />}
                        loading={loading}
                        size="large"
                        className="submit-btn"
                      >
                        {loading
                          ? "Verifying Configuration..."
                          : "Test & Save Configuration"}
                      </Button>
                    </div>
                  </Form.Item>
                </div>
              </Form>
            </div>
          </TabPane>

          <TabPane
            tab={
              <Space size="middle">
                <FileOutlined className="tab-icon" />
                <span className="tab-label">File Upload Limits</span>
              </Space>
            }
            key="2"
          >
            <div className="file-content">
              <Card className="file-form-card">
                <Form
                  form={fileForm}
                  layout="vertical"
                  onFinish={handleFileFormFinish}
                  initialValues={{ maxFileLimit: fileLimit }}
                  size="large"
                  className="file-form"
                >
                  <div className="settings-form-section compact">
                    <div className="section-heading">
                      <span className="section-step">1</span>
                      <div>
                        <Title level={5}>Upload Limit</Title>
                        <Text>Define the maximum single-file size allowed across chat uploads.</Text>
                      </div>
                    </div>

                    <Form.Item
                      label={
                        <Space>
                          <FileOutlined />
                          <span>Maximum File Size (MB)</span>
                        </Space>
                      }
                      name="maxFileLimit"
                      rules={[
                        { required: true, message: "File size is required" },
                        {
                          pattern: /^\d*\.?\d+$/,
                          message: "Only numbers are allowed",
                        },
                        {
                          validator: (_, value) => {
                            if (!value) return Promise.resolve();
                            if (parseFloat(value) <= 0) {
                              return Promise.reject(
                                "File size must be greater than 0"
                              );
                            }
                            return Promise.resolve();
                          },
                        },
                        {
                          validator: (_, value) => {
                            if (parseFloat(value) > 80) {
                              return Promise.reject(
                                "File size must not exceed 80 MB"
                              );
                            }
                            return Promise.resolve();
                          },
                        },
                      ]}
                    >
                      <Input
                        disabled={!isEditing}
                        placeholder="Enter maximum file size in MB"
                        className="file-input"
                        suffix="MB"
                      />
                    </Form.Item>

                    <Form.Item>
                      {isEditing ? (
                        <Space className="file-actions">
                          <Button
                            type="primary"
                            htmlType="submit"
                            icon={<SaveOutlined />}
                            loading={fileLoading}
                            className="save-btn"
                          >
                            Save Changes
                          </Button>
                          <Button
                            onClick={() => {
                              fileForm.setFieldsValue({
                                maxFileLimit: fileLimit,
                              });
                              setIsEditing(false);
                            }}
                            className="delete-btn"
                          >
                            Cancel
                          </Button>
                        </Space>
                      ) : (
                        <Button
                          type="primary"
                          icon={<EditOutlined />}
                          onClick={() => setIsEditing(true)}
                          className="edit-btn"
                        >
                          Edit File Limit
                        </Button>
                      )}
                    </Form.Item>
                  </div>
                </Form>
              </Card>

              <Alert
                type="info"
                showIcon
                message="File Upload Guidelines"
                description={
                  <div>
                    <Paragraph className="guideline-item">
                      <strong>Current Limit:</strong> {fileLimit || "Not Set"}{" "}
                      MB
                    </Paragraph>
                    <Paragraph className="guideline-item">
                      <strong>Maximum Allowed:</strong> 80 MB per file
                    </Paragraph>
                    <Paragraph className="guideline-description">
                      This setting controls the maximum file size that users can
                      upload in chat conversations. Choose a balance between
                      functionality and server performance.
                    </Paragraph>
                  </div>
                }
                className="file-guidelines"
              />
            </div>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default SMTPConfig;
