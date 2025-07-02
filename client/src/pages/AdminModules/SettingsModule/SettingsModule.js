import React, { useState, useEffect } from "react";
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
  InputNumber,
  Row,
  Col,
  Divider,
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

import "./SettingsModule.scss";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Password } = Input;
const { TabPane } = Tabs;

// Quick setup providers with enhanced info
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
  const [UserData, setUserdata] = useState(
    JSON.parse(localStorage.getItem("userData")) || null
  );

  const [form] = Form.useForm();
  const [fileForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [currentConfig, setCurrentConfig] = useState(null);
  const [error, setError] = useState(null);

  const [fileLimit, setFileLimit] = useState(() => {
    const size = Number(UserData?.fileUploadSize);
    if (!size) return null;
    return size > 80 ? (size / 1024).toFixed(0) : size.toFixed(0);
  });

  const [fileLoading, setFileLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);

  // Fetch existing config
  const fetchConfig = async () => {
    try {
      setFetchLoading(true);
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: Service.smtpGetConfig,
      });

      if (response.data.statusCode == 200) {
        setCurrentConfig(response.data.data);
        form.setFieldsValue({
          smtpHost: response.data.data.smtpHost,
          smtpPort: response.data.data.smtpPort.toString(),
          smtpEmail: response.data.data.smtpEmail,
          smtpSecure: response.data.data.smtpSecure,
          fromName: response.data.data.fromName,
        });
      }
    } catch (err) {
      console.error("Fetch error:", err);
      handleProviderSelect("gmail");
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  // Handle provider selection
  const handleProviderSelect = (key) => {
    const provider = PROVIDERS[key];
    if (provider) {
      setSelectedProvider(key);
      form.setFieldsValue({
        smtpHost: provider.host,
        smtpPort: provider.port,
        smtpSecure: provider.secure,
      });
      message.success(`${provider.name} settings applied`);
    }
  };

  // Handle port change
  const handlePortChange = (port) => {
    if (port === 465) {
      form.setFieldsValue({ smtpSecure: true });
    } else if (port === 587) {
      form.setFieldsValue({ smtpSecure: true });
    }
  };

  // Handle form submit
  const handleSubmit = async (values) => {
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

      if (response.data.success) {
        message.success(response.data.message);
        setCurrentConfig(response.data.data);
        fetchConfig();
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError(err.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSubmit = async ({ maxFileLimit }) => {
    setFileLoading(true);
    try {
      const res = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: Service.fileSizeUpload,
        body: { fileUploadSize: maxFileLimit },
      });

      if (res.statusCode === 200) {
        message.success(res.message);

        const updatedCompany = res.data?.updatedCompany;
        if (!updatedCompany) {
          throw new Error("No updatedCompany in response");
        }

        const fileSizeInMB = updatedCompany.fileUploadSize / 1024;
        console.log("File size in MB:", fileSizeInMB);

        const userData = JSON.parse(localStorage.getItem("userData")) || {};
        const newUserData = { ...userData, fileUploadSize: fileSizeInMB };
        localStorage.setItem("userData", JSON.stringify(newUserData));

        setFileLimit(updatedCompany.fileUploadSize);
      } else {
        message.error("Unexpected status code: " + res.statusCode);
      }
    } catch (err) {
      console.error("File size update failed:", err);
      message.error("Failed to update file size");
    } finally {
      setFileLoading(false);
    }
  };

  const handleFinish = (values) => {
    handleFileSubmit(values);
    setIsEditing(false);
  };
  // useEffect(()=>{
  //   setUserdata(JSON.parse(localStorage.getItem("userData"))||null)
  //   setFileLimit( UserData?.fileUploadSize ? (UserData.fileUploadSize / 1024).toFixed(0) : null)
  // },[])
  console.log(UserData?.fileUploadSize, "UserData?.fileUploadSize", fileLimit);

  if (fetchLoading) {
    return (
      <div className="smtp-config">
        <Card className="loading-card">
          <div className="loading-content">
            <Spin size="large" />
            <Title level={4} className="loading-title">
              Loading Configuration...
            </Title>
            <Text type="secondary">
              Please wait while we fetch your settings
            </Text>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="smtp-config">
      <div className="header-section">
        <Title level={2} className="main-title">
          <SettingOutlined className="title-icon" />
          System Settings
        </Title>
        <Text type="secondary" className="subtitle">
          Configure your email and file sharing settings
        </Text>
      </div>

      <Card className="main-card">
        <Tabs defaultActiveKey="1" size="large" className="main-tabs">
          <TabPane
            tab={
              <Space size="middle">
                <Badge
                  dot={currentConfig ? true : false}
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
              {/* Quick Setup Section */}
              <Card className="quick-setup-card">
                <div className="quick-setup-content">
                  <Title level={4} className="quick-setup-title">
                    <CloudServerOutlined className="section-icon" />
                    Quick Setup
                  </Title>
                  <Text className="quick-setup-description">
                    Choose a provider to auto-configure SMTP settings
                  </Text>
                  <Row gutter={[12, 12]} className="provider-buttons">
                    {Object.entries(PROVIDERS).map(([key, provider]) => (
                      <Col key={key}>
                        <Button
                          type={
                            selectedProvider === key ? "primary" : "default"
                          }
                          size="large"
                          onClick={() => handleProviderSelect(key)}
                          className={`provider-btn ${
                            selectedProvider === key ? "selected" : ""
                          } ${provider.color}`}
                        >
                          {provider.name}
                        </Button>
                      </Col>
                    ))}
                  </Row>
                </div>
              </Card>

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
                      disabled={true}
                    >
                      <Input
                        placeholder="smtp.gmail.com"
                        className="form-input"
                        disabled={true}
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
                        disabled={true}
                      >
                        <Option value={465}>
                          <Space>
                            <LockOutlined className="ssl-icon" />
                            465 (SSL - Gmail/Yahoo)
                          </Space>
                        </Option>
                        <Option value={587}>
                          <Space>
                            <SecurityScanOutlined className="tls-icon" />
                            587 (TLS - Outlook)
                          </Space>
                        </Option>
                        <Option value={25}>
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
                        disabled={true}
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
                </Row>

                <Row gutter={24}>
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

                <Form.Item className="submit-section">
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SaveOutlined />}
                    loading={loading}
                    size="large"
                    block
                    className="ant-btn-primary"
                  >
                    {loading
                      ? "Verifying Configuration..."
                      : "Test & Save Configuration"}
                  </Button>
                </Form.Item>
              </Form>

              {/* Help Guide */}
              {/* <Card className="help-guide">
                <Title level={5} className="guide-title">
                  💡 Configuration Guide
                </Title>
                <Row gutter={[16, 16]}>
                  {Object.entries(PROVIDERS).map(([key, provider]) => (
                    <Col xs={24} md={8} key={key}>
                      <div className={`provider-info ${provider.color}`}>
                        <Text strong className="provider-name">
                          {provider.name}
                        </Text>
                        <div className="provider-details">
                          <div>{provider.host}</div>
                          <div>Port: {provider.port}</div>
                          <div>{provider.secure ? 'SSL/TLS' : 'Insecure'}</div>
                          {(key === 'gmail' || key === 'yahoo') && (
                            <div className="app-password-note">
                              * Requires App Password
                            </div>
                          )}
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </Card> */}
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
              <div className="file-header">
                <Title level={3} className="file-title">
                  File Upload Configuration
                </Title>
                <Text type="secondary" className="file-description">
                  Set the maximum file size allowed for uploads in your chat
                  system
                </Text>
              </div>

              <Card className="file-form-card">
                <Form
                  form={fileForm}
                  layout="vertical"
                  onFinish={handleFinish}
                  initialValues={{ maxFileLimit: fileLimit }}
                  size="large"
                  className="file-form"
                >
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
                          onClick={() => setIsEditing(false)}
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
