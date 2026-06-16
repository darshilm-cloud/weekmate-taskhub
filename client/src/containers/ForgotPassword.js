import React, { useState } from "react";
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
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleSubmit = async values => {
    try {
      setLoading(true);
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.forgetPasswordV2,
        body: {...values, companySlug},
      });
      if (response.data.status === 1) {
        message.success(response?.data?.message);
        form.resetFields();
      } else {
        message.error(response?.data?.message);
      }
    } catch (error) {
      console.log(error);
      message.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="gx-app-login-wrap account-login">
        <div className="gx-app-login-container">
          <div className="gx-app-login-main-content">
             <div className="gx-app-login-content">
            <div className="gx-app-logo-content">
              <div className="gx-app-logo account_logo">
                <img alt="example" src={ companyLogoPath ? `${process.env.REACT_APP_API_URL}/public/${companyLogoPath}` : TaskHub }
                onError={ (e) => { e.currentTarget.onerror = null; e.currentTarget.src = TaskHub; } }

                />
              </div>
            </div>

              <div className="form-center">
                <div className="gx-app-logo-wid">
                  <h1>Forgot Password</h1>
                </div>
                <div className="gx-app-login-left-content">
                  <h6>Welcome to WeekMate {companyTitle} TaskHub Portal !</h6>

                </div>
                <Form
                  form={form}
                  name="basic"
                  layout="vertical"
                  onFinish={ handleSubmit }
                  className="gx-signin-form gx-form-row0"
                >

                  <div className="form-content">
                    <Form.Item
                    label="Email"
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
                      <Input type="email" placeholder="Enter your email" prefix={   <span className="login-icon">
                      <i className="fas fa-envelope"></i>
                    </span>} />
                    </Form.Item>

                  </div>

                  <p className="form-text">
                    Enter Your Email, we&apos;ll send you the link!
                  </p>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} disabled={loading}>
                      {loading ? "Sending..." : "Send Reset Link"}
                    </Button>
                  </Form.Item>
                  <Form.Item>

                    <Link
                      type="button"
                      to={ "/signin"}
                      className="ant ant-btn-back"
                    >
                Back to Sign In
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
