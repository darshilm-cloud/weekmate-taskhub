import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Table,
  Button,
  Select,
  DatePicker,
  Input,
  Modal,
  Card,
  Tag,
  Progress,
  Tooltip,
  Avatar,
  Space,
  Typography,
  Row,
  Col,
  Drawer,
  Pagination,
  Form,
  Flex
} from "antd";
import {
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiCalendar,
  FiPlay,
  FiPause,
  FiXCircle,
  FiTarget,
  FiTrendingUp,
  FiUser,
  FiBarChart3,
  FiBarChart2
} from "react-icons/fi";
import {
  FilterOutlined,
  ExportOutlined,
  UserOutlined,
  ProjectOutlined,
  PlusOutlined,
  DownOutlined,
  UpOutlined,
  MoreOutlined,
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
  CalendarOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import { IoMdTime } from "react-icons/io";
import _ from "lodash";
import "./ResourceMatrix.css";
import ResourceMatrixFilter from "./ResourceMatrixFilter";
import { hasPermission } from "../../util/hasPermission";
import Service from "../../service";
import { BsExclamationLg } from "react-icons/bs";
const { Title, Text } = Typography;

const ASSIGNED_DAY_HOURS = 8.5;
const projectTagColors = [
  "blue",
  "green",
  "orange",
  "purple",
  "magenta",
  "cyan",
  "volcano",
  "gold"
];

const ResourceMatrix = () => {
  const [backendData, setBackendData] = useState([]);
  const [expandedRows, setExpandedRows] = useState([]);
  const [currentFilters, setCurrentFilters] = useState({});
  const [currentSkipFilters, setCurrentSkipFilters] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 30
  });
  const [metadata, setMetadata] = useState({});
  const [isMatrixLoading, setIsMatrixLoading] = useState(false);
  const [projectModalVisible, setProjectModalVisible] = useState(false);
  const [selectedProjectForModal, setSelectedProjectForModal] = useState(null);
  const [employeeSearch, setEmployeeSearch] = useState("");

  const [viewMode, setViewMode] = useState("Month");
  const [dateRange, setDateRange] = React.useState(() => {
    const start = dayjs();
    let end;
    // Default viewMode could be 'Weeks'
    const defaultViewMode = "Month";

    if (defaultViewMode === "Weeks") {
      end = start.endOf("week");
    } else if (defaultViewMode === "Month") {
      end = start.endOf("month");
    } else {
      end = start;
    }
    return [start, end];
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalType, setModalType] = useState("employee");
  const [editingItem, setEditingItem] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectDetailsModal, setProjectDetailsModal] = useState(false);
  const [form] = Form.useForm();

  const handleEmployeeSearch = (value) => {
    // Run getMatrixDetails when the user presses Enter or clicks the search icon
    getMatrixDetails(value);
  };

  // 1. Update dateRange based on viewMode only
  useEffect(() => {
    const start = dayjs();
    let end;
    if (viewMode === "Weeks") {
      end = start.endOf("week");
    } else if (viewMode === "Month") {
      end = start.endOf("month");
    } else {
      end = start;
    }
    setDateRange([start, end]);
  }, [viewMode]);

  // 2. Call getMatrixDetails whenever dateRange, filters, or pagination change
  useEffect(() => {
    if (!dateRange[0] || !dateRange[1]) return; // avoid calling if not set yet
    getMatrixDetails();
  }, [dateRange, currentFilters, pagination]);

  const getMatrixDetails = async (searchVal = employeeSearch) => {
    try {
      setIsMatrixLoading(true);
      const reqBody = {
        pageNo: pagination.current,
        limit: pagination.pageSize,
        startDate: dateRange[0].format("DD-MM-YYYY"),
        endDate: dateRange[1].format("DD-MM-YYYY")
      };

      if (currentFilters?.technology?.length > 0) {
        reqBody.technology = currentFilters.technology;
      }
      if (currentFilters?.assignees?.length > 0) {
        reqBody.assignees = currentFilters.assignees;
      }
      if (searchVal && searchVal.length > 0) {
        reqBody.search = searchVal;
      }

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getResourceMatrix,
        body: reqBody
      });
      if (response?.data?.status) {
        setBackendData(response.data.data);
        setMetadata(response.data.metadata);
        setIsMatrixLoading(false);
      }
      setIsMatrixLoading(false);
    } catch (error) {
      console.log(error);
      setIsMatrixLoading(false);
    }
  };

  const handleFilterChange = (skipFilters = [], filterStats = {}) => {
    setCurrentFilters(filterStats);
    setCurrentSkipFilters(skipFilters);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const getDayStatusCell = (days, dateKey) => {
    const day = days?.find((d) => d.date === dateKey);
    const planned = day?.planned ?? 0;

    if (planned === 0) {
      return (
        <div className="rm-day-cell rm-not-booked">
          <BsExclamationLg style={{ color: "#DC2626", fontSize: "20px" }} />
        </div>
      );
    }
    if (planned < ASSIGNED_DAY_HOURS) {
      return (
        <div className="rm-day-cell rm-partial-booked">
          <span style={{ color: "#DC2626", fontWeight: "bold" }}>
            {planned}h
          </span>
        </div>
      );
    }
    // planned >= 8.5 hours
    return (
      <div className="rm-day-cell rm-fully-booked">
        <CheckOutlined style={{ color: "#16A34A" }} />
      </div>
    );
  };

  const useDateColumns = (viewMode) => {
    const generateDateColumns = useCallback(() => {
      // ... your date columns generation logic ...
      const columns = [];
      let current = dayjs();

      const end =
        viewMode === "Weeks"
          ? current.endOf("week")
          : viewMode === "Month"
          ? current.endOf("month")
          : current;

      while (current.isBefore(end) || current.isSame(end, "day")) {
        const dateKey = current.format("DD-MM-YYYY");
        const dayName = current.format("ddd");
        const monthDay = current.format("MMM D");

        columns.push({
          title: (
            <div className="rm-date-header">
              <div className="rm-day-name">{dayName}</div>
              <div className="rm-date-number">{monthDay}</div>
            </div>
          ),
          dataIndex: dateKey,
          key: dateKey,
          width: 70,
          align: "center",
          render: (_, record) => {
            if (record.type === "project") return null;
            // Check if the column is for Saturday or Sunday
            const colDayIndex = dayjs(dateKey).day();
            if (colDayIndex === 0 || colDayIndex === 6) {
              return (
                <div style={{ textAlign: "center" }}>
                  <Tooltip title="Weekoff">
                    <CalendarOutlined
                      style={{ color: "#64748B", fontSize: "16px" }}
                    />
                  </Tooltip>
                </div>
              );
            }
            const empRow = backendData.find(
              (ed) => ed.employee?._id === record.employee?._id
            );
            return getDayStatusCell(empRow?.days ?? [], dateKey);
          }
        });

        current = current.add(1, "day");
      }

      return columns;
    }, [viewMode, backendData]);

    return useMemo(() => generateDateColumns(), [generateDateColumns]);
  };

  const dateColumns = useDateColumns(viewMode);

  const isRowExpanded = (id) => expandedRows.includes(id);
  const toggleRowExpand = (id) => {
    setExpandedRows((rows) =>
      rows.includes(id) ? rows.filter((eid) => eid !== id) : [...rows, id]
    );
  };

  const renderEmployeeRow = (record, hasProjects) => {
    const employee = record.employee;
    const expanded = isRowExpanded(employee._id);

    const expandIcon = hasProjects ? (
      <span
        className="expanded-arrow"
        onClick={() => toggleRowExpand(employee._id)}
      >
        {expanded ? <UpOutlined /> : <DownOutlined />}
      </span>
    ) : null;

    return (
      <div className="rm-employee-cell">
        <Avatar
          size={32}
          src={employee.avatar}
          icon={<UserOutlined />}
          style={{ marginRight: 12 }}
        />
        <div className="rm-employee-info">
          <div className="rm-name-row">
            <span className="rm-employee-name">{employee.name}</span>
            {expandIcon}
          </div>
          {employee.totalHours && (
            <span className="rm-total-hours">
              <IoMdTime />
              {employee.totalHours}
            </span>
          )}
          <div className="rm-employee-role">{employee.role}</div>
        </div>
      </div>
    );
  };

  const getExpandedData = () => {
    const rows = [];
    backendData.forEach((item) => {
      // Employee row
      rows.push({ type: "employee", ...item });

      // If expanded for this employee, add projects rows without date columns
      if (isRowExpanded(item.employee._id)) {
        item.projects.forEach((proj) => {
          rows.push({
            type: "project",
            parentId: item.employee._id,
            key: `${item.employee._id}-project-${proj._id}`,
            name: proj.name,
            hours: proj.hours,
            tasks: proj.tasks,
            details: proj.details
          });
        });
      }
    });
    return rows;
  };

  const handleProjectClick = (projectRecord) => {
    setSelectedProjectForModal(projectRecord);
    setProjectModalVisible(true);
  };

  function getRandomColorForProject(projectId) {
    let hash = 0;
    for (let i = 0; i < projectId.length; i++) {
      hash = projectId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % projectTagColors.length;
    return projectTagColors[index];
  }

  const tableColumns = [
    {
      title: "Employee / Projects",
      dataIndex: "employee",
      key: "employee",
      fixed: "left",
      width: viewMode === "Weeks" ? 120 : 250,
      render: (_, record) => {
        if (record.type === "project") {
          const tagColor = getRandomColorForProject(record._id || record.name);
          // full colSpan across all columns for project detail rows
          return {
            children: (
              <div
                style={{
                  padding: "8px 16px",
                  display: "flex",

                  gap: "10px",
                  alignItems: "center"
                }}
              >
                <Tag
                  color={tagColor}
                  style={{ cursor: "pointer" }}
                  onClick={() => handleProjectClick(record)}
                >
                  {record.name}
                </Tag>
              </div>
            ),
            props: {
              colSpan: dateColumns.length + 1 // span all columns including first
            }
          };
        }
        if (!record.employee) return null;
        const hasProjects =
          Array.isArray(record.projects) && record.projects.length > 0;
        return renderEmployeeRow(record, hasProjects);
      }
    },

    // Other columns (dates)
    ...dateColumns.map((col) => ({
      ...col,
      render: (text, record) => {
        if (record.type === "project") {
          // Hide all cells except first column on project rows
          return {
            children: null,
            props: { colSpan: 0 }
          };
        }
        // For employee rows render normally
        return col.render(text, record);
      }
    }))
  ];

  /*
      The logic above:
      - Always include the first column ("Employee / Projects")
      - Conditionally include date columns only if at least one employee is NOT expanded.
      - If all employees are expanded, date columns are hidden to only show project rows without date columns.
    */

  const rowClassName = (record) =>
    record.type === "project" ? "rm-sub-project-row" : "rm-employee-row";

  const showModal = (type, item = null) => {
    setModalType(type);
    setEditingItem(item || {});
    setIsModalVisible(true);
    if (item) {
      form.setFieldsValue(item);
    } else {
      form.resetFields();
    }
  };

  const HeaderSection = () => (
    <div className="rm-title-section">
      <div className="heading-wrapper">
        <div className="heading-main">
          <h2>Resource Matrix</h2>
        </div>
      </div>
    </div>
  );

  function getProgressColor(logged, estimated) {
    if (estimated === 0) return "gray";
    const percent = (logged / estimated) * 100;
    if (percent < 34) return "red";
    if (percent < 67) return "yellow";
    return "green";
  }

  return (
    <Card className="resource-matrix">
      <HeaderSection />
      <div className="global-search">
        <Input.Search
          allowClear
          placeholder="Search employee name"
          value={employeeSearch}
          onChange={(e) => setEmployeeSearch(e.target.value)}
          style={{ width: 250 }}
          onSearch={handleEmployeeSearch}
        />
        <div className="filter-btn-wrapper">
          {/* Integrated Advanced Filter */}
          <ResourceMatrixFilter
            getRoles={() => hasPermission}
            onFilterChange={handleFilterChange}
          />
          <div className="tab-view-container">
            <span className="tab-view-label">View:</span>
            <div className="tab-view-buttons">
              <button
                className={`tab-view-btn ${
                  viewMode === "Weeks" ? "active" : ""
                }`}
                onClick={() => setViewMode("Weeks")}
              >
                Weeks
              </button>
              <button
                className={`tab-view-btn ${
                  viewMode === "Month" ? "active" : ""
                }`}
                onClick={() => setViewMode("Month")}
              >
                Month
              </button>
            </div>
          </div>
          {/* <Button icon={<ExportOutlined />} className="export-btn">
            Export
          </Button> */}
        </div>
      </div>
      <div className="rm-table-container">
        <Table
          columns={tableColumns}
          dataSource={getExpandedData()}
          rowKey={(record) =>
            record.type === "project" ? record.key : record.employee?._id
          }
          scroll={{ x: 1200, y: 550 }}
          pagination={false}
          className="rm-resource-table"
          rowClassName={rowClassName}
          showHeader={true}
          loading={isMatrixLoading}
        />
      </div>
      <div className="rm-pagination-container">
        <div className="rm-pagination-info">
          Showing {backendData.length} of {metadata.totalEmployees} employees
        </div>
        <Pagination
          current={pagination.current}
          pageSize={pagination.pageSize}
          total={metadata.totalEmployees}
          showSizeChanger={true} // Allow user to change page size
          showQuickJumper={true} // Optional: show jumper to jump to page
          className="rm-pagination"
          onChange={(page, size) => {
            setPagination((prev) => ({
              ...prev,
              current: page,
              pageSize: size
            }));
          }}
          onShowSizeChange={(current, size) => {
            setPagination((prev) => ({
              ...prev,
              current: current,
              pageSize: size
            }));
          }}
          pageSizeOptions={["10", "20", "30", "50"]} // Optional: user selectable page sizes
          itemRender={(page, type, element) => {
            if (type === "prev") return <span>❮</span>;
            if (type === "next") return <span>❯</span>;
            return element;
          }}
        />
      </div>

      <div className="rm-mobile-actions">
        <Button
          type="primary"
          shape="circle"
          icon={<PlusOutlined />}
          size="large"
          className="rm-mobile-add-btn"
          onClick={() => showModal("employee")}
        />
      </div>

      <Modal
        title={
          <>
            <span className="project-name">
              {selectedProjectForModal?.name}
            </span>
          </>
        }
        open={projectModalVisible}
        onCancel={() => setProjectModalVisible(false)}
        footer={[
          <Button
            className="delete-btn"
            key="close"
            onClick={() => setProjectModalVisible(false)}
          >
            Close
          </Button>
        ]}
        centered
        width={900}
      >
        {selectedProjectForModal && (
          <div className="project-modal-content">
            {/* Project Stats Overview */}
            <div className="stats-overview">
              <div className="stat-card estimated">
                <div className="stat-icon">
                  <FiTarget size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-label">Total Estimated</div>
                  <div className="stat-value">
                    {selectedProjectForModal.hours.estimated}h
                  </div>
                </div>
              </div>

              <div className="stat-card logged">
                <div className="stat-icon">
                  <FiCheckCircle size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-label">Total Logged</div>
                  <div className="stat-value">
                    {selectedProjectForModal.hours.logged}h
                  </div>
                </div>
              </div>

              <div className="stat-card remaining">
                <div className="stat-icon">
                  <FiClock size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-label">Remaining</div>
                  <div className="stat-value">
                    {selectedProjectForModal.hours.remaining}h
                  </div>
                </div>
              </div>

              <div className="stat-card progress">
                <div className="stat-icon">
                  <FiTrendingUp size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-label">Progress</div>
                  <div className="stat-value">
                    {selectedProjectForModal.hours.estimated > 0
                      ? Math.round(
                          (selectedProjectForModal.hours.logged /
                            selectedProjectForModal.hours.estimated) *
                            100
                        )
                      : 0}
                    %
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="progress-section">
              <div className="progress-header">
                <FiBarChart2 size={16} />
                <span>Overall Progress</span>
                <span className="progress-percentage">
                  {selectedProjectForModal.hours.estimated > 0
                    ? Math.round(
                        (selectedProjectForModal.hours.logged /
                          selectedProjectForModal.hours.estimated) *
                          100
                      )
                    : 0}
                  %
                </span>
              </div>
              <div className="progress-bar-container">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${
                      selectedProjectForModal.hours.estimated > 0
                        ? Math.min(
                            (selectedProjectForModal.hours.logged /
                              selectedProjectForModal.hours.estimated) *
                              100,
                            100
                          )
                        : 0
                    }%`,
                    backgroundColor: getProgressColor(
                      selectedProjectForModal.hours.logged,
                      selectedProjectForModal.hours.estimated
                    )
                  }}
                ></div>
              </div>
            </div>

            {/* Tasks Section */}
            <div className="tasks-section">
              <div className="section-header">
                <div className="section-title">
                  <FiUser size={18} />
                  <span>Tasks Overview</span>
                </div>
                <div className="tasks-count">
                  {selectedProjectForModal?.tasks.length}{" "}
                  {selectedProjectForModal?.tasks.length === 1
                    ? "Task"
                    : "Tasks"}
                </div>
              </div>

              <div className="tasks-grid">
                {selectedProjectForModal?.tasks.map((task, index) => {
                  const getStatusIcon = (status) => {
                    const statusLower = status?.toLowerCase();
                    switch (statusLower) {
                      case "completed":
                      case "done":
                        return <FiCheckCircle size={16} />;
                      case "in-progress":
                      case "inprogress":
                      case "active":
                        return <FiPlay size={16} />;
                      case "pending":
                      case "todo":
                        return <FiPause size={16} />;
                      case "cancelled":
                      case "canceled":
                        return <FiXCircle size={16} />;
                      default:
                        return <FiAlertCircle size={16} />;
                    }
                  };

                  const taskProgress =
                    task?.estimatedHours > 0
                      ? Math.round(
                          (task?.loggedHours / task?.estimatedHours) * 100
                        )
                      : 0;

                  return (
                    <div key={index} className="task-card">
                      <div className="task-card-header">
                        <div className="task-title-section">
                          <h4 className="task-title">{task?.title}</h4>
                          <div
                            className={`task-status status-${task?.status?.toLowerCase()}`}
                          >
                            {getStatusIcon(task?.status)}
                            <span>{task?.status}</span>
                          </div>
                        </div>
                      </div>

                      <div className="task-dates-section">
                        <div className="date-row">
                          <div className="date-item">
                            <FiCalendar size={14} />
                            <span className="date-label">Start:</span>
                            <span className="date-value">
                              {task?.startDate ?dayjs(task?.startDate).format("DD-MMM-YYYY") : "-"}
                            </span>
                          </div>
                          <div className="date-item">
                            <FiCalendar size={14} />
                            <span className="date-label">End:</span>
                            <span className="date-value">
                              {task?.endDate  ? dayjs(task?.endDate).format("DD-MMM-YYYY") : "-"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="task-metrics">
                        <div className="metric-row">
                          <div className="metric-item">
                            <FiTarget size={14} />
                            <span className="metric-label">Estimated:</span>
                            <span className="metric-value">
                              {task?.estimatedHours}h
                            </span>
                          </div>
                          <div className="metric-item">
                            <FiCheckCircle size={14} />
                            <span className="metric-label">Logged:</span>
                            <span className="metric-value">
                              {task?.loggedHours}h
                            </span>
                          </div>
                        </div>

                        <div className="task-progress-section">
                          <div className="task-progress-header">
                            <span className="progress-label">Progress</span>
                            <span className="progress-percentage">
                              {taskProgress}%
                            </span>
                          </div>
                          <div className="task-progress-bar">
                            <div
                              className="task-progress-fill"
                              style={{
                                width: `${Math.min(taskProgress, 100)}%`,
                                backgroundColor:
                                  taskProgress < 34
                                    ? "red"
                                    : taskProgress < 67
                                    ? "yellow"
                                    : "green"
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
};

export default ResourceMatrix;
