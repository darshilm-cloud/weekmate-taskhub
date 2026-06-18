import React from 'react';
import { Button, Input, Form, Row, Col, Checkbox } from "antd";
import { Link } from "react-router-dom";
import './LoginRightSection.css';

const LoginRightSection = ({ form, onFinish, onFinishFailed, companyTitle, loading }) => {
  return (
    <Col xs={24} sm={24} md={24} lg={12} className="login-right-section">
      <div className="login-form-container">
        <div className="login-form-wrapper">
          {/* Welcome Header */}
          <div className="welcome-header">
            <h1 className="welcome-title">Welcome back! 👋</h1>
            <p className="welcome-subtitle">Sign in to continue to WeekMate</p>
          </div>

          {/* Login Form */}
          <Form
            name="signin"
            className="login-form"
            onFinishFailed={onFinishFailed}
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
                className="login-input"
              />
            </Form.Item>

            {/* Password Field */}
            <Form.Item
              label={<span className="form-label">Password</span>}
              name="password"
              rules={[
                {
                  required: true,
                  message: "Please enter your password!",
                },
              ]}
            >
              <Input.Password
                placeholder="Enter your password"
                prefix={<span className="login-icon"><i className="fas fa-lock"></i></span>}
                className="login-input"
              />
            </Form.Item>

            {/* Remember Me & Forgot Password */}
            <div className="form-footer-row">
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox className="remember-checkbox">Remember me</Checkbox>
              </Form.Item>
              <Link to="/forgot-password" className="forgot-password-link">
                Forgot password?
              </Link>
            </div>

            {/* Sign In Button */}
            <Form.Item>
              <Button
                type="primary"
                className="signin-button"
                htmlType="submit"
                block
                loading={loading}
              >
                SIGN IN
              </Button>
            </Form.Item>

            {/* Sign Up Link */}
            <div className="signup-section">
              Don't have an account?{' '}
              <Link to="/register-company" className="signup-link">
                Sign up
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

export default LoginRightSection;
