import React, { useEffect } from "react";
import { Button, Input, message, Form, Row, Col } from "antd";
import { MailOutlined, LockOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { Link, useParams, useHistory, useLocation } from "react-router-dom";
import Service from "../service/index";
import {
  userRole,
  userSignInSuccess,
  userpermission,
} from "../appRedux/actions/Auth";
import IntlMessages from "../util/IntlMessages";
import setCookie from "../hooks/setCookie";
import { setSharedSso, getSharedSso, isLogoutPending } from "../util/ssoCookie";
import "./signinstyle.css";
import "./LoginRedesign.css";
import { getRoles } from "../util/hasPermission";
import TaskHub from "../assets/images/taskhubicon.svg";
import { Modal, Typography } from "antd";
import AuthBrandingSection from "./AuthBrandingSection";
import SecurityBadge from "./SecurityBadge";

function SignIn() {
  const history = useHistory();
  const location = useLocation();
  const { verificationToken, companySlug } = useParams();
  const companyLogoPath = localStorage.getItem(`companyLogoUrl-${companySlug}`);
  const companyTitle = localStorage.getItem(`title-${companySlug}`) || "";
  const dispatch = useDispatch();
  const { Title, Text } = Typography;

  const login_logo = localStorage.getItem("loginLogo");
  const { alertMessage, showMessage } = useSelector(({ auth }) => auth);

  useEffect(() => {
    if (!companySlug) {
      const storedSlug = localStorage.getItem("companyDomain");
      if (storedSlug) {
        history.push(`/signin`);
      }
    }

    // 1) Old email verification flow (kept as‑is)
    if (verificationToken) {
      tokenVerfication(verificationToken);
    }

    // 2) New JWT redirect flow (HRMS / SSO style)
    //    If a `token` comes in query string, auto‑login via backend /authentication/redirectToBack
    const searchParams = new URLSearchParams(location.search);
    const redirectToken = searchParams.get("token");
    const existingAccessToken = localStorage.getItem("accessToken");

    if (redirectToken && !existingAccessToken) {
      loginWithRedirectToken(redirectToken);
    } else if (!existingAccessToken && !isLogoutPending()) {
      // 3) Cross-product browser SSO: no local session, but a sibling WeekMate
      //    app already set the shared `wm_shared_token` cookie → auto-login.
      const sharedToken = getSharedSso();
      if (sharedToken) {
        loginWithRedirectToken(sharedToken);
      }
    }
  }, [verificationToken, location.search]);

  const tokenVerfication = async (token) => {
    let accessToken = localStorage.getItem("accessToken");
    if(accessToken) {
      history.push(`/signin`)
      return
    };
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.verifyRegistration,
        body: {
          token,
        },
      });
      if (response.data.status == 1) {
        showVerificationModal(response.data.message, true);
      } else {
        showVerificationModal(response.data.message, false);
      }
      history.push(`/signin`)
    } catch (error) {
      console.log(error);
    }
  };

  const onFinishFailed = (errorInfo) => {
    console.log("Failed:", errorInfo);
  };

  const [form] = Form.useForm();

  // New: login using JWT token that hits /authentication/redirectToBack
  const loginWithRedirectToken = async (token) => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.loginWithHRMSRedirect,
        body: { token },
      });

      if (response?.data?.status === 1) {
        message.success(response?.data?.message);
        const userData = response?.data?.data;

        // Mirror normal login flow (localStorage + cookies + redirects)
        localStorage.setItem("user_data", JSON.stringify(userData.user));
        localStorage.setItem("accessToken", userData.auth_token);
        // Share the slim SSO token so sibling apps auto-login in this browser.
        setSharedSso(userData.ssoToken);
        const slug =
          companySlug || userData?.user?.companyDetails?.companyDomain || "";
        if (slug) {
          localStorage.setItem(
            "companyDomain",
            userData?.user?.companyDetails?.companyDomain
          );
          localStorage.setItem(
            `companyLogoUrl-${slug}`,
            userData?.user?.companyDetails?.companyLogoUrl
          );
          localStorage.setItem(
            `companyFavIcoUrl-${slug}`,
            userData?.user?.companyDetails?.companyFavIcoUrl
          );
          localStorage.setItem(
            `title-${slug}`,
            userData?.user?.companyDetails?.companyName
          );
        }

        // cookie
        setCookie(
          "user_permission",
          JSON.stringify(response.data.permissions),
          { expires: 365 }
        );
        setCookie("pms_role_id", response.data.pms_role_id, { expires: 365 });

        // Set auth state FIRST so the route guards treat the user as logged in,
        // then navigate client-side (no full-page reload → no blank/splash flash).
        // Dispatch the user object (not the whole `userData` wrapper) so the Redux
        // `authUser` shape matches what's persisted to localStorage and re-hydrated
        // on refresh — otherwise the name/profile menu stay empty until a reload.
        dispatch(userSignInSuccess(userData.user));
        dispatch(userpermission(response.data.permissions));
        dispatch(userRole(response.data.pms_role_id));

        const destinationSlug =
          slug || userData?.user?.companyDetails?.companyDomain;
        history.push(
          getRoles(["Client"])
            ? `/${destinationSlug}/project-list`
            : `/${destinationSlug}/dashboard`
        );
      } else {
        message.error(response?.data?.message || "Unable to login with token");
      }
    } catch (error) {
      console.log("🚀 ~ loginWithRedirectToken ~ error:", error);
      message.error("Unable to login with token");
    }
  };

  const loginFn = async (values) => {
    try {
      const reqBody = {
        email: values.email.trim(),
        password: values.password.trim(),
        slug: companySlug
      };

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.login,
        body: reqBody,
      });
      if (
        response?.data?.status == 1
      ) {
        message.success(response?.data?.message);
        const userData = response?.data?.data;

        localStorage.setItem("user_data", JSON.stringify(userData.user));
        localStorage.setItem("accessToken", userData.auth_token);
        // Share the slim SSO token so sibling apps auto-login in this browser.
        setSharedSso(userData.ssoToken);
        localStorage.setItem("companyDomain",userData?.user?.companyDetails?.companyDomain)
        localStorage.setItem(`companyLogoUrl-${companySlug}`,userData?.user?.companyDetails?.companyLogoUrl)
        localStorage.setItem(`companyFavIcoUrl-${companySlug}`,userData?.user?.companyDetails?.companyFavIcoUrl)

        //cookie
        setCookie(
          "user_permission",
          JSON.stringify(response.data.permissions),
          { expires: 365 }
        );
        setCookie("pms_role_id", response.data.pms_role_id, { expires: 365 });

        // Set auth state FIRST so the route guards treat the user as logged in,
        // then navigate client-side. Using history.push instead of a full-page
        // window.location reload keeps the SPA mounted, so sign-in flows straight
        // into the dashboard's own loading state — no blank/splash flash in between.
        // Dispatch the user object (not the whole `userData` wrapper) so the Redux
        // `authUser` shape matches what's persisted to localStorage and re-hydrated
        // on refresh — otherwise the name/profile menu stay empty until a reload.
        dispatch(userSignInSuccess(userData.user));
        dispatch(userpermission(response.data.permissions));
        dispatch(userRole(response.data.pms_role_id));

        const slug = userData?.user?.companyDetails?.companyDomain;
        history.push(
          getRoles(["Client"]) ? `/${slug}/project-list` : `/${slug}/dashboard`
        );
      } else {
        message.error(response?.data?.message);
      }
    } catch (error) {
      console.log("🚀 ~ loginFn ~ error:", error);
    }
  };

  const showVerificationModal = (message, verfyed) => {
    Modal.success({
      title: (
        <Title level={ 4 } style={ { marginBottom: 0 } }>
          { verfyed ? "Verified" : "Not Verified" }
        </Title>
      ),
      content: (
        <div style={ { marginTop: 8 } }>
          <Text>
            Your email has { verfyed ? "" : "not" } been successfully verified.
          </Text>
          <br />
          <Text type="secondary">{ message } </Text>
        </div>
      ),
      okText: "Ok",
      okButtonProps: {
        type: "primary",
        size: "large",
        className: "ant-btn-primary",
    
      },
      centered: true,
    });
  };

  return (
    <div className="taskhub-login-page">
      <Row className="login-container-row">
        {/* Left Side - Branding Section */}
        <Col xs={24} lg={14} className="login-branding-section">
          <AuthBrandingSection />
        </Col>

        {/* Right Side - Form Section */}
        <Col xs={24} lg={10} className="login-form-section">
          <div className="form-content">
            <div className="form-card">
              {/* Company logo (multi-tenant) shown above the form when available */}
              {companyLogoPath ? (
                <div className="company-logo">
                  <img
                    alt={companyTitle || "Company"}
                    src={`${process.env.REACT_APP_API_URL}/public/${companyLogoPath}`}
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = TaskHub; }}
                  />
                </div>
              ) : null}

              <Form
                name="basic"
                className="login-form-wrapper"
                onFinishFailed={onFinishFailed}
                form={form}
                onFinish={(values) => {
                  loginFn(values);
                }}
                layout="vertical"
              >
                <div className="form-header">
                  <h2>Welcome back! 👋</h2>
                  <p>
                    {`Sign in to continue to ${
                      companyTitle ? `${companyTitle} ` : ""
                    }TaskHub`}
                  </p>
                </div>

                <div className="form-fields">
                  <div className="field-group">
                    <label>Email address</label>
                    <Form.Item
                      rules={[
                        {
                          required: true,
                          message: "Please enter your email!",
                        },
                        {
                          type: "email",
                          message: "Please enter valid email",
                        },
                      ]}
                      name="email"
                    >
                      <Input
                        type="email"
                        size="large"
                        placeholder="Enter your email"
                        prefix={<MailOutlined className="input-icon" />}
                      />
                    </Form.Item>
                  </div>

                  <div className="field-group">
                    <label>Password</label>
                    <Form.Item
                      name="password"
                      rules={[
                        {
                          required: true,
                          message: "Please enter your password!",
                        },
                      ]}
                    >
                      <Input.Password
                        size="large"
                        placeholder="Enter your password"
                        prefix={<LockOutlined className="input-icon" />}
                      />
                    </Form.Item>
                  </div>

                  <div className="form-options">
                    <Link className="forgot-password-link" to="/forgot-password">
                      Forgot password?
                    </Link>
                  </div>
                </div>

                <div className="form-actions">
                  <Form.Item noStyle>
                    <Button
                      type="primary"
                      htmlType="submit"
                      className="btn-signin"
                    >
                      <IntlMessages id="app.userAuth.signIn" /> <ArrowRightOutlined />
                    </Button>
                  </Form.Item>
                </div>
              </Form>
            </div>

            <SecurityBadge />
          </div>
        </Col>
      </Row>
      {showMessage ? message.error(alertMessage.toString()) : null}
    </div>
  );
}

export default SignIn;
