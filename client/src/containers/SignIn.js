import React, { useEffect } from "react";
import { Button, Input, message, Form, Row, Col } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { Link, useParams, useHistory } from "react-router-dom";
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
import { Modal, Typography } from "antd";

function SignIn() {
  const history = useHistory();
  const { verificationToken, companySlug } = useParams();
  const companyLogoPath = localStorage.getItem(`companyLogoUrl-${companySlug}`);
  const companyTitle = localStorage.getItem(`title-${companySlug}`) || "";
  const dispatch = useDispatch();
  const { Title, Text } = Typography;

  const login_logo = localStorage.getItem("loginLogo");
  const { alertMessage, showMessage } = useSelector(({ auth }) => auth);

  useEffect(() => {
    if(!companySlug){
      let storedSlug = localStorage.getItem("companyDomain")
      if(storedSlug){
        history.push(`/signin`);
      }
    }
    if (verificationToken) {
      tokenVerfication(verificationToken);
    }
  }, [verificationToken]);

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

        getRoles(["Client"])
          ? (window.location.href = `/${userData?.user?.companyDetails?.companyDomain}/project-list`) :
          (window.location.href = `/${userData?.user?.companyDetails?.companyDomain}/dashboard`)
          

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
    <div className="gx-app-login-wrap account-login">
      <div className="gx-app-login-container">
        <Row className="gx-app-login-main-content">
          <Col xs={ 24 } sm={ 24 } md={ 24 } lg={ 24 } className="gx-app-login-content">
            <div className="gx-app-logo-content">
              <div className="gx-app-logo account_logo">
                { login_logo ? (
                  <img alt="example" src={ companyLogoPath ? `${process.env.REACT_APP_API_URL}/public/${companyLogoPath}` : TaskHub }  onError={ (e) => { e.currentTarget.onerror = null; e.currentTarget.src = TaskHub; } }/>
                ) : (
                  <img
                    alt="example"
                    // style={ {
                    //   width: "40%",
                    //   maxWidth: "80px",
                    //   marginBottom: "0",
                    // } }
                    onError={ (e) => { e.currentTarget.onerror = null; e.currentTarget.src = TaskHub; } }
                    src={ companyLogoPath ? `${process.env.REACT_APP_API_URL}/public/${companyLogoPath}` : TaskHub }
                  />
                ) }
              </div>
            </div>

            <div className="form-center">
              <div className="gx-app-logo-wid">
                <h1>
                  <IntlMessages id="app.userAuth.signIn" />
                </h1>
              </div>
              <div className="gx-app-login-left-content">
                <h6>Welcome to {companyTitle} TaskHub Portal !</h6>
              </div>

              <Form
                name="basic"
                className="gx-signin-form gx-form-row0"
                onFinishFailed={ onFinishFailed }
                form={ form }
                onFinish={ (values) => {
                  loginFn(values);
                } }
                layout="vertical"
              >
           
                <div className="form-content">
                  <Form.Item
                    rules={ [
                      {
                        required: true,
                        message: "Please enter your email!",
                      },
                      {
                        type: "email",
                        message: "Please enter valid email",
                      },
                    ] }
                    label="Email"
                    name="email"
                  >
                    <Input type="email" placeholder="Enter your email"  prefix={<span className="login-icon">
                      <i className="fas fa-envelope"></i>
                    </span>} />
                  </Form.Item>
                
                </div>
              
                <div className="form-content">
                  <Form.Item
                  label="Password"
                    name="password"
                    rules={ [
                      {
                        required: true,
                        message: "Please enter your password!",
                      },
                    ] }
                  >
                    <Input.Password placeholder="Enter your password"   prefix={<span className="login-icon">
                  <i className="fas fa-lock"></i>
                    </span>}/>
                  </Form.Item>
            
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
                {/* {!companySlug &&(

                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="button"
                    className="gx-mb-0"
                    onClick={ () => {
                      history.push(`/register-company`);
                    } }
                    block
                  >
                    <IntlMessages id="app.userAuth.signUpForNewCompany" />
                  </Button>
                </Form.Item>
                )} */}

                <Form.Item>
                  <div className="login-footer" style={ { textAlign: "center" } }>
                    Forgot your login details?
                    <Link to={`/forgot-password`}>
                      &nbsp;Get help logging in.
                    </Link>
                  </div>
                </Form.Item>
              </Form>
            </div>
          </Col>
        </Row>
        { showMessage ? message.error(alertMessage.toString()) : null }
      </div>
    </div>
  );
}

export default SignIn;
