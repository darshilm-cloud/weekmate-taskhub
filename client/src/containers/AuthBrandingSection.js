import React from "react";
import {
  ProjectOutlined,
  ClockCircleOutlined,
  FieldTimeOutlined,
  DashboardOutlined,
} from "@ant-design/icons";
import WeekmateSvglogo from "../assets/images/Weekmatelogo";
import TaskHubImage from "../assets/images/taskhub-product.svg";
import DashboardImage from "../assets/images/login-dashboard.png";

// Brand blue — same as the Sign In button, used for logo + feature cards.
const BRAND_BLUE = "#0077bd";

// Product-focused feature list — TaskHub capabilities (not other products).
const FEATURES = [
  {
    icon: <ProjectOutlined />,
    title: "Project & Task Tracking",
    text: "Break projects into subtasks with clear owners",
  },
  {
    icon: <ClockCircleOutlined />,
    title: "Deadline Tracking",
    text: "AI-driven reminders keep every milestone on track",
  },
  {
    icon: <FieldTimeOutlined />,
    title: "Timesheets & Billing",
    text: "Track billable hours and invoice straight from logs",
  },
  {
    icon: <DashboardOutlined />,
    title: "Live Dashboards",
    text: "See project health, bottlenecks, and team load in real time",
  },
];

const AuthBrandingSection = () => {
  return (
    <div className="branding-content">
      <div className="logo-container">
        <WeekmateSvglogo />
      </div>

      <div className="auth-features-wrapper">
        <div className="auth-text-content">
          {/* Lead with the TaskHub product badge */}
          <div className="auth-product-badge">
            <div className="product-logo" style={{ background: BRAND_BLUE }}>
              <img src={TaskHubImage} alt="TaskHub" />
            </div>
            <span className="product-name">TaskHub</span>
          </div>

          <h1 className="auth-title">
            Plan the work,<br />
            <span className="text-primary">Deliver</span> on time
          </h1>
          <p className="auth-subtitle">
            Design, track, and ship multi-level projects with full
            accountability and zero chaos.
          </p>

          <div className="auth-feature-list">
            {FEATURES.map((feature) => (
              <div className="feature-item" key={feature.title}>
                <div
                  className="feature-logo"
                  style={{ background: BRAND_BLUE }}
                >
                  {feature.icon}
                </div>
                <div className="feature-text">
                  <h4>{feature.title}</h4>
                  <p>{feature.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="auth-dashboard-image">
          <img src={DashboardImage} alt="TaskHub Dashboard Preview" />
        </div>
      </div>
    </div>
  );
};

export default AuthBrandingSection;
