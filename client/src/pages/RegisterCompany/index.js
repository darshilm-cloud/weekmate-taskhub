import React, { useState, useCallback, useMemo } from "react";
import {
  Steps,
  Button,
  Input,
  Form,
  Row,
  Col,
  message,
  Card,
  Modal,
  Typography,
  Alert,
  Spin,
  Checkbox
} from "antd";
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
  BankOutlined,
  LinkOutlined,
  LoadingOutlined
} from "@ant-design/icons";
import "./companyregister.scss";
import TaskHub from "../../assets/images/taskhubicon.svg";
import Service from "../../service";
import { useHistory } from "react-router-dom";
import { userpermission, userRole, userSignInSuccess } from "../../appRedux/actions/Auth";
import { useDispatch } from "react-redux";
import setCookie from "../../hooks/setCookie";
import { getRoles } from "../../util/hasPermission";

const { Step } = Steps;
const { Title, Text } = Typography;

// Constants to prevent recreation on each render
const FORM_LAYOUT = "vertical";
const AUTO_COMPLETE = "off";
const BASE_DOMAIN = window.location.origin;

// MillionVerifier API configuration
const MILLION_VERIFIER_API = "EtZ9UjCjczYS5lxJyJ9rxvAn7";
const MILLION_VERIFIER_URL = "https://api.millionverifier.com/api/v3/";

