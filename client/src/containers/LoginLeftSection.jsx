import React from 'react';
import { CheckCircleFilled, TeamOutlined, AimOutlined, BarChartOutlined, StarFilled } from "@ant-design/icons";
import './LoginLeftSection.css';
import HeaderLogo from '../assets/icons/headerlogo';
import { Col } from 'antd';
// import WeekmateDashboard from '../assets/images/weekmateHrmsDashboard.png';

const LoginLeftSection = () => {
  return (
    <Col
      xs={0}
      sm={0}
      md={0}
      lg={12}
      className="login-branding-section"
    >
      <div className="branding-content">
        <div className="logo-container">
          <HeaderLogo />
        </div>

        <div className="auth-features-wrapper">
          <div className="auth-text-content">
            <h1 className="auth-title">
              Stay aligned.<br />
              <span className="text-primary">Deliver</span> more.
            </h1>
            <p className="auth-subtitle">
              Track weekly goals, team progress,<br />
              and productivity from one place.
            </p>

            <div className="auth-feature-list">
              <div className="feature-item">
                <div className="feature-icon icon-blue"><CheckCircleFilled /></div>
                <div className="feature-text">
                  <h4>Weekly Planning</h4>
                  <p>Plan tasks and set weekly goals</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon icon-green"><TeamOutlined /></div>
                <div className="feature-text">
                  <h4>Team Analytics</h4>
                  <p>Measure performance and progress</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon icon-purple"><AimOutlined /></div>
                <div className="feature-text">
                  <h4>Goal Tracking</h4>
                  <p>Stay focused and hit your targets</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon icon-yellow"><BarChartOutlined /></div>
                <div className="feature-text">
                  <h4>Performance Reports</h4>
                  <p>Get insights and make data-driven decisions</p>
                </div>
              </div>
            </div>

            <div className="auth-trusted-section">
              <div className="trusted-avatars">
                <div className="avatar-circle bg-gray"></div>
                <div className="avatar-circle bg-gray"></div>
                <div className="avatar-circle bg-gray"></div>
              </div>
              <div className="trusted-text">
                <span className="trusted-label">Trusted by 1,000+ teams</span>
                <div className="trusted-stars">
                  <StarFilled className="star" /><StarFilled className="star" /><StarFilled className="star" /><StarFilled className="star" /><StarFilled className="star" /> <span className="rating">4.9/5</span>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-dashboard-image">
            {/* <img src={WeekmateDashboard} alt="Weekmate Dashboard Preview" /> */}
          </div>
        </div>
      </div>
    </Col>
  );
};

export default LoginLeftSection;
