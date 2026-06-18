import React from 'react';
import { Button, Input, Form, Col } from "antd";
import { Link } from "react-router-dom";
import './ForgotPasswordForm.css';

const ForgotPasswordForm = ({ form, onFinish, loading }) => {
  return (
    <Col xs={24} sm={24} md={24} lg={12} className="forgot-password-section">
      <div className="forgot-password-container">
        <div className="forgot-password-wrapper">
          {/* Header */}
          <div className="forgot-password-header">
            <h1 className="forgot-password-title">Forgot Password?</h1>
            <p className="forgot-password-subtitle">Enter your email to reset your password</p>
          </div>

          {/* Forgot Password Form */}
          <Form
            name="forgot-password"
            className="forgot-password-form"
            form={form}
            onFinish={onFinish}
            layout="vertical"
          >
            {/* Email Field */}
            <Form.Item
              label={<span className="form-label">Email address</span>}
              name="email"
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
            >
              <Input
                type="email"
                placeholder="Enter your email"
                prefix={<span className="login-icon"><i className="fas fa-envelope"></i></span>}
                className="forgot-password-input"
              />
            </Form.Item>

            {/* Helper Text */}
            <p className="helper-text">We'll send you a link to reset your password.</p>

            {/* Submit Button */}
            <Form.Item>
              <Button
                type="primary"
                className="send-reset-button"
                htmlType="submit"
                block
                loading={loading}
              >
                {loading ? "SENDING..." : "SEND RESET LINK"}
              </Button>
            </Form.Item>

            {/* Back to Sign In Link */}
            <div className="back-to-signin">
              <Link to="/signin" className="back-to-signin-link">
                <i className="fas fa-arrow-left"></i> Back to Sign In
              </Link>
            </div>
          </Form>

        </div>
      </div>
          {/* Security Footer */}
          <div className="security-footer">
            <span className="security-icon"><i className="fas fa-shield-alt"></i></span>
            <div className="security-text">
              <p className="security-label">Enterprise-grade security</p>
              <p className="security-description">Your data is safe with us.</p>
            </div>
          </div>
    </Col>
  );
};

export default ForgotPasswordForm;
