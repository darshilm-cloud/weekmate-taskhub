import React from "react";
import { useSelector } from "react-redux";
import {
  IdcardOutlined,
  BankOutlined,
  FolderOutlined,
  CheckSquareOutlined,
} from "@ant-design/icons";
import "./WelcomeBanner.css";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const WelcomeBanner = ({ totalProjects, totalTask }) => {
  const { authUser } = useSelector(({ auth }) => auth);

  const fullName =
    authUser?.full_name ||
    [authUser?.first_name, authUser?.last_name].filter(Boolean).join(" ") ||
    "there";

  const roleName = authUser?.pms_role_id?.role_name;
  const companyName = authUser?.companyDetails?.companyName;

  return (
    <div className="tb-welcome-banner-container">
      <div className="tb-welcome-banner">
        <div className="tb-watermark-m"></div>

        <div className="tb-banner-content">
          <div className="tb-banner-header">
            <h1 className="tb-greeting-text">
              {getGreeting()}, {fullName} !
            </h1>
            <div className="tb-contact-info">
              {authUser?.email && (
                <span className="tb-contact-item">{authUser.email}</span>
              )}
              {authUser?.email && authUser?.phone_number && (
                <span className="tb-separator">|</span>
              )}
              {authUser?.phone_number && (
                <span className="tb-contact-item">{authUser.phone_number}</span>
              )}
            </div>
          </div>

          <div className="tb-banner-footer">
            <div className="tb-info-item">
              <span className="tb-info-icon">
                <IdcardOutlined />
              </span>
              <span className="tb-info-text">{roleName || "N/A"}</span>
            </div>
            <div className="tb-info-item">
              <span className="tb-info-icon">
                <BankOutlined />
              </span>
              <span className="tb-info-text">{companyName || "N/A"}</span>
            </div>
            {/* <div className="tb-info-item">
              <span className="tb-info-icon">
                <FolderOutlined />
              </span>
              <span className="tb-info-text">{totalProjects ?? 0} Projects</span>
            </div>
            <div className="tb-info-item">
              <span className="tb-info-icon">
                <CheckSquareOutlined />
              </span>
              <span className="tb-info-text">{totalTask ?? 0} Tasks</span>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeBanner;
