import React, { useState } from "react";
import { Button, Input, message, Form } from "antd";
import Service from "../service";
import PropTypes from 'prop-types';
import TaskHub from "../assets/images/taskhubicon.svg"

function ResetPassword({ match, computedMatch, history }) {
  const companySlug = localStorage.getItem("companyDomain");
  const companyLogoPath = localStorage.getItem(`companyLogoUrl-${companySlug}`);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleSubmit = async values => {
    try {
      const token =
        match?.params?.token || computedMatch?.params?.token;

      if (typeof token === "undefined" || token === null || token === "") {
        return message.error("Reset token not found!");
      }

      setLoading(true);
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.resetPasswordV2,
        body: {
          password: values?.password,
          emailResetToken: token,
        },
      });

      if (response.data.status == 1) {
        message.success(response?.data?.message);
        form.resetFields();
        history.push(`/signin`);
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
                  <h1>Reset Password</h1>
                </div>
                  <div className="gx-app-login-left-content"><h6>Welcome to WeekMate TaskHub Portal !</h6></div>
                <Form
                  form={form}
                  name="basic"
                  layout="vertical"
                  onFinish={ handleSubmit }
                  className="gx-signin-form gx-form-row0"
                >

                  <div className="form-content">

                    <Form.Item
                    label="Password"
                      name="password"
                      hasFeedback
                      rules={ [
                        {
                          required: true,
                          message: "Please enter your password!",
                        },
                      ] }
                    >
                      <Input.Password placeholder="Password" prefix={  <span className="login-icon">
                      <i className="fa fa-lock"></i>
                    </span>}/>
                    </Form.Item>
                  </div>

                  <div className="form-content">
                    <Form.Item
                      label="Confirm Password"
                      name="confirm"
                      hasFeedback
                      rules={ [
                        {
                          required: true,
                          message: "Please confirm your password!",
                        },
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (!value || getFieldValue("password") === value) {
                              return Promise.resolve();
                            }
                            return Promise.reject(
                              "The Confirm passwords that you entered do not match!"
                            );
                          },
                        }),
                      ] }
                    >
                      <Input.Password placeholder="Confirm Password" prefix={  <span className="login-icon">
                      <i className="fa fa-lock"></i>
                    </span>} />
                    </Form.Item>

                  </div>
                  <Form.Item>
                    <Button
                      type="primary"
                      className="gx-mb-0"
                      htmlType="submit"
                      loading={loading}
                      disabled={loading}
                    >
                      {loading ? "Resetting..." : "Reset Password"}
                    </Button>
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

ResetPassword.propTypes = {
  match: PropTypes.shape({
    params: PropTypes.shape({
      token: PropTypes.string,
    }),
  }),
  computedMatch: PropTypes.shape({
    params: PropTypes.shape({
      token: PropTypes.string,
    }),
  }),
  history: PropTypes.shape({
    push: PropTypes.func.isRequired,
  }).isRequired,
};


export default ResetPassword;
