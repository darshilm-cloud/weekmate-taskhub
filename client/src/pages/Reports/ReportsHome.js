import React from "react";
import { useHistory } from "react-router-dom";
import "./ReportsHome.css";

const reportCards = [
  {
    title: "User Wise Report",
    icon: "fi fi-rr-user",
    color: "#5BA4CF",
    halfColor: "rgba(91, 164, 207, 0.25)",
    leafColor: "rgba(91, 164, 207, 0.3)",
    path: "user-wise-report",
  },
  {
    title: "Project Wise Report",
    icon: "fi fi-rr-computer",
    color: "#E07B75",
    halfColor: "rgba(224, 123, 117, 0.25)",
    leafColor: "rgba(224, 123, 117, 0.3)",
    path: "project-runnig-reports",
  },
  {
    title: "Status Wise Report",
    icon: "fi fi-rr-document",
    color: "#C9A93A",
    halfColor: "rgba(201, 169, 58, 0.25)",
    leafColor: "rgba(201, 169, 58, 0.3)",
    path: "status-wise-report",
  },
  {
    title: "User Activity Report",
    icon: "fi fi-rr-paw",
    color: "#C47DB5",
    halfColor: "rgba(196, 125, 181, 0.25)",
    leafColor: "rgba(196, 125, 181, 0.3)",
    path: "user-activity-report",
  },
  {
    title: "User Wise Performance",
    icon: "fi fi-rr-target",
    color: "#43B99A",
    halfColor: "rgba(67, 185, 154, 0.25)",
    leafColor: "rgba(67, 185, 154, 0.3)",
    path: "user-wise-performance",
  },
  {
    title: "Daily Report",
    icon: "fi fi-rr-calendar",
    color: "#5BA4CF",
    halfColor: "rgba(91, 164, 207, 0.25)",
    leafColor: "rgba(91, 164, 207, 0.3)",
    path: "daily-report",
  },
];

const ReportsHome = () => {
  const history = useHistory();
  const companySlug = localStorage.getItem("companyDomain");

  const handleCardClick = (path) => {
    history.push(`/${companySlug}/${path}`);
  };

  return (
    <div className="reports-home">
      <h2 className="reports-home-title">Reports</h2>
      <div className="reports-cards-grid">
        {reportCards.map((card) => (
          <div
            key={card.title}
            className="report-card"
            onClick={() => handleCardClick(card.path)}
          >
            <div
              className="report-card-leaf"
              style={{ background: card.leafColor }}
            />
            <div className="report-card-body">
              <div
                className="report-card-icon-wrapper"
                style={{ borderColor: card.color }}
              >
                <i className={card.icon} style={{ color: card.color }} />
              </div>
              <span className="report-card-title">{card.title}</span>
            </div>
            <div
              className="report-card-half-circle"
              style={{ background: card.halfColor }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReportsHome;
