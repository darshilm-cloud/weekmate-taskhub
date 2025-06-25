import React, { useState, useCallback } from "react";
import { Steps, Button, Input, Form, Row, Col, message, Card } from "antd";
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
  BankOutlined,
  GlobalOutlined,
} from "@ant-design/icons";
// import "./companyregister.scss";
import TaskHub from "../../assets/images/taskhubicon.svg";

// import Loader from "../../Components/Loader";
import { Modal, Typography } from "antd";

const { Step } = Steps;

const CompanyRegistration = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [adminForm] = Form.useForm();
  const [companyForm] = Form.useForm();

  // Store validated data from each step
  const [validatedAdminData, setValidatedAdminData] = useState(null);
  const [validatedCompanyData, setValidatedCompanyData] = useState(null);
  const { Title, Text } = Typography;


  // Common response handler for login (copied from Login component)
  const handleLoginResponse = useCallback(
    async (response) => {
    },
    []
  );

  // Auto login after registration
  const handleAutoLogin = useCallback(
    async (email, password) => {
    },
    [handleLoginResponse]
  );

  // Step 1: Admin Details - Validate and store data
  const handleAdminNext = useCallback(async () => {
    try {
      const adminData = await adminForm.validateFields();

      // Store validated admin data (excluding confirmPassword)
      const { confirmPassword, ...adminDetailsToStore } = adminData;
      setValidatedAdminData(adminDetailsToStore);

      setCurrentStep(1);
    } catch (error) {
      message.error("Please fill all required fields correctly");
    }
  }, [adminForm]);

  // Step 2: Company Details - Final Submit
  const handleCompanySubmit = useCallback(async () => {
    try {
      // Debug: Check current form values before validation
      const currentFormValues = companyForm.getFieldsValue();

      // Check if form fields have data
      const hasFormData =
        currentFormValues &&
        Object.keys(currentFormValues).some((key) => currentFormValues[key]);

      if (!hasFormData) {
        message.error("Please fill in the company details");
        return;
      }

      // Validate company form first and log the result
      const companyData = await companyForm.validateFields();
      setValidatedCompanyData(companyData);

      // Check if we have admin data from previous step
      if (!validatedAdminData) {
        message.error(
          "Admin data is missing. Please go back and complete the first step."
        );
        setCurrentStep(0);
        return;
      }


      // Prepare payload according to your exact structure
      const payload = {
        adminDetails: {
          fullName: validatedAdminData.fullName,
          userName: validatedAdminData.userName,
          email: validatedAdminData.email,
          password: validatedAdminData.password,
          position: validatedAdminData.position,
        },
        companyDetails: {
          companyName: companyData.companyName || currentFormValues.companyName,
          companyEmail:
            companyData.companyEmail || currentFormValues.companyEmail,
          domain: companyData.domain || currentFormValues.domain,
        },
      };

    } catch (error) {
      message.error(error.response.data.message);
    }
  }, [companyForm, validatedAdminData, handleAutoLogin]);

  // Navigation handlers
  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      // navigate("/");
    }
  };

  const showVerificationModal = (message) => {
    Modal.success({
      title: (
        <Title level={4} style={{ marginBottom: 0 }}>
          Verify Your Email
        </Title>
      ),
      content: (
        <div style={{ marginTop: 8 }}>
          <Text>{message}</Text>
        </div>
      ),
      okText: "Ok",
      centered: true,
    });
  };

  const steps = [
    {
      title: "Admin Details",
      content: (
        <Card title="Sign Up" className="step-card">
          <Form
            form={adminForm}
            layout="vertical"
            autoComplete="off"
            initialValues={validatedAdminData}
          >
            <Row gutter={24}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Full Name"
                  name="fullName"
                  rules={[
                    { required: true, message: "Please input full name!" },
                  ]}
                >
                  <Input prefix={<UserOutlined />} placeholder="Full Name" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Username"
                  name="userName"
                  rules={[
                    { required: true, message: "Please input username!" },
                  ]}
                >
                  <Input prefix={<UserOutlined />} placeholder="Username" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={24}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Position"
                  name="position"
                  rules={[
                    { required: true, message: "Please input position!" },
                  ]}
                >
                  <Input
                    prefix={<UserOutlined />}
                    placeholder="Position (e.g., CTO)"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Email"
                  name="email"
                  rules={[
                    { required: true, message: "Please input email!" },
                    { type: "email", message: "Please enter valid email!" },
                  ]}
                >
                  <Input prefix={<MailOutlined />} placeholder="Email" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={24}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Password"
                  name="password"
                  rules={[
                    { required: true, message: "Please input password!" },
                    {
                      min: 8,
                      message: "Password must be at least 8 characters!",
                    },
                    {
                      validator: (_, value) => {
                        if (value && /\s/.test(value)) {
                          return Promise.reject(
                            new Error("Password should not contain spaces")
                          );
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="Password"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Confirm Password"
                  name="confirmPassword"
                  dependencies={["password"]}
                  rules={[
                    { required: true, message: "Please confirm password!" },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue("password") === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(
                          new Error("Passwords do not match!")
                        );
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="Confirm Password"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>
      ),
    },
    {
      title: "Company Details",
      content: (
        <Card title="Company Information" className="step-card">
          <Form
            key="company-form"
            form={companyForm}
            layout="vertical"
            autoComplete="off"
            preserve={false}
            // Pre-populate form if user goes back
            initialValues={validatedCompanyData}
          >
            <Row gutter={24}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Company Name"
                  name="companyName"
                  rules={[
                    { required: true, message: "Please input company name!" },
                  ]}
                >
                  <Input
                    prefix={<BankOutlined />}
                    placeholder="Company Name"
                    onChange={(e) =>
                      console.log("Company Name changed:", e.target.value)
                    }
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Company Email"
                  name="companyEmail"
                  rules={[
                    { required: true, message: "Please input company email!" },
                    { type: "email", message: "Please enter valid email!" },
                  ]}
                >
                  <Input
                    prefix={<MailOutlined />}
                    placeholder="Company Email"
                    onChange={(e) =>
                      console.log("Company Email changed:", e.target.value)
                    }
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={24}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Comapany Slug"
                  name="domain"
                  rules={[
                    { required: true, message: "Please enter company slug" },
                    {
                      pattern: /^[a-zA-Z0-9]+$/,
                      message:
                        "Use only letters and numbers. Spaces and special characters are not allowed.",
                    },
                    {
                      max: 25,
                      message: "Slug must be at most 25 characters long.",
                    },
                    {
                      validator: (_, value) => {
                        if (value && /^[0-9]+$/.test(value)) {
                          return Promise.reject(
                            new Error(
                              "Slug cannot be numbers only. Include at least one letter."
                            )
                          );
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <Input
                    prefix={<GlobalOutlined />}
                    placeholder="Company slug (e.g.,exampletech)"
                    onChange={(e) =>
                      console.log("Domain changed:", e.target.value)
                    }
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>
      ),
    },
  ];

  return (
    <>
      {/* {isLoading && <Loader />} */}
      <div className="registration-wrapper">
        <Row justify="center" className="registration-main-row">
          <Col
            xs={24}
            sm={22}
            md={20}
            lg={16}
            xl={14}
            xxl={12}
            className="login-min-wrapper"
          >
            <div className="registration-header">
              <Row justify="center" className="logo-row">
                <Col xs={24} className="min-logo-wrapper">
                  <div className="login-page-logo">
                    <img src={TaskHub} alt="TaskHub" />
                  </div>
                </Col>
              </Row>

              <Row justify="center">
                <Col xs={24} className="header-text-col">
                  <h2>Company Registration</h2>
                  <p>Register your company to get started</p>
                </Col>
              </Row>
            </div>

            <Row justify="center" className="steps-row">
              <Col xs={24}>
                <Steps
                  current={currentStep}
                  direction="horizontal"
                  size="small"
                  responsive={false}
                  className="registration-steps"
                >
                  {steps.map((item) => (
                    <Step key={item.title} title={item.title} />
                  ))}
                </Steps>
              </Col>
            </Row>

            <Row justify="center" className="content-row">
              <Col xs={24}>
                <div className="steps-content">
                  {steps[currentStep].content}
                </div>
              </Col>
            </Row>

            <div className="steps-action">
              <Row justify="center" gutter={[24]}>
                <Col className="steps-action-left">
                  <Button
                    block
                    size="large"
                    onClick={goBack}
                    className="action-button"
                  >
                    {currentStep === 0 ? "BACK TO LOGIN" : "PREVIOUS"}
                  </Button>
                </Col>

                <Col className="steps-action-right">
                  {currentStep === 0 && (
                    <Button
                      type="primary"
                      block
                      size="large"
                      onClick={handleAdminNext}
                      className="action-button primary-button"
                    >
                      NEXT
                    </Button>
                  )}

                  {currentStep === 1 && (
                    <Button
                      type="primary"
                      block
                      size="large"
                      onClick={handleCompanySubmit}
                      className="action-button primary-button"
                    >
                      REGISTER COMPANY
                    </Button>
                  )}
                </Col>
              </Row>
            </div>
          </Col>
        </Row>
      </div>
    </>
  );
};

export default CompanyRegistration;