// Email validation function
const validateEmailWithAPI = async (email) => {
  try {
    const response = await fetch(
      `${MILLION_VERIFIER_URL}?api=${MILLION_VERIFIER_API}&email=${encodeURIComponent(
        email
      )}&timeout=10`
    );

    if (!response.ok) {
      throw new Error("Email verification service is unavailable");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Email validation error:", error);
    throw new Error("Unable to verify email. Please try again later.");
  }
};

// Validation rules - memoized to prevent recreation
const VALIDATION_RULES = {
  first_name: [{ required: true, message: "Please input first name!" }],
  last_name: [{ required: true, message: "Please input last name!" }],
  position: [], // Made optional - no required rule
  email: [
    { required: true, message: "Please input email!" },
    { type: "email", message: "Please enter valid email!" },
    {
      validator: async (_, value) => {
        if (!value) return Promise.resolve();

        try {
          const result = await validateEmailWithAPI(value);

          // Check if email verification was successful
          if (result.resultcode !== 1 || result.result !== "ok") {
            return Promise.reject(
              new Error("Invalid email address. Please enter a valid email.")
            );
          }

          // Check if email is from a free/generic provider
          if (result.free === true) {
            return Promise.reject(
              new Error(
                "Generic email addresses (Gmail, Yahoo, Outlook, etc.) are not allowed. Please use a corporate email address."
              )
            );
          }

          // Check if it's a role-based email (optional additional check)
          if (result.role === true) {
            return Promise.reject(
              new Error(
                "Role-based email addresses (info@, admin@, etc.) are not recommended. Please use a personal corporate email."
              )
            );
          }

          return Promise.resolve();
        } catch (error) {
          return Promise.reject(
            new Error(error.message || "Email validation failed")
          );
        }
      }
    }
  ],
  password: [
    { required: true, message: "Please input password!" },
    { min: 8, message: "Password must be at least 8 characters!" },
    {
      validator: (_, value) => {
        if (value && /\s/.test(value)) {
          return Promise.reject(
            new Error("Password should not contain spaces")
          );
        }
        return Promise.resolve();
      }
    }
  ],
  confirmPassword: [{ required: true, message: "Please confirm password!" }],
  companyName: [{ required: true, message: "Please input company name!" }],
  companySlug: [
    { required: true, message: "Please input company slug!" },
    { min: 3, message: "Slug must be at least 3 characters!" },
    { max: 8, message: "Slug must be less than 8 characters!" },
    {
      validator: (_, value) => {
        if (!value) return Promise.resolve();

        // Check if slug contains only allowed characters (letters, numbers, hyphens)
        const slugRegex = /^[a-z0-9-]+$/;
        if (!slugRegex.test(value)) {
          return Promise.reject(
            new Error(
              "Slug can only contain lowercase letters, numbers, and hyphens"
            )
          );
        }

        // Check if slug starts or ends with hyphen
        if (value.startsWith("-") || value.endsWith("-")) {
          return Promise.reject(
            new Error("Slug cannot start or end with a hyphen")
          );
        }

        // Check for consecutive hyphens
        if (value.includes("--")) {
          return Promise.reject(
            new Error("Slug cannot contain consecutive hyphens")
          );
        }

        return Promise.resolve();
      }
    }
  ]
};

const CompanyRegistration = () => {
  const history = useHistory();
  const dispatch = useDispatch();

  // State management
  const [currentStep, setCurrentStep] = useState(0);
  const [validatedAdminData, setValidatedAdminData] = useState(null);
  const [validatedCompanyData, setValidatedCompanyData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companySlug, setCompanySlug] = useState("");
  const [isValidatingEmail, setIsValidatingEmail] = useState(false);

  // Form instances - stable references
  const [adminForm] = Form.useForm();
  const [companyForm] = Form.useForm();

  // Utility functions
  const showVerificationModal = useCallback((messageText) => {
    Modal.success({
      title: (
        <Title level={4} style={{ marginBottom: 0 }}>
          Verify Your Email
        </Title>
      ),
      content: (
        <div style={{ marginTop: 8 }}>
          <Text>{messageText}</Text>
        </div>
      ),
      okText: "Ok",
      centered: true
    });
  }, []);

  const showErrorMessage = useCallback((errorMessage) => {
    message.error(errorMessage);
  }, []);

  // Function to normalize slug input
  const normalizeSlug = useCallback((value) => {
    if (!value) return "";
    return value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "") // Remove invalid characters
      .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
      .replace(/-+/g, "-"); // Replace multiple hyphens with single hyphen
  }, []);

  // Handle slug input change
  const handleSlugChange = useCallback(
    (e) => {
      const normalizedValue = normalizeSlug(e.target.value);
      setCompanySlug(normalizedValue);
      companyForm.setFieldsValue({ companySlug: normalizedValue });
    },
    [normalizeSlug, companyForm]
  );

  // Generate URL preview
  const urlPreview = useMemo(() => {
    return companySlug
      ? `${BASE_DOMAIN}/${companySlug}`
      : `${BASE_DOMAIN}/your-company`;
  }, [companySlug]);

  // Handle email validation state
  const handleEmailValidation = useCallback(async (email) => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) return;

    setIsValidatingEmail(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500)); // Small delay for UX
      // Validation is handled by the form validator
    } finally {
      setIsValidatingEmail(false);
    }
  }, []);

  // Step 1: Admin Details Handler
  const handleAdminNext = useCallback(async () => {
    try {
      setIsSubmitting(true);
      const adminData = await adminForm.validateFields();

      // Store validated admin data (excluding confirmPassword)
      const { confirmPassword, ...adminDetailsToStore } = adminData;
      setValidatedAdminData(adminDetailsToStore);
      setCurrentStep(1);
    } catch (error) {
      if (error.errorFields) {
        const emailError = error.errorFields.find(
          (field) => field.name[0] === "email"
        );
        if (emailError) {
          showErrorMessage(
            "Please ensure you're using a valid corporate email address"
          );
        } else {
          showErrorMessage("Please fill all required fields correctly");
        }
      } else {
        showErrorMessage("Please fill all required fields correctly");
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [adminForm, showErrorMessage]);

  // Step 2: Company Details Handler
  const handleCompanySubmit = useCallback(async () => {
    if (isSubmitting) return; // Prevent double submission

    try {
      setIsSubmitting(true);

      // Get current form values for debugging
      const currentFormValues = companyForm.getFieldsValue();

      // Check if form has data
      const hasFormData =
        currentFormValues &&
        Object.keys(currentFormValues).some((key) => currentFormValues[key]);

      if (!hasFormData) {
        showErrorMessage("Please fill in the company details");
        return;
      }

      // Validate company form
      const companyData = await companyForm.validateFields();
      setValidatedCompanyData(companyData);

      // Check admin data availability
      if (!validatedAdminData) {
        showErrorMessage(
          "Admin data is missing. Please go back and complete the first step."
        );
        setCurrentStep(0);
        return;
      }

      // Prepare optimized payload
      const payload = {
        adminDetails: {
          first_name: validatedAdminData.first_name,
          last_name: validatedAdminData.last_name,
          email: validatedAdminData.email,
          password: validatedAdminData.password,
          position: validatedAdminData.position || ""
        },
        companyDetails: {
          companyName: companyData.companyName || currentFormValues.companyName,
          companyDomain:
            companyData.companySlug || currentFormValues.companySlug
        }
      };

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.registerAdminAndCompany,
        body: payload
      });

      if (response.data.status === 1) {
        // showVerificationModal(response.data.message);
        // history.push(
        //   `/${companyData.companySlug || currentFormValues.companySlug}/dashboard`
        // );
        const userData = response?.data?.data;

        localStorage.setItem("user_data", JSON.stringify(userData.user));
        localStorage.setItem("accessToken", userData.auth_token);
        localStorage.setItem("companyDomain",userData?.user?.companyDetails?.companyDomain)
        localStorage.setItem(`companyLogoUrl-${userData?.user?.companyDetails?.companyDomain}`,userData?.user?.companyDetails?.companyLogoUrl)
        localStorage.setItem(`companyFavIcoUrl-${userData?.user?.companyDetails?.companyDomain}`,userData?.user?.companyDetails?.companyFavIcoUrl)

        //cookie
        setCookie(
          "user_permission",
          JSON.stringify(response.data.permissions),
          { expires: 365 }
        );
        setCookie("pms_role_id", response.data.pms_role_id, { expires: 365 });

        getRoles(["Client"])
          ? (window.location.href = `/${userData?.user?.companyDetails?.companyDomain}/project-list`) :
          (window.location.href = `/${userData?.user?.companyDetails?.companyDomain}/dashboard`)
          

        dispatch(userSignInSuccess(userData));
        dispatch(userpermission(response.data.permissions));
        dispatch(userRole(response.data.pms_role_id));
      } else {
        showErrorMessage(response.data.message || "Registration failed");
      }
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message ||
        "Registration failed. Please try again.";
      showErrorMessage(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    companyForm,
    validatedAdminData,
    isSubmitting,
    showErrorMessage,
    showVerificationModal,
    history
  ]);

  // Navigation handler
  const goBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  // Custom validator for confirm password - memoized
  const confirmPasswordValidator = useCallback(
    ({ getFieldValue }) => ({
      validator(_, value) {
        if (!value || getFieldValue("password") === value) {
          return Promise.resolve();
        }
        return Promise.reject(new Error("Passwords do not match!"));
      }
    }),
    []
  );

  // Memoized form components to prevent unnecessary re-renders
  const AdminForm = useMemo(
    () => (
      <Card title="Sign Up" className="step-card">
        <Form
          form={adminForm}
          layout={FORM_LAYOUT}
          autoComplete={AUTO_COMPLETE}
          initialValues={validatedAdminData}
        >
          <Row gutter={24}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="First Name"
                name="first_name"
                rules={VALIDATION_RULES.first_name}
              >
                <Input prefix={<UserOutlined />} placeholder="First Name" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Last Name"
                name="last_name"
                rules={VALIDATION_RULES.last_name}
              >
                <Input prefix={<UserOutlined />} placeholder="Last Name" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={24}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Position (Optional)"
                name="position"
                rules={VALIDATION_RULES.position}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="Position (e.g., CTO)"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Corporate Email"
                name="email"
                rules={VALIDATION_RULES.email}
                validateFirst
                hasFeedback
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="your.name@company.com"
                  suffix={
                    isValidatingEmail ? (
                      <Spin indicator={<LoadingOutlined spin />} />
                    ) : null
                  }
                  onBlur={(e) => handleEmailValidation(e.target.value)}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={24}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Password"
                name="password"
                rules={VALIDATION_RULES.password}
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
                  ...VALIDATION_RULES.confirmPassword,
                  confirmPasswordValidator
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Confirm Password"
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Email Policy Alert */}
          {/* <Row gutter={24}>
            <Col xs={24}>
              <Alert
                message="Email Policy"
                description="We only accept corporate email addresses. Free email providers like Gmail, Yahoo, Outlook, and others are not allowed for company registration."
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
            </Col>
          </Row> */}
        </Form>
      </Card>
    ),
    [
      adminForm,
      validatedAdminData,
      confirmPasswordValidator,
      isValidatingEmail,
      handleEmailValidation
    ]
  );

  const CompanyForm = useMemo(
    () => (
      <Card title="Company Information" className="step-card">
        <Form
          key="company-form"
          form={companyForm}
          layout={FORM_LAYOUT}
          autoComplete={AUTO_COMPLETE}
          preserve={false}
          initialValues={validatedCompanyData}
        >
          <Row gutter={24}>
            <Col xs={24}>
              <Form.Item
                label="Company Name"
                name="companyName"
                rules={VALIDATION_RULES.companyName}
              >
                <Input prefix={<BankOutlined />} placeholder="Company Name" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={24}>
            <Col xs={24}>
              <Form.Item
                label="Company Slug"
                name="companySlug"
                rules={VALIDATION_RULES.companySlug}
                extra="This will be used to create your company's unique domain. Only lowercase letters, numbers, and hyphens are allowed."
              >
                <Input
                  prefix={<LinkOutlined />}
                  placeholder="my-company"
                  value={companySlug}
                  onChange={handleSlugChange}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* URL Preview Section */}
          <Row gutter={24}>
            <Col xs={24}>
              <Alert
                message="Your Company URL Preview"
                description={
                  <div style={{ marginTop: 8 }}>
                    <Text strong style={{ fontSize: "16px", color: "#1890ff" }}>
                      {urlPreview}
                    </Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: "14px" }}>
                      {companySlug
                        ? "This will be your company's unique domain URL"
                        : "Enter a company slug to see your URL preview"}
                    </Text>
                  </div>
                }
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
            </Col>
          </Row>

          <Row gutter={24} justify="center">
            <Col xs={24} style={{ textAlign: "center" }}>
              <Form.Item
                name="termsCondition"
                valuePropName="checked"
                rules={[
                  {
                    validator: (_, value) =>
                      value
                        ? Promise.resolve()
                        : Promise.reject(
                            new Error("Please accept Terms & Conditions!")
                          )
                  }
                ]}
                style={{ marginBottom: 0 }}
              >
                <Checkbox>
                  I agree to the{" "}
                  <a
                    href="https://weekmate.in/terms-of-services/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="terms-link"
                  >
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a
                    href="https://weekmate.in/privacy-policy/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="terms-link"
                  >
                    Privacy Policy
                  </a>
                </Checkbox>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>
    ),
    [
      companyForm,
      validatedCompanyData,
      companySlug,
      handleSlugChange,
      urlPreview
    ]
  );

  // Memoized steps configuration
  const steps = useMemo(
    () => [
      {
        title: "Admin Details",
        content: AdminForm
      },
      {
        title: "Company Details",
        content: CompanyForm
      }
    ],
    [AdminForm, CompanyForm]
  );

  // Memoized action buttons
  const ActionButtons = useMemo(
    () => (
      <div className="steps-action">
        <Row justify="center" gutter={[24]}>
          {currentStep === 1 && (
            <Col className="steps-action-left">
              <Button
                block
                size="large"
                onClick={goBack}
                className="action-button"
                disabled={isSubmitting}
              >
                {"PREVIOUS"}
              </Button>
            </Col>
          )}
          <Col className="steps-action-right">
            {currentStep === 0 && (
              <Button
                type="primary"
                block
                size="large"
                onClick={handleAdminNext}
                className="action-button primary-button"
                loading={isSubmitting}
                disabled={isSubmitting || isValidatingEmail}
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
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                REGISTER COMPANY
              </Button>
            )}
          </Col>
        </Row>
      </div>
    ),
    [
      currentStep,
      goBack,
      handleAdminNext,
      handleCompanySubmit,
      isSubmitting,
      isValidatingEmail
    ]
  );

  const companyLogoPath = localStorage.getItem(`companyLogoUrl-${companySlug}`);

  return (
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
                  <img
                    src={
                      companyLogoPath
                        ? `${process.env.REACT_APP_API_URL}/public/${companyLogoPath}`
                        : TaskHub
                    }
                    alt="TaskHub"
                  />
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
              <div className="steps-content">{steps[currentStep].content}</div>
            </Col>
          </Row>

          {ActionButtons}
        </Col>
      </Row>
    </div>
  );
};

export default CompanyRegistration;
