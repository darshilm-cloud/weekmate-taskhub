import React, { useState } from "react";
import { Button, Input, message, Form, Row, Col } from "antd";
import { MailOutlined, ArrowRightOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import Service from "../service";
import { Link } from "react-router-dom";
import { useParams } from "react-router-dom";
import "./LoginRedesign.css";
import AuthBrandingSection from "./AuthBrandingSection";
import SecurityBadge from "./SecurityBadge";

function ForgetPassword() {
  let { companySlug: companySlugTemp } = useParams();
  const companySlug = localStorage.getItem("companyDomain") || companySlugTemp;
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.forgetPasswordV2,
        body: { ...values, companySlug },
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
    <div className="taskhub-login-page">
      <Row className="login-container-row">
        {/* Left Side - Branding Section (same as login) */}
        <Col xs={24} lg={14} className="login-branding-section">
          <AuthBrandingSection />
        </Col>

        {/* Right Side - Form Section */}
        <Col xs={24} lg={10} className="login-form-section">
          <div className="form-content">
            <div className="form-card">
              <Form
                form={form}
                name="basic"
                layout="vertical"
                onFinish={handleSubmit}
                className="login-form-wrapper"
              >
                <div className="form-header">
                  <h2>Forgot password?</h2>
                  <p>Enter your email and we'll send you a reset link</p>
                </div>

                <div className="form-fields">
                  <div className="field-group">
                    <label>Email address</label>
                    <Form.Item
                      name="email"
                      rules={[
                        {
                          type: "email",
                          message: "The input is not valid E-mail!",
                        },
                        {
                          required: true,
                          message: "Please input your E-mail!",
                        },
                      ]}
                    >
                      <Input
                        type="email"
                        size="large"
                        placeholder="Enter your email"
                        prefix={<MailOutlined className="input-icon" />}
                      />
                    </Form.Item>
                  </div>
                </div>

                <div className="form-actions">
                  <Form.Item noStyle>
                    <Button
                      type="primary"
                      htmlType="submit"
                      className="btn-signin"
                      loading={loading}
                      disabled={loading}
                    >
                      Send Reset Link <ArrowRightOutlined />
                    </Button>
                  </Form.Item>
                </div>

                <div className="back-to-signin">
                  <Link to="/signin">
                    <ArrowLeftOutlined /> Back to Sign In
                  </Link>
                </div>
              </Form>
            </div>

            <SecurityBadge />
          </div>
        </Col>
      </Row>
    </div>
  );
}

export default ForgetPassword;
