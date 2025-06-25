import React, { useEffect } from "react";
import { Button, Input, message, Form, Row, Col, Divider, Spin } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { Link, useHistory, useLocation } from "react-router-dom";
import Service from "../service/index";
import {
  userRole,
  userSignInSuccess,
  userpermission,
} from "../appRedux/actions/Auth";
import IntlMessages from "../util/IntlMessages";
import setCookie from "../hooks/setCookie";
import "./signinstyle.css";
import { getRoles } from "../util/hasPermission";
import TaskHub from "../assets/images/taskhubicon.svg";

function SignIn() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const token = queryParams.get("token");

  useEffect(() => {
    if (token) {
      loginWithHRMS(token);
    }
  }, []);

  const dispatch = useDispatch();
  const history = useHistory();
  const { loader, alertMessage, showMessage } = useSelector(({ auth }) => auth);
  const Logo = localStorage.getItem("LogoURL");
  const title = localStorage.getItem("title");
  const login_logo = localStorage.getItem("loginLogo");

  const handleSSO = () => {
    const originalUrl = `${process.env.REACT_APP_REDIRECT_URI}`;
    const encodedUrl = encodeURIComponent(originalUrl);
    window.open(
      `${process.env.REACT_APP_HRMS_URI}?redirect_uri=${encodedUrl}`,
      "_self"
    );
  };

  const onFinishFailed = (errorInfo) => {
    console.log("Failed:", errorInfo);
  };

  const loginWithHRMS = async (token) => {
    try {
      const reqBody = {
        token: token,
      };

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.loginWithHRMSRedirect,
        body: reqBody,
      });
      if (response?.data?.data && response?.data?.status == 1) {
        const userData = response?.data?.data;

        //cookie
        setCookie(
          "user_permission",
          JSON.stringify(response.data.permissions),
          { expires: 365 }
        );
        setCookie("pms_role_id", response.data.pms_role_id, { expires: 365 });
        //localstorage
        localStorage.setItem("user_data", JSON.stringify(userData.user));
        localStorage.setItem("accessToken", userData.auth_token);

        getRoles(["Client"])
          ? (window.location.href = "/project-list")
          : (window.location.href = "/dashboard");
        dispatch(userSignInSuccess(userData));
        dispatch(userpermission(response.data.permissions));
        dispatch(userRole(response.data.pms_role_id));
      } else {
        const msg =
          response.data?.statusCode == 401
            ? "Token is Expired."
            : response?.data?.message;
        message.error(msg);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const [form] = Form.useForm();
  const loginFn = async (values) => {
    try {
      const reqBody = {
        email: values.email.trim(),
        password: values.password.trim(),
      };

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.login,
        body: reqBody,
      });

      if (
        response.data &&
        response?.data?.data &&
        response?.data?.status == 1
      ) {
        message.success(response?.data?.message);
        const userData = response?.data?.data;

        localStorage.setItem("user_data", JSON.stringify(userData.user));
        localStorage.setItem("accessToken", userData.auth_token);

        //cookie
        setCookie(
          "user_permission",
          JSON.stringify(response.data.permissions),
          { expires: 365 }
        );
        setCookie("pms_role_id", response.data.pms_role_id, { expires: 365 });

        getRoles(["Client"])
          ? (window.location.href = "/project-list")
          : (window.location.href = "/dashboard");

        dispatch(userSignInSuccess(userData));
        dispatch(userpermission(response.data.permissions));
        dispatch(userRole(response.data.pms_role_id));
      } else {
        message.error(response?.data?.message);
      }
    } catch (error) {
      console.log("🚀 ~ loginFn ~ error:", error);
    }
  };
  if (token) {
    return;
  }
  return (
    <div className="gx-app-login-wrap account-login">
      <div className="gx-app-login-container">
        <Row className="gx-app-login-main-content">
          <Col xs={24} sm={24} md={24} lg={24} className="gx-app-login-content">
            <div className="gx-app-logo-content">
              <div className="gx-app-logo account_logo">
                {login_logo ? (
                  <img alt="example" src={TaskHub} />
                ) : (
                  <img
                    alt="example"
                    style={{
                      width: "40%",
                      maxWidth: "80px",
                      marginBottom: "0",
                    }}
                    src={TaskHub}
                  />
                )}
              </div>
            </div>

            <div className="form-center">
              <div className="gx-app-logo-wid">
                <h1>
                  <IntlMessages id="app.userAuth.signIn" />
                </h1>
              </div>
              <div className="gx-app-login-left-content">
                <h6>Welcome to Elsner TaskHub Portal !</h6>
              </div>

              <Form
                name="basic"
                className="gx-signin-form gx-form-row0"
                onFinishFailed={onFinishFailed}
                form={form}
                onFinish={(values) => {
                  loginFn(values);
                }}
                layout="vertical"
              >
                <div className="form-label">
                  <span>
                    <label>Login Id</label>
                  </span>
                </div>
                <div className="form-content">
                  <Form.Item
                    rules={[
                      {
                        required: true,
                        message: "Please enter your Login Id!",
                      },
                      {
                        type: "email",
                        message: "Please enter valid Login Id",
                      },
                    ]}
                    name="email"
                  >
                    <Input type="email" placeholder="Login Id" />
                  </Form.Item>
                  <span className="login-icon">
                    <i className="fas fa-envelope"></i>
                  </span>
                </div>
                <div className="form-label">
                  <span>
                    <label>Password</label>
                  </span>
                </div>
                <div className="form-content">
                  <Form.Item
                    name="password"
                    rules={[
                      {
                        required: true,
                        message: "Please enter your password!",
                      },
                    ]}
                  >
                    <Input.Password placeholder="Password" />
                  </Form.Item>
                  <span className="login-icon lock">
                    <i className="fas fa-lock"></i>
                  </span>
                </div>

                <Form.Item>
                  <Button
                    type="primary"
                    className="gx-mb-0"
                    htmlType="submit"
                    block
                  >
                    <IntlMessages id="app.userAuth.signIn" />
                  </Button>
                </Form.Item>

                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="button"
                    className="gx-mb-0"
                    onClick={() => {
                      handleSSO();
                    }}
                    block
                  >
                    <IntlMessages id="app.userAuth.signUpForNewCompany" />
                  </Button>
                </Form.Item>

                <Form.Item>
                  <div style={{ textAlign: "center" }}>
                    Forgot your Login details?
                    <Link to="/forgot-password">
                      &nbsp;Get help logging in.
                    </Link>
                  </div>
                </Form.Item>
              </Form>
            </div>
          </Col>
        </Row>
        {showMessage ? message.error(alertMessage.toString()) : null}
      </div>
    </div>
  );
}

export default SignIn;
