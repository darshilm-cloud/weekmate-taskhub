import React, { useEffect, useRef, useState } from "react";
import {
  Input,
  Table,
  Popconfirm,
  message,
  Button,
  Select,
  Spin,
  Empty,
  Pagination,
  Dropdown,
  Modal,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  MoreOutlined,
  UserOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  DownOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { Link, useParams, useHistory } from "react-router-dom/cjs/react-router-dom.min";
import moment from "moment";
import Service from "../../service";
import { hasPermission } from "../../util/hasPermission";
import { generateCacheKey } from "../../util/generateCacheKey";
import MyAvatar from "../Avatar/MyAvatar";
import MyAvatarGroup from "../AvatarGroup/MyAvatarGroup";
import AssignProjectFilter from "./AssignProjectFilter";
import SortByComponent from "./SortByComponent";
import ProjectFormModal from "./ProjectFormModal";
import "./AssignProject.css";

/* ─── Donut Chart ─────────────────────────────────────────── */
const DonutChart = ({ percentage = 0, size = 68 }) => {
  const sw = 6;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(Math.max(percentage, 0), 100);
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="ap-donut">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EBEBEB" strokeWidth={sw} />
        {pct > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#00C4B4"
            strokeWidth={sw}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </svg>
      <span className="ap-donut-pct">{pct}%</span>
    </div>
  );
};

/* ─── Status helpers ──────────────────────────────────────── */
const STATUS_MAP = {
  active: { bg: "#E8F5E9", color: "#2E7D32", dot: "#43A047" },
  pending: { bg: "#FFF8E1", color: "#E65100", dot: "#FFA726" },
  completed: { bg: "#E3F2FD", color: "#1565C0", dot: "#42A5F5" },
  "on hold": { bg: "#FCE4EC", color: "#880E4F", dot: "#EC407A" },
  cancelled: { bg: "#F5F5F5", color: "#616161", dot: "#BDBDBD" },
};
const getStatusStyle = (title = "") =>
  STATUS_MAP[title.toLowerCase()] || { bg: "#F3F4F6", color: "#374151", dot: "#9CA3AF" };

/* ─── Project Card ────────────────────────────────────────── */
const ProjectCard = ({ record, companySlug, onEdit, onDelete, stats, projectStatusList, onStatusChange, onCloseProject }) => {
  const history = useHistory();
  const statusTitle = record?.project_status?.title || "Active";
  const sc = getStatusStyle(statusTitle);
  const pct = record?.completionPercentage || 0;

  const formattedTitle = record?.title?.replace(
    /(?:^|\s)([a-z])/g,
    (m, g) => m.charAt(0) + g.toUpperCase()
  );
  const dueDate = moment(record?.end_date).isValid()
    ? `Due On ${moment(record.end_date).format("MMM DD, YYYY")}`
    : null;
  const lastUpdated = record?.updatedAt ? moment(record.updatedAt).fromNow() : "recently";
  const managerName = record?.manager?.full_name?.replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.)\s*/i, "") || "";

  const taskStats = [
    { label: "Closed", value: stats?.closed ?? 0, color: "#43A047" },
    { label: "Today", value: stats?.today ?? 0, color: "#1E88E5" },
    { label: "Over Due", value: stats?.overDue ?? 0, color: "#E53935" },
    { label: "Upcoming", value: stats?.upComing ?? 0, color: "#FFA726" },
  ];

  /* Navigate to project detail */
  const handleCardClick = () => {
    history.push(`/${companySlug}/project/app/${record._id}?tab=${record?.defaultTab?.name}`);
  };

  /* Circle click → confirm close project */
  const handleCircleClick = (e) => {
    e.stopPropagation();
    Modal.confirm({
      title: "Close Project",
      icon: <CloseCircleOutlined style={{ color: "#ef4444" }} />,
      content: `Are you sure you want to close "${formattedTitle}"? This will mark the project as completed.`,
      okText: "Yes, Close Project",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      onOk: () => onCloseProject(record._id),
    });
  };

  /* Status dropdown items */
  const statusMenuItems = (projectStatusList || []).map((s) => {
    const sStyle = getStatusStyle(s.title);
    return {
      key: s._id,
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: sStyle.dot, flexShrink: 0, display: "inline-block" }} />
          {s.title}
        </span>
      ),
      onClick: ({ domEvent }) => {
        domEvent.stopPropagation();
        onStatusChange(record._id, s._id);
      },
    };
  });

  /* 3-dot menu items */
  const menuItems = [];
  if (hasPermission(["project_edit"])) {
    menuItems.push({
      key: "edit",
      icon: <EditOutlined />,
      label: "Edit",
      onClick: ({ domEvent }) => { domEvent.stopPropagation(); onEdit(record); },
    });
  }
  if (hasPermission(["project_delete"])) {
    menuItems.push({
      key: "delete",
      icon: <DeleteOutlined />,
      label: "Delete",
      onClick: ({ domEvent }) => {
        domEvent.stopPropagation();
        Modal.confirm({
          title: "Delete Project",
          content: "Are you sure you want to delete this project?",
          okText: "Yes",
          cancelText: "No",
          okButtonProps: { danger: true },
          onOk: () => onDelete(record._id),
        });
      },
    });
  }

  return (
    <div className="ap-card" onClick={handleCardClick}>
      {/* Top row */}
      <div className="ap-card-top">
        <div className="ap-card-status-row">
          {/* Circle → close project */}
          <span
            className={`ap-card-check-icon ${pct >= 100 ? "ap-card-check-icon--done" : ""}`}
            onClick={handleCircleClick}
            title="Click to close project"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="8" stroke={pct >= 100 ? "#43A047" : "#BDBDBD"} strokeWidth="1.5" fill={pct >= 100 ? "#E8F5E9" : "transparent"} />
              {pct >= 100 && (
                <path d="M5.5 9l2.5 2.5 4.5-4.5" stroke="#43A047" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
          </span>

          {/* Status → inline dropdown */}
          <div onClick={(e) => e.stopPropagation()}>
            <Dropdown
              menu={{ items: statusMenuItems }}
              trigger={["click"]}
              placement="bottomLeft"
            >
              <span className="ap-status-pill ap-status-pill--clickable" style={{ background: sc.bg, color: sc.color }}>
                <span className="ap-status-dot" style={{ background: sc.dot }} />
                {statusTitle}
                <DownOutlined className="ap-status-arrow" />
              </span>
            </Dropdown>
          </div>
        </div>

        <div className="ap-card-top-right" onClick={(e) => e.stopPropagation()}>
          <span className="ap-last-updated">Last updated {lastUpdated}</span>
          {menuItems.length > 0 && (
            <Dropdown menu={{ items: menuItems }} trigger={["click"]} placement="bottomRight">
              <Button type="text" size="small" icon={<MoreOutlined />} className="ap-card-menu-btn" />
            </Dropdown>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="ap-card-body">
        <div className="ap-card-left">
          <span className="ap-card-title">{formattedTitle}</span>
          {managerName && <p className="ap-card-manager">By {managerName}</p>}

          {/* Stats grid */}
          <div className="ap-stats-grid">
            {taskStats.map((s) => (
              <div key={s.label} className="ap-stat-item" style={{ borderLeftColor: s.color }}>
                <span className="ap-stat-label" style={{ color: s.color }}>{s.label}</span>
                <span className="ap-stat-value">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="ap-card-right">
          {dueDate && <span className="ap-due-badge">{dueDate}</span>}
          <DonutChart percentage={pct} size={68} />
        </div>
      </div>
    </div>
  );
};

/* ─── Tabs config ─────────────────────────────────────────── */
const TABS = [
  { key: "created_by_me", label: "Created By Me", icon: <CheckCircleOutlined /> },
  { key: "assignee_to_me", label: "Assignee To Me", icon: <UserOutlined /> },
  { key: "my_team", label: "My Team Project", icon: <TeamOutlined /> },
];

/* ─── Main Component ──────────────────────────────────────── */
const AssignProject = () => {
  const { editProjectId } = useParams();
  const companySlug = localStorage.getItem("companyDomain");
  const history = useHistory();
  const searchRef = useRef();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [selectedProject, setSelectedProject] = useState(null);
  const [isloadingProject, setIsloadingProject] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 30 });
  const [searchText, setSearchText] = useState("");
  const [seachEnabled, setSearchEnabled] = useState(false);
  const [sortOption, setSortOption] = useState("createdAt");
  const [columnDetails, setColumnDetails] = useState([]);
  const [currentFilters, setCurrentFilters] = useState({});
  const [currentSkipFilters, setCurrentSkipFilters] = useState([]);
  const [viewMode, setViewMode] = useState("grid");
  const [activeTab, setActiveTab] = useState("created_by_me");
  const [statusFilter, setStatusFilter] = useState(undefined);
  const [projectStatusList, setProjectStatusList] = useState([]);
  const [taskStats, setTaskStats] = useState({});

  useEffect(() => {
    fetchStatusList();
  }, []);

  useEffect(() => {
    if (editProjectId) getProjectByID();
  }, [editProjectId]);

  useEffect(() => {
    getProjectListing(currentSkipFilters, currentFilters);
  }, [searchText, pagination.current, pagination.pageSize, sortOption, currentFilters, currentSkipFilters, activeTab, statusFilter]);

  const fetchStatusList = async () => {
    try {
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectStatus,
        body: { isDropdown: true },
      });
      if (res?.data?.data) setProjectStatusList(res.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const getProjectListing = async (skipFilters = currentSkipFilters, filterStats = currentFilters) => {
    try {
      setIsloadingProject(true);
      const reqBody = {
        pageNo: pagination.current,
        limit: pagination.pageSize,
        sortBy: "desc",
        filterBy: activeTab === "created_by_me" ? "all" : activeTab,
        sort: sortOption,
      };

      const shouldSkip = (filterKey) =>
        skipFilters.includes("skipAll") || skipFilters.includes(filterKey);

      if (!shouldSkip("skipManager") && filterStats?.manager?.length > 0)
        reqBody.manager_id = filterStats.manager;
      if (!shouldSkip("skipAccountManager") && filterStats?.account_manager?.length > 0)
        reqBody.acc_manager_id = filterStats.account_manager;
      if (!shouldSkip("skipTechnology") && filterStats?.technology?.length > 0)
        reqBody.technology = filterStats.technology;
      if (!shouldSkip("skipProjectType") && filterStats?.project_type?.length > 0)
        reqBody.project_type = filterStats.project_type;
      if (!shouldSkip("skipAssignees") && filterStats?.assignees?.length > 0)
        reqBody.assignee_id = filterStats.assignees;
      if (searchText?.trim()) {
        reqBody.search = searchText;
        setSearchEnabled(true);
      }
      if (statusFilter) reqBody.project_status = statusFilter;

      const Key = generateCacheKey("project", reqBody);
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectdetails,
        body: reqBody,
        options: { cachekey: Key },
      });

      if (response?.data?.data?.length > 0) {
        const projects = response.data.data;
        setColumnDetails(projects);
        setPagination((prev) => ({ ...prev, total: response.data.metadata.total }));
        fetchTaskStats(projects);
      } else {
        setColumnDetails([]);
        setPagination((prev) => ({ ...prev, total: 0 }));
        setTaskStats({});
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsloadingProject(false);
    }
  };

  const fetchTaskStats = async (projects) => {
    try {
      const results = await Promise.all(
        projects.map(async (project) => {
          try {
            const response = await Service.makeAPICall({
              methodName: Service.postMethod,
              api_url: Service.getTaskList,
              body: { project_id: project._id, countFor: "All" },
            });
            if (response?.data?.statusCode === 200) {
              return { _id: project._id, data: response.data.data };
            }
          } catch (e) {
            console.error(e);
          }
          return { _id: project._id, data: null };
        })
      );
      const statsMap = {};
      results.forEach((r) => {
        statsMap[r._id] = r.data;
      });
      setTaskStats(statsMap);
    } catch (error) {
      console.error(error);
    }
  };

  const getProjectByID = async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectdetails,
        body: { _id: editProjectId },
      });
      if (response?.data?.status) {
        setSelectedProject(response.data.data);
        setModalMode("Edit");
        setIsModalOpen(true);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const deleteProject = async (id) => {
    try {
      const params = `/${id}`;
      const response = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url: Service.deleteProjectdetails + params,
      });
      if (response.data?.data && response?.data?.status) {
        message.success(response.data.message);
        const isLastItemOnPage = columnDetails.length === 1 && pagination.current > 1;
        if (isLastItemOnPage) {
          setPagination((prev) => ({ ...prev, current: prev.current - 1 }));
        }
        getProjectListing();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const onSearch = (value) => {
    setSearchText(value);
    setPagination({ ...pagination, current: 1 });
  };

  const resetSearchFilter = (e) => {
    const keyCode = e && e.keyCode ? e.keyCode : e;
    if ((keyCode === 8 || keyCode === 46) && searchRef.current.state?.value?.length <= 1 && seachEnabled) {
      searchRef.current.state.value = "";
      setSearchText("");
      setSearchEnabled(false);
    }
  };

  const showTotal = (total) => `Total Records Count is ${total}`;
  const handleSortFilter = (val) => setSortOption(val);
  const handleTableChange = (page) => setPagination({ ...pagination, ...page });

  const handleFilterChange = (skipFilters = [], filterStats = {}) => {
    setCurrentFilters(filterStats);
    setCurrentSkipFilters(skipFilters);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const showModal = (project = null) => {
    setSelectedProject(project);
    setIsModalOpen(true);
    setModalMode(project ? "Edit" : "add");
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setSelectedProject(null);
    if (editProjectId) {
      history.push(`/${companySlug}/project/app/${editProjectId}`);
    }
  };

  const handleStatusChange = async (projectId, statusId) => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: `${Service.updateProjectdetails}/${projectId}`,
        body: { project_status: statusId },
        options: { moduleprefix: "project" },
      });
      if (response?.data?.status) {
        message.success("Project status updated");
        getProjectListing();
      } else {
        message.error(response?.data?.message || "Failed to update status");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleCloseProject = async (projectId) => {
    try {
      const closedStatus =
        projectStatusList.find((s) =>
          ["completed", "closed", "done"].includes(s.title?.toLowerCase())
        ) || projectStatusList[projectStatusList.length - 1];

      if (!closedStatus) {
        message.error("No closed status configured");
        return;
      }

      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: `${Service.updateProjectdetails}/${projectId}`,
        body: { project_status: closedStatus._id },
        options: { moduleprefix: "project" },
      });
      if (response?.data?.status) {
        message.success("Project closed successfully");
        getProjectListing();
      } else {
        message.error(response?.data?.message || "Failed to close project");
      }
    } catch (error) {
      console.error(error);
    }
  };

  /* Table columns for list view */
  const columns = [
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      render: (text, record) => {
        const formattedTitle = record?.title?.replace(
          /(?:^|\s)([a-z])/g,
          (match, group1) => match.charAt(0) + group1.toUpperCase()
        );
        return (
          <Link to={`/${companySlug}/project/app/${record._id}?tab=${record?.defaultTab?.name}`}>
            <div className="project_title_main_div">
              <span>{formattedTitle}</span>
            </div>
          </Link>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "project_status",
      key: "project_status",
      width: 120,
      render: (_, record) => {
        const statusTitle = record?.project_status?.title || "";
        const sc = getStatusStyle(statusTitle);
        return (
          <span className="ap-status-pill ap-status-pill--sm" style={{ background: sc.bg, color: sc.color }}>
            <span className="ap-status-dot" style={{ background: sc.dot }} />
            {statusTitle}
          </span>
        );
      },
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      width: 200,
      render: (_, record) => {
        const startDate = moment(record?.start_date).isValid()
          ? moment(record.start_date).format("DD MMM YY")
          : "";
        const endDate = moment(record?.end_date).isValid()
          ? moment(record.end_date).format("DD MMM YY")
          : "";
        return (
          <span style={{ textTransform: "capitalize" }}>
            {startDate} - {endDate}
          </span>
        );
      },
    },
    {
      title: "AM",
      dataIndex: "acc_manager",
      key: "acc_manager",
      width: 80,
      render: (text, record) => (
        <div className="avtar-group">
          {record?.acc_manager ? (
            <MyAvatar
              userName={record.acc_manager.full_name || "-"}
              src={record.acc_manager.emp_img}
              key={record.acc_manager._id}
              alt={record.acc_manager.full_name}
            />
          ) : (
            " - "
          )}
        </div>
      ),
    },
    {
      title: "PM",
      dataIndex: "manager",
      key: "manager",
      width: 80,
      render: (text, record) => (
        <div className="avtar-group">
          {record?.manager ? (
            <MyAvatar
              userName={record.manager.full_name || "-"}
              src={record.manager.emp_img}
              key={record.manager._id}
              alt={record.manager.full_name}
            />
          ) : (
            " - "
          )}
        </div>
      ),
    },
    {
      title: "Assignees",
      dataIndex: "assignees",
      key: "assignees",
      width: 120,
      render: (text, record) => (
        <div className="avtar-group">
          <MyAvatarGroup record={record.assignees} maxPopoverTrigger={"click"} />
        </div>
      ),
    },
  ];

  if (hasPermission(["project_edit"])) {
    columns.push({
      title: "Action",
      dataIndex: "actions",
      key: "actions",
      width: 100,
      render: (text, record) => (
        <div className="edit-delete" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {hasPermission(["project_edit"]) && (
            <div onClick={() => showModal(record)} style={{ cursor: "pointer" }} title="Edit">
              <EditOutlined style={{ color: "#52c41a", fontSize: 15 }} />
            </div>
          )}
          {hasPermission(["project_delete"]) && (
            <Popconfirm
              title="Do you want to delete?"
              okText="Yes"
              cancelText="No"
              onConfirm={() => deleteProject(record._id)}
            >
              <div style={{ cursor: "pointer" }} title="Delete">
                <DeleteOutlined style={{ color: "#ff4d4f", fontSize: 15 }} />
              </div>
            </Popconfirm>
          )}
        </div>
      ),
    });
  }

  const totalCount = pagination.total || columnDetails.length;

  return (
    <div className="ap-page-wrapper">
      {/* ── Page Header ── */}
      <div className="ap-page-header">
        <h1 className="ap-page-title">Project</h1>
        <div className="ap-header-actions">
          <Input.Search
            ref={searchRef}
            placeholder="Search..."
            onSearch={onSearch}
            onKeyUp={resetSearchFilter}
            className="ap-search-input"
          />
          <Select
            placeholder="Select status"
            allowClear
            className="ap-status-select"
            onChange={(val) => {
              setStatusFilter(val);
              setPagination((p) => ({ ...p, current: 1 }));
            }}
          >
            {projectStatusList.map((s) => (
              <Select.Option key={s._id} value={s._id}>
                {s.title}
              </Select.Option>
            ))}
          </Select>
          <div className="ap-view-toggle">
            <button
              className={`ap-view-btn ${viewMode === "list" ? "active" : ""}`}
              onClick={() => setViewMode("list")}
              title="List view"
            >
              <UnorderedListOutlined />
            </button>
            <button
              className={`ap-view-btn ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => setViewMode("grid")}
              title="Grid view"
            >
              <AppstoreOutlined />
            </button>
          </div>
          {hasPermission(["project_add"]) && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              className="ap-add-btn"
              onClick={() => showModal()}
            >
              Add project
            </Button>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="ap-tabs-row">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`ap-tab-btn ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => {
              setActiveTab(tab.key);
              setPagination((p) => ({ ...p, current: 1 }));
            }}
          >
            <span className="ap-tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Sub-header: count + filter + view-all ── */}
      <div className="ap-sub-header">
        <span className="ap-project-count">All Project ({totalCount})</span>
        <div className="ap-sub-header-right">
          <AssignProjectFilter
            getRoles={() => hasPermission}
            onFilterChange={handleFilterChange}
          />
          <SortByComponent
            sortOption={sortOption}
            handleSortFilter={handleSortFilter}
            getProjectListing={getProjectListing}
          />
          <span
            className="ap-view-all-link"
            onClick={() => setPagination((p) => ({ ...p, pageSize: p.total || 100, current: 1 }))}
          >
            View All
          </span>
        </div>
      </div>

      {/* ── Content ── */}
      {viewMode === "grid" ? (
        <div className="ap-grid-section">
          {isloadingProject ? (
            <div className="ap-loading-state">
              <Spin size="large" />
            </div>
          ) : columnDetails.length === 0 ? (
            <div className="ap-empty-state">
              <Empty description="No projects found" />
            </div>
          ) : (
            <div className="ap-cards-grid">
              {columnDetails.map((record) => (
                <ProjectCard
                  key={record._id}
                  record={record}
                  companySlug={companySlug}
                  onEdit={showModal}
                  onDelete={deleteProject}
                  stats={taskStats[record._id]}
                  projectStatusList={projectStatusList}
                  onStatusChange={handleStatusChange}
                  onCloseProject={handleCloseProject}
                />
              ))}
            </div>
          )}
          {!isloadingProject && columnDetails.length > 0 && (
            <div className="ap-grid-pagination">
              <Pagination
                current={pagination.current}
                pageSize={pagination.pageSize}
                total={pagination.total}
                showSizeChanger
                pageSizeOptions={["10", "20", "30"]}
                showTotal={showTotal}
                onChange={(page, size) => setPagination({ current: page, pageSize: size })}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="ap-table-section">
          <Table
            columns={columns}
            dataSource={columnDetails}
            pagination={{
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "30"],
              showTotal,
              ...pagination,
            }}
            onChange={handleTableChange}
            loading={isloadingProject}
            rowKey="_id"
          />
        </div>
      )}

      {isModalOpen && (
        <ProjectFormModal
          isModalOpen={isModalOpen}
          modalMode={modalMode}
          selectedProject={selectedProject}
          handleCancel={handleCancel}
          setIsModalOpen={setIsModalOpen}
          triggerRefreshList={() => getProjectListing()}
        />
      )}
    </div>
  );
};

export default AssignProject;
