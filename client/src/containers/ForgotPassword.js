import React from "react";
import { Button, Input, message, Form } from "antd";
import Service from "../service";
import { Link } from "react-router-dom";
import TaskHub from "../assets/images/taskhubicon.svg"
import { useParams } from "react-router-dom";


function ForgetPassword() {
  let { companySlug : companySlugTemp } = useParams();
  const companySlug = localStorage.getItem("companyDomain") || companySlugTemp;
  const companyTitle = localStorage.getItem(`title-${companySlug}`) || "";
  const companyLogoPath = localStorage.getItem(`companyLogoUrl-${companySlug}`);
  
  const handleSubmit = async values => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.forgetPasswordV2,
        body: {...values, companySlug},
      });
      if (response.data.status === 1) {
        message.success(response?.data?.message);
      } else {
        message.error(response?.data?.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <>
      <div className="gx-app-login-wrap account-login">
        <div className="gx-app-login-container">
          <div className="gx-app-login-main-content">
            <div className="gx-app-logo-content">
              <div className="gx-app-logo account_logo">
                <img alt="example" src={ companyLogoPath ? `${process.env.REACT_APP_API_URL}/public/${companyLogoPath}` : TaskHub }                   
                onError={ (e) => { e.currentTarget.onerror = null; e.currentTarget.src = TaskHub; } }
                
                />
              </div>
            </div>
            <div className="gx-app-login-content">
              <div className="form-center">
                <div className="gx-app-logo-wid">
                  <h1>Trouble Logging in?</h1>
                </div>
                <div className="gx-app-login-left-content">
                  <h6>Welcome to {companyTitle} TaskHub Portal !</h6>

                </div>
                <Form
                  name="basic"
                  onFinish={ handleSubmit }
                  className="gx-signin-form gx-form-row0"
                >
                  <div className="form-label">
                    <span>
                      <label>Email</label>
                    </span>
                  </div>
                  <div className="form-content">
                    <Form.Item
                      name="email"
                      rules={ [
                        {
                          type: "email",
                          message: "The input is not valid E-mail!",
                        },
                        {
                          required: true,
                          message: "Please input your E-mail!",
                        },
                      ] }
                    >
                      <Input type="email" placeholder="Email" />
                    </Form.Item>
                    <span className="login-icon">
                      <i className="fas fa-envelope"></i>
                    </span>
                  </div>

                  <p className="form-text">
                    Enter Your Email, we&apos;ll send you the link!
                  </p>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" >
                      Send a Reset Link
                    </Button>
                    <Link
                      type="button"
                      to={ "/signin"}
                      className="ant ant-btn-back"
                    >
                      Back
                    </Link>
                  </Form.Item>
                </Form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default ForgetPassword;
