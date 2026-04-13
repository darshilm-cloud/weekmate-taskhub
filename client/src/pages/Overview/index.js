/* eslint-disable no-unused-vars */
import React from "react";
import { Checkbox } from "antd";
import ReactApexChart from "react-apexcharts";
import OverviewController from "./OverviewController";
import { useSelector } from "react-redux";
import "./OverviewStyle.css";
import moment from "moment";
import { removeTitle } from "../../util/nameFilter";
import MyAvatar from "../../components/Avatar/MyAvatar";
import { OverviewSkeleton } from "../../components/common/SkeletonLoader";

const Overview = () => {
  const {
    goToEditProjectPage,
    priorityAnalysis,
    userAnalysis,
    statusAnalysis,
    pageLoading,
  } = OverviewController();

  const { projectOverviewData } = useSelector((state) => state.apiData);
  const [memberTab, setMemberTab] = React.useState("Staff member");

  const priorityChartOptions = {
    chart: { type: "donut" },
    labels: ["Low", "Medium", "High"],
    colors: ["#35c03b", "#3b82f6", "#ef4444"],
    legend: { show: false },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          labels: {
            show: true,
            total: {
              show: true,
              label: "Tasks",
              formatter: () => priorityAnalysis.total.toString(),
            },
          },
        },
      },
    },
  };

  const statusChartOptions = {
    chart: { type: "donut" },
    labels: ["Closed", "Pending"],
    colors: ["#35C03B", "#FBBF24"],
    legend: { show: false },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          labels: {
            show: true,
            total: {
              show: true,
              label: "Tasks",
              formatter: () => statusAnalysis.total.toString(),
            },
          },
        },
      },
    },
  };

  const sortedUserAnalysis = [...userAnalysis]
    .map((user) => {
      const total = user.closed + user.incomplete;
      const completionRate = total === 0 ? 0 : Math.round((user.closed / total) * 100);
      return { ...user, total, completionRate };
    })
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return b.completionRate - a.completionRate;
    });

  const totalAssignedTasks = sortedUserAnalysis.reduce((sum, user) => sum + user.total, 0);
  const totalClosedTasks = sortedUserAnalysis.reduce((sum, user) => sum + user.closed, 0);
  const averageCompletionRate =
    sortedUserAnalysis.length > 0
      ? Math.round(
          sortedUserAnalysis.reduce((sum, user) => sum + user.completionRate, 0) /
            sortedUserAnalysis.length
        )
      : 0;

  const startDate = projectOverviewData?.start_date
    ? moment(projectOverviewData.start_date).format("DD/MM/YYYY")
    : "N/A";
  const endDate = projectOverviewData?.end_date
    ? moment(projectOverviewData.end_date).format("DD/MM/YYYY")
    : "N/A";

  const memberTabConfig = [
    {
      key: "Staff member",
      label: "Staff",
      count: projectOverviewData?.assignees?.length || 0,
    },
    {
      key: "Project Manager",
      label: "Manager",
      count: projectOverviewData?.manager ? 1 : 0,
    },
    { key: "Co-member", label: "Co-member", count: 0 },
    {
      key: "Client",
      label: "Client",
      count: projectOverviewData?.pms_clients?.length || 0,
    },
  ];

  const totalMembers =
    (projectOverviewData?.assignees?.length || 0) +
    (projectOverviewData?.pms_clients?.length || 0) +
    (projectOverviewData?.manager ? 1 : 0);

  const getFilteredMembers = () => {
    if (memberTab === "Staff member") return projectOverviewData?.assignees || [];
    if (memberTab === "Project Manager")
      return projectOverviewData?.manager ? [projectOverviewData.manager] : [];
    if (memberTab === "Client") return projectOverviewData?.pms_clients || [];
    return [];
  };

  if (pageLoading) return <OverviewSkeleton />;

  return (
    <div className="new-project-overview">
      {/* ── Top Row: Timeline | Priority | Status ── */}
      <div className="overview-top-row">
        {/* Timeline Card */}
        <div className="overview-card">
          <div className="card-header">
            <span className="card-icon-wrap date-icon">
              <i className="fi fi-rr-calendar"></i>
            </span>
            <span className="card-title">Timeline</span>
          </div>
          <div className="date-timeline">
            <div className="date-block">
              <span className="date-lbl">Start Date</span>
              <span className="date-val">{startDate}</span>
            </div>
            <div className="date-divider">
              <div className="date-line"></div>
              <i className="fi fi-rr-arrow-right date-arrow-icon"></i>
            </div>
            <div className="date-block">
              <span className="date-lbl">End Date</span>
              <span className="date-val">{endDate}</span>
              {!projectOverviewData?.end_date && (
                <span className="no-end-badge">No End Date</span>
              )}
            </div>
          </div>
        </div>

        {/* Priority Analysis Card */}
        <div className="overview-card chart-card">
          <div className="card-header">
            <span className="card-icon-wrap priority-icon">
              <i className="fi fi-rr-flag"></i>
            </span>
            <span className="card-title">Priority Analysis</span>
          </div>
          <div className="chart-body">
            <ReactApexChart
              options={priorityChartOptions}
              series={[
                priorityAnalysis.low,
                priorityAnalysis.medium,
                priorityAnalysis.high,
              ]}
              type="donut"
              width={180}
            />
            <div className="chart-legend-vertical">
              <div className="legend-pill low">
                <span className="pill-dot"></span>
                <span>Low</span>
                <b>{priorityAnalysis.low}</b>
              </div>
              <div className="legend-pill medium">
                <span className="pill-dot"></span>
                <span>Medium</span>
                <b>{priorityAnalysis.medium}</b>
              </div>
              <div className="legend-pill high">
                <span className="pill-dot"></span>
                <span>High</span>
                <b>{priorityAnalysis.high}</b>
              </div>
            </div>
          </div>
        </div>

        {/* Status Analysis Card */}
        <div className="overview-card chart-card">
          <div className="card-header">
            <span className="card-icon-wrap status-icon">
              <i className="fi fi-rr-chart-pie-alt"></i>
            </span>
            <span className="card-title">Status Analysis</span>
          </div>
          <div className="chart-body">
            <ReactApexChart
              options={statusChartOptions}
              series={[statusAnalysis.closed, statusAnalysis.pending]}
              type="donut"
              width={180}
            />
            <div className="chart-legend-vertical">
              <div className="legend-pill closed">
                <span className="pill-dot"></span>
                <span>Closed</span>
                <b>{statusAnalysis.closed}</b>
              </div>
              <div className="legend-pill pending">
                <span className="pill-dot"></span>
                <span>Pending</span>
                <b>{statusAnalysis.pending}</b>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── User Analysis (full width) ── */}
      <div className="overview-card">
        <div className="card-header">
          <span className="card-icon-wrap user-icon">
            <i className="fi fi-rr-users"></i>
          </span>
          <span className="card-title">User Analysis</span>
        </div>
        <div className="user-analysis-summary">
          <div className="user-summary-chip">
            <span className="user-summary-label">Members</span>
            <strong>{sortedUserAnalysis.length}</strong>
          </div>
          <div className="user-summary-chip">
            <span className="user-summary-label">Assigned Tasks</span>
            <strong>{totalAssignedTasks}</strong>
          </div>
          <div className="user-summary-chip">
            <span className="user-summary-label">Closed Tasks</span>
            <strong>{totalClosedTasks}</strong>
          </div>
          <div className="user-summary-chip accent">
            <span className="user-summary-label">Avg. Completion</span>
            <strong>{averageCompletionRate}%</strong>
          </div>
        </div>
        <div className="user-analysis-list">
          <div className="user-analysis-list-head">
            <span>Member</span>
            <span>Workload</span>
            <span>Completion</span>
          </div>
          {sortedUserAnalysis.length === 0 ? (
            <div className="user-analysis-empty">No user data available</div>
          ) : (
            sortedUserAnalysis.map((user, index) => (
              <div className="user-analysis-row" key={`${user.name}-${index}`}>
                <div className="user-analysis-person">
                  <span className="user-rank-badge">{index + 1}</span>
                  <div className="user-analysis-meta">
                    <span className="user-analysis-name">{user.name}</span>
                    <span className="user-analysis-subtext">
                      {user.closed} closed · {user.incomplete} incomplete
                    </span>
                  </div>
                </div>
                <div className="user-workload-metric">
                  <strong>{user.total}</strong>
                  <span>tasks</span>
                </div>
                <div className="user-analysis-progress">
                  <div className="user-analysis-progress-top">
                    <span>{user.completionRate}% completed</span>
                  </div>
                  <div className="user-analysis-track">
                    <div
                      className="user-analysis-bar closed"
                      style={{ width: `${user.completionRate}%` }}
                    />
                    <div
                      className="user-analysis-bar incomplete"
                      style={{ width: `${100 - user.completionRate}%` }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Bottom Row: Members | Details ── */}
      <div className="overview-bottom-row">
        {/* Project Members */}
        <div className="overview-card">
          <div className="card-header">
            <span className="card-icon-wrap members-icon">
              <i className="fi fi-rr-users-alt"></i>
            </span>
            <span className="card-title">Project Members</span>
            <span className="members-count-badge">{totalMembers}</span>
          </div>
          <div className="member-tabs">
            {memberTabConfig.map((tab) => (
              <button
                key={tab.key}
                className={`member-tab-btn ${memberTab === tab.key ? "active" : ""}`}
                onClick={() => setMemberTab(tab.key)}
              >
                {tab.label}
                <span className="tab-count">{tab.count}</span>
              </button>
            ))}
          </div>
          <div className="members-grid">
            {getFilteredMembers().length === 0 ? (
              <div className="no-members">No members in this category</div>
            ) : (
              getFilteredMembers().map((member) => (
                <div className="member-card" key={member._id}>
                  <MyAvatar
                    src={member.emp_img || member.client_img}
                    alt={member.name || member.full_name || `${member.first_name || ''} ${member.last_name || ''}`.trim()}
                    userName={member.name || member.full_name || `${member.first_name || ''} ${member.last_name || ''}`.trim()}
                  />
                  <div className="member-details">
                    <span className="member-name">
                      {removeTitle(member.name || member.full_name || `${member.first_name || ''} ${member.last_name || ''}`.trim())}
                    </span>
                    <span className="member-role-badge">{memberTab}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Details */}
        <div className="overview-card">
          <div className="card-header">
            <span className="card-icon-wrap details-icon">
              <i className="fi fi-rr-document"></i>
            </span>
            <span className="card-title">Details</span>
          </div>
          <div className="details-body">
            {projectOverviewData?.descriptions ? (
              <div dangerouslySetInnerHTML={{ __html: projectOverviewData.descriptions }} />
            ) : (
              "No details provided for this project."
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
