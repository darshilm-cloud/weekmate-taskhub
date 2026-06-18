import React, { useState } from "react";
import { message, Form, Row } from "antd";
import Service from "../service";
import { useParams } from "react-router-dom";
import LoginLeftSection from "./LoginLeftSection";
import ForgotPasswordForm from "./ForgotPasswordForm";
import "./signinstyle.css";

function ForgetPassword() {
  let { companySlug: companySlugTemp } = useParams();
  const companySlug = localStorage.getItem("companyDomain") || companySlugTemp;
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleSubmit = async values => {
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

  const onFinishFailed = (errorInfo) => {
    console.log("Failed:", errorInfo);
  };

  return (
    <div className="gx-app-login-wrap gx-app-login-new-design">
      <div className="gx-app-login-container">
        <Row className="gx-app-login-main-content" style={{ margin: 0 }}>
          <LoginLeftSection />
          <ForgotPasswordForm
            form={form}
            onFinish={handleSubmit}
            onFinishFailed={onFinishFailed}
            loading={loading}
          />
        </Row>
      </div>
    </div>
  );
}

export default ForgetPassword;
