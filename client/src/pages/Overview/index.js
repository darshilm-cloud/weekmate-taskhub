import React from "react";
import { Table, Modal, Select, Radio, Checkbox } from "antd";
import ReactApexChart from "react-apexcharts";
import OverviewController from "./OverviewController";
import { useSelector } from "react-redux";
import "./OverviewStyle.css";
import moment from "moment";
import { hasPermission } from "../../util/hasPermission";
import MyAvatarGroup from "../../components/AvatarGroup/MyAvatarGroup";
import { Link } from "react-router-dom/cjs/react-router-dom";
import { removeTitle } from "../../util/nameFilter";
import MyAvatar from "../../components/Avatar/MyAvatar";

const Overview = () => {
  const companySlug = localStorage.getItem("companyDomain");
  const {
    convertTimeToHours,
    goToEditProjectPage,
    priorityAnalysis,
    userAnalysis,
    statusAnalysis,
    allTasks
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
              formatter: () => priorityAnalysis.total.toString()
            }
          }
        }
      }
    }
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
              formatter: () => statusAnalysis.total.toString()
            }
          }
        }
      }
    }
  };

  const userAnalysisOptions = {
    chart: { type: "bar", stacked: true, toolbar: { show: false } },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '40%',
      }
    },
    colors: ["#35C03B", "#EF4444"],
    xaxis: {
      categories: userAnalysis.length > 0 ? userAnalysis.map(u => u.name) : ["No Data"],
      labels: { formatter: (val) => `${val}%` }
    },
    legend: { position: "top", horizontalAlign: "left" }
  };

  const userAnalysisSeries = [
    {
      name: "Closed Tasks",
      data: userAnalysis.length > 0 ? userAnalysis.map(u => {
        const total = u.closed + u.incomplete;
        return total === 0 ? 0 : Math.round((u.closed / total) * 100);
      }) : [0]
    },
    {
      name: "Incomplete Tasks",
      data: userAnalysis.length > 0 ? userAnalysis.map(u => {
        const total = u.closed + u.incomplete;
        return total === 0 ? 0 : Math.round((u.incomplete / total) * 100);
      }) : [0]
    }
  ];

  const formattedTitle = projectOverviewData?.title?.replace(
    /(?:^|\s)([a-z])/g,
    (match, group1) => match.charAt(0) + group1.toUpperCase()
  );

  const startDate = projectOverviewData?.start_date ? moment(projectOverviewData.start_date).format("DD/MM/YYYY") : "N/A";
  const endDate = projectOverviewData?.end_date ? moment(projectOverviewData.end_date).format("DD/MM/YYYY") : "N/A";

  const getFilteredMembers = () => {
    if (memberTab === "Staff member") return projectOverviewData?.assignees || [];
    if (memberTab === "Project Manager") return projectOverviewData?.manager ? [projectOverviewData.manager] : [];
    if (memberTab === "Co-member") return []; // Logic for co-members if any
    if (memberTab === "Client") return projectOverviewData?.pms_clients || [];
    return [];
  };

  return (
    <div className="new-project-overview">
      <div className="overview-grid">
        {/* Date Range Card */}
        <div className="overview-card date-range-card">
          <div className="date-item">
            <span className="date-label">Starts</span>
            <div className="date-value">{startDate}</div>
          </div>
          <div className="date-arrow"><i className="fi fi-rr-arrow-right"></i></div>
          <div className="date-item">
            <span className="date-label">Ends</span>
            <div className="date-value">{endDate}</div>
            <div style={{ marginTop: 8 }}>
              <Checkbox checked={!projectOverviewData?.end_date}>No End Date</Checkbox>
            </div>
          </div>
        </div>

        {/* Priority Analysis Card */}
        <div className="overview-card priority-analysis">
          <div className="analysis-header">
            <span className="analysis-title">Priority Analysis</span>
            <div className="priority-legend">
              <div className="legend-item"><span className="legend-dot priority-low"></span> Low <b>{priorityAnalysis.low}</b></div>
              <div className="legend-item"><span className="legend-dot priority-medium"></span> Medium <b>{priorityAnalysis.medium}</b></div>
              <div className="legend-item"><span className="legend-dot priority-high"></span> High <b>{priorityAnalysis.high}</b></div>
            </div>
          </div>
          <div className="chart-container">
            <ReactApexChart
              options={priorityChartOptions}
              series={[priorityAnalysis.low, priorityAnalysis.medium, priorityAnalysis.high]}
              type="donut"
              width={250}
            />
          </div>
        </div>
      </div>

      {/* User Analysis Card */}
      <div className="overview-card">
        <div className="analysis-header">
          <span className="analysis-title">User Analysis</span>
        </div>
        <div className="user-analysis-chart">
          <ReactApexChart
            options={userAnalysisOptions}
            series={userAnalysisSeries}
            type="bar"
            height={Math.max(200, userAnalysis.length * 60)}
          />
        </div>
      </div>

      {/* Status Analysis Card */}
      <div className="overview-card">
        <div className="analysis-header">
          <span className="analysis-title">Status Analysis</span>
          <div className="priority-legend">
            <div className="legend-item"><span className="legend-dot" style={{ backgroundColor: "#35C03B" }}></span> Closed <b>{statusAnalysis.closed}</b></div>
            <div className="legend-item"><span className="legend-dot" style={{ backgroundColor: "#FBBF24" }}></span> Pending <b>{statusAnalysis.pending}</b></div>
          </div>
        </div>
        <div className="chart-container">
          <ReactApexChart
            options={statusChartOptions}
            series={[statusAnalysis.closed, statusAnalysis.pending]}
            type="donut"
            width={250}
          />
        </div>
      </div>

      {/* Project Members Section */}
      <div className="overview-card">
        <div className="members-section">
          <h3>Project Members ({(projectOverviewData?.assignees?.length || 0) + (projectOverviewData?.pms_clients?.length || 0) + (projectOverviewData?.manager ? 1 : 0)})</h3>
          <div className="members-tabs">
            <Radio.Group value={memberTab} onChange={(e) => setMemberTab(e.target.value)}>
              <Radio.Button value="Staff member">Staff member ({projectOverviewData?.assignees?.length || 0})</Radio.Button>
              <Radio.Button value="Project Manager">Project Manager ({projectOverviewData?.manager ? 1 : 0})</Radio.Button>
              <Radio.Button value="Co-member">Co-member (0)</Radio.Button>
              <Radio.Button value="Client">Client ({projectOverviewData?.pms_clients?.length || 0})</Radio.Button>
            </Radio.Group>
          </div>
          <div className="members-list">
            {getFilteredMembers().map((member) => (
              <div className="member-item" key={member._id}>
                <MyAvatar
                  src={member.emp_img || member.client_img}
                  alt={member.name || member.full_name}
                  userName={member.name || member.full_name}
                />
                <div className="member-info">
                  <span className="member-name">{removeTitle(member.name || member.full_name)}</span>
                  <span className="member-role">{memberTab}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Details Card */}
      <div className="overview-card details-card">
        <h3 onClick={goToEditProjectPage} style={{ cursor: "pointer" }}>
          Details <i className="fi fi-rr-pencil"></i>
        </h3>
        <div className="details-content">
          {projectOverviewData?.descriptions || "No details provided for this project."}
        </div>
      </div>
    </div>
  );
};

export default Overview;
