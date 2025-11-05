import React from "react";
import { Button, Input, message, Form } from "antd";
import Service from "../service";
import PropTypes from 'prop-types';
import TaskHub from "../assets/images/taskhubicon.svg"
function ResetPassword({ match, computedMatch, history }) {
  const companySlug = localStorage.getItem("companyDomain");
  const companyLogoPath = localStorage.getItem(`companyLogoUrl-${companySlug}`);

  const handleSubmit = async values => {
    try {
      const token =
        match?.params?.token || computedMatch?.params?.token;

      if (typeof token === "undefined" || token === null || token === "") {
        return message.error("Reset token not found!");
      }
      
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
        history.push(`/signin`);
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
                  <h1>Reset Password</h1>
                </div>
                <Form
                  name="basic"
                  onFinish={ handleSubmit }
                  className="gx-signin-form gx-form-row0"
                >
                  <div className="form-label">
                    <span>
                      <label>Password</label>
                    </span>
                  </div>
                  <div className="form-content">
                    <span className="login-icon">
                      <i className="fa fa-lock"></i>
                    </span>
                    <Form.Item
                      name="password"
                      hasFeedback
                      rules={ [
                        {
                          required: true,
                          message: "Please enter your password!",
                        },
                      ] }
                    >
                      <Input.Password placeholder="Password" />
                    </Form.Item>
                  </div>
                  <div className="form-label">
                    <span>
                      <label>Confirm Password</label>
                    </span>
                  </div>
                  <div className="form-content">
                    <Form.Item
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
                      <Input.Password placeholder="Confirm Password" />
                    </Form.Item>
                    <span className="login-icon">
                      <i className="fas fa-lock"></i>
                    </span>
                  </div>
                  <Form.Item>
                    <Button
                      type="primary"
                      className="gx-mb-0"
                      htmlType="submit"
                    >
                      Reset Password
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

