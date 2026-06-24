import React from "react";
import { LockOutlined } from "@ant-design/icons";

const SecurityBadge = () => {
  return (
    <div className="security-badge">
      <LockOutlined className="security-icon" />
      <div className="security-text">
        <strong>Enterprise-grade security</strong>
        <p>Your data is safe with us.</p>
      </div>
    </div>
  );
};

export default SecurityBadge;
