import React, { useEffect, useRef, useState, useCallback } from "react";
import useEffectAfterMount from "../../util/useEffectAfterMount";
import {
  Input,
  Table,
  Popconfirm,
  message,
  Button,
  Form,
  Skeleton,
  Select,
  Spin,
  Empty,
  Pagination,
  Dropdown,
  Modal,
  Calendar,
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
  CalendarOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import ReactApexChart from "react-apexcharts";
import { Link, useParams, useHistory, useLocation } from "react-router-dom/cjs/react-router-dom.min";
import moment from "moment";
import dayjs from "dayjs";
import Service from "../../service";
import { hasPermission } from "../../util/hasPermission";
import { generateCacheKey } from "../../util/generateCacheKey";
import MyAvatar from "../Avatar/MyAvatar";
import MyAvatarGroup from "../AvatarGroup/MyAvatarGroup";
import AssignProjectFilter from "./AssignProjectFilter";
import SortByComponent from "./SortByComponent";
import ProjectFormModal from "./ProjectFormModal";
import AddTaskModal from "../../pages/Tasks/AddTaskModal";
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

const TAB_FILTER_MAP = {
  created_by_me: "all",
  assignee_to_me: "assigned",
  my_team: "manager",
};

const PROJECT_CACHE_TTL_MS = 5 * 60 * 1000;

const GridSkeletonCard = ({ index }) => (
  <div className="ap-skeleton-card" key={`project-skeleton-${index}`}>
    <div className="ap-skeleton-row ap-skeleton-row--top">
      <span className="ap-skeleton-dot" />
      <span className="ap-skeleton-pill" />
      <span className="ap-skeleton-line ap-skeleton-line--meta" />
    </div>
    <div className="ap-skeleton-line ap-skeleton-line--title" />
    <div className="ap-skeleton-line ap-skeleton-line--subtitle" />
    <div className="ap-skeleton-stats">
      {Array.from({ length: 4 }).map((_, statIdx) => (
        <div className="ap-skeleton-stat" key={`project-skeleton-stat-${index}-${statIdx}`}>
          <span className="ap-skeleton-line ap-skeleton-line--stat-label" />
          <span className="ap-skeleton-line ap-skeleton-line--stat-value" />
        </div>
      ))}
    </div>
    <div className="ap-skeleton-donut" />
  </div>
);

/* ─── Main Component ──────────────────────────────────────── */
const AssignProject = () => {
  const { editProjectId } = useParams();
  const companySlug = localStorage.getItem("companyDomain");
  const history = useHistory();
  const location = useLocation();
  const searchRef = useRef();
  const sessionCacheKey = `assign-project-cache-${companySlug || "default"}`;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [selectedProject, setSelectedProject] = useState(null);
  const [isloadingProject, setIsloadingProject] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 12 });
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
  const [projectCache, setProjectCache] = useState(() => {
    try {
      const raw = sessionStorage.getItem(sessionCacheKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      const cachedAt = parsed?.cachedAt || 0;
      if (!parsed?.data || Date.now() - cachedAt > PROJECT_CACHE_TTL_MS) {
        sessionStorage.removeItem(sessionCacheKey);
        return {};
      }
      return parsed.data;
    } catch (error) {
      return {};
    }
  });
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [isBrowserDateFilterOpen, setIsBrowserDateFilterOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [tempCalendarDate, setTempCalendarDate] = useState(dayjs());
  const [selectedWorkspaceProjectId, setSelectedWorkspaceProjectId] = useState(null);
  const [workspaceMemberTab, setWorkspaceMemberTab] = useState("staff");
  const [workspaceSubtab, setWorkspaceSubtab] = useState("overview");
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [lastCreatedTask, setLastCreatedTask] = useState(null);
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState(null);
  const [projectTasksMap, setProjectTasksMap] = useState({});
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [addTaskForm] = Form.useForm();
  const latestRequestIdRef = useRef(0);
  const prefetchTimeoutRef = useRef(null);
  const idleFetchRef = useRef(null);
  const ENABLE_TAB_PREFETCH = false;

  useEffect(() => {
    try {
      sessionStorage.setItem(
        sessionCacheKey,
        JSON.stringify({ cachedAt: Date.now(), data: projectCache })
      );
    } catch (error) {
      // Ignore storage failures and continue with in-memory cache.
    }
  }, [projectCache, sessionCacheKey]);

  useEffect(() => {
    fetchStatusList();
  }, []);

  useEffect(() => {
    if (editProjectId) getProjectByID();
  }, [editProjectId]);

  const searchDebounceRef = useRef(null);
  useEffectAfterMount(() => {
    // Debounce search — only fires after searchText changes (not on mount)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      getProjectListing(currentSkipFilters, currentFilters);
    }, 250);
    return () => clearTimeout(searchDebounceRef.current);
  }, [searchText]);

  useEffect(() => {
    getProjectListing(currentSkipFilters, currentFilters);
  }, [pagination.current, pagination.pageSize, sortOption, currentFilters, currentSkipFilters, activeTab, statusFilter]);

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

  const buildReqBody = (filterBy, skipFilters = currentSkipFilters, filterStats = currentFilters) => {
    const reqBody = {
      pageNo: pagination.current,
      limit: pagination.pageSize,
      sortBy: "desc",
      filterBy,
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
    return reqBody;
  };

  const prefetchOtherTabs = async (skipFilters = currentSkipFilters, filterStats = currentFilters) => {
    const otherTabs = TABS.map((t) => t.key).filter((k) => k !== activeTab);
    await Promise.all(
      otherTabs.map(async (tabKey) => {
        const filterBy = TAB_FILTER_MAP[tabKey] || "all";
        const reqBody = buildReqBody(filterBy, skipFilters, filterStats);
        const Key = generateCacheKey("project", reqBody);
        if (projectCache[Key]) return;
        try {
          const response = await Service.makeAPICall({
            methodName: Service.postMethod,
            api_url: Service.getProjectdetails,
            body: reqBody,
            options: { cachekey: Key },
          });
          const projects = response?.data?.data || [];
          const total = response?.data?.metadata?.total || 0;
          setProjectCache((prev) => ({
            ...prev,
            [Key]: { projects, total, taskStats: {} },
          }));
        } catch (e) {
          console.error(e);
        }
      })
    );
  };

  const fetchTaskStatsForIds = useCallback(async (projectIds) => {
    if (!Array.isArray(projectIds) || projectIds.length === 0) return;

    const uniqueIds = Array.from(new Set(projectIds.filter(Boolean)));
    const idsToFetch = uniqueIds.filter((id) => !taskStats[id]);
    if (idsToFetch.length === 0) return;

    const results = {};
    const queue = [...idsToFetch];
    const limit = 4;

    const fetchOne = async (projectId) => {
      try {
        const response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.getTaskList,
          body: { project_id: projectId, countFor: "All" },
        });
        if (response?.data?.statusCode === 200) {
          results[projectId] = response.data.data;
        }
      } catch (e) {
        console.error(e);
      }
    };

    const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
      while (queue.length) {
        const nextId = queue.shift();
        await fetchOne(nextId);
      }
    });

    await Promise.all(workers);

    if (Object.keys(results).length > 0) {
      setTaskStats((prev) => ({ ...prev, ...results }));
    }
  }, [taskStats]);

  const getProjectListing = async (skipFilters = currentSkipFilters, filterStats = currentFilters) => {
    const requestId = ++latestRequestIdRef.current;
    try {
      const reqBody = buildReqBody(TAB_FILTER_MAP[activeTab] || "all", skipFilters, filterStats);

      const Key = generateCacheKey("project", reqBody);
      const cached = projectCache[Key];
      if (cached) {
        setColumnDetails(cached.projects);
        setPagination((prev) => ({ ...prev, total: cached.total }));
        setIsloadingProject(false);
        return; // skip API call — data already cached
      }
      setIsloadingProject(columnDetails.length === 0);

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getProjectdetails,
        body: reqBody,
        options: { cachekey: Key },
      });

      if (requestId !== latestRequestIdRef.current) return;

      if (response?.data?.data?.length > 0) {
        const projects = response.data.data;
        setColumnDetails(projects);
        setPagination((prev) => ({ ...prev, total: response.data.metadata.total }));
        setIsloadingProject(false);
        setProjectCache((prev) => ({
          ...prev,
          [Key]: {
            projects,
            total: response.data.metadata.total,
            taskStats: prev[Key]?.taskStats || {},
          },
        }));
      } else {
        setColumnDetails([]);
        setPagination((prev) => ({ ...prev, total: 0 }));
        setTaskStats({});
        setProjectCache((prev) => ({
          ...prev,
          [Key]: { projects: [], total: 0, taskStats: {} },
        }));
        setIsloadingProject(false);
      }

      if (prefetchTimeoutRef.current) clearTimeout(prefetchTimeoutRef.current);
      const hasActiveFilters =
        Boolean(searchText?.trim()) ||
        Boolean(statusFilter) ||
        (filterStats && Object.keys(filterStats).length > 0);

      if (ENABLE_TAB_PREFETCH && !hasActiveFilters) {
        prefetchTimeoutRef.current = setTimeout(() => {
          prefetchOtherTabs(skipFilters, filterStats);
        }, 600);
      }
    } catch (error) {
      console.error(error);
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setIsloadingProject(false);
      }
    }
  };

  // Task stats are fetched lazily to keep initial page load fast.

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
    setSearchText(value?.trimStart?.() ?? "");
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const resetSearchFilter = (e) => {
    const keyCode = e && e.keyCode ? e.keyCode : e;
    const currentValue = e?.target?.value ?? searchText;
    if ((keyCode === 8 || keyCode === 46) && currentValue.length <= 1 && seachEnabled) {
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

  const doesProjectMatchDate = (record, dateValue) => {
    if (!dateValue) return true;
    const selectedMoment = moment(dateValue.toDate()).startOf("day");
    const startMoment = record?.start_date ? moment(record.start_date).startOf("day") : null;
    const endMoment = record?.end_date ? moment(record.end_date).endOf("day") : null;

    if (startMoment?.isValid() && endMoment?.isValid()) {
      return selectedMoment.isBetween(startMoment, endMoment, "day", "[]");
    }
    if (endMoment?.isValid()) return selectedMoment.isSame(endMoment, "day");
    if (startMoment?.isValid()) return selectedMoment.isSame(startMoment, "day");
    return false;
  };

  const selectedStatusMeta = statusFilter
    ? projectStatusList.find((status) => status._id === statusFilter)
    : null;

  const visibleProjects = columnDetails.filter((record) => {
    const matchesDate = selectedDate ? doesProjectMatchDate(record, selectedDate) : true;
    if (!matchesDate) return false;

    const normalizedSearch = searchText?.trim().toLowerCase();
    if (normalizedSearch) {
      const projectTitle = record?.title?.toLowerCase?.() || "";
      const projectCode = record?.project_id?.toLowerCase?.() || "";
      const projectStatusTitle = record?.project_status?.title?.toLowerCase?.() || "";
      const ownerName =
        record?.created_by?.full_name?.toLowerCase?.() ||
        record?.created_by?.name?.toLowerCase?.() ||
        "";

      const matchesSearch =
        projectTitle.includes(normalizedSearch) ||
        projectCode.includes(normalizedSearch) ||
        projectStatusTitle.includes(normalizedSearch) ||
        ownerName.includes(normalizedSearch);

      if (!matchesSearch) return false;
    }

    if (!statusFilter) return true;

    const recordStatusId = record?.project_status?._id || record?.project_status;
    const recordStatusTitle = record?.project_status?.title?.toLowerCase?.() || "";
    const selectedStatusTitle = selectedStatusMeta?.title?.toLowerCase?.() || "";

    return recordStatusId === statusFilter || (!!selectedStatusTitle && recordStatusTitle === selectedStatusTitle);
  });
  const showInitialProjectSkeleton = isloadingProject && columnDetails.length === 0;
  const hasActiveProjectFilters =
    Boolean(searchText?.trim()) ||
    Boolean(statusFilter) ||
    Boolean(selectedDate) ||
    (currentFilters && Object.keys(currentFilters).length > 0);
  const emptyProjectsMessage = hasActiveProjectFilters ? "No matches found" : "No projects found";

  useEffect(() => {
    if (!visibleProjects.length) return;

    const isGrid = viewMode === "grid";
    const primaryIds = isGrid
      ? []
      : selectedWorkspaceProjectId
      ? [selectedWorkspaceProjectId]
      : [];

    const timer = setTimeout(() => {
      if (primaryIds.length) fetchTaskStatsForIds(primaryIds);
    }, 350);

    if (idleFetchRef.current) {
      if (typeof idleFetchRef.current === "number") {
        clearTimeout(idleFetchRef.current);
      } else if (typeof window !== "undefined" && window.cancelIdleCallback) {
        window.cancelIdleCallback(idleFetchRef.current);
      }
    }

    const gridIds = isGrid ? visibleProjects.slice(0, 6).map((project) => project._id) : [];
    const remainingIds = isGrid ? visibleProjects.slice(6).map((project) => project._id) : [];

    if (isGrid && (gridIds.length || remainingIds.length)) {
      if (typeof window !== "undefined" && window.requestIdleCallback) {
        idleFetchRef.current = window.requestIdleCallback(() => {
          if (gridIds.length) fetchTaskStatsForIds(gridIds);
          if (remainingIds.length) {
            setTimeout(() => fetchTaskStatsForIds(remainingIds), 300);
          }
        }, { timeout: 2000 });
      } else {
        idleFetchRef.current = setTimeout(() => {
          if (gridIds.length) fetchTaskStatsForIds(gridIds);
          if (remainingIds.length) {
            setTimeout(() => fetchTaskStatsForIds(remainingIds), 300);
          }
        }, 900);
      }
    }

    return () => {
      clearTimeout(timer);
      if (idleFetchRef.current) {
        if (typeof idleFetchRef.current === "number") {
          clearTimeout(idleFetchRef.current);
        } else if (typeof window !== "undefined" && window.cancelIdleCallback) {
          window.cancelIdleCallback(idleFetchRef.current);
        }
      }
    };
  }, [visibleProjects, viewMode, selectedWorkspaceProjectId, fetchTaskStatsForIds]);

  useEffect(() => {
    if (!visibleProjects.length) {
      setSelectedWorkspaceProjectId(null);
      return;
    }
    const hasSelected = visibleProjects.some((project) => project._id === selectedWorkspaceProjectId);
    if (!selectedWorkspaceProjectId || !hasSelected) {
      setSelectedWorkspaceProjectId(visibleProjects[0]._id);
    }
  }, [visibleProjects, selectedWorkspaceProjectId]);

  const selectedWorkspaceProject =
    visibleProjects.find((project) => project._id === selectedWorkspaceProjectId) || visibleProjects[0] || null;
  const selectedWorkspaceStats = selectedWorkspaceProject ? taskStats[selectedWorkspaceProject._id] || {} : {};
  const workspaceMembers = {
    staff: selectedWorkspaceProject?.assignees || [],
    manager: selectedWorkspaceProject?.manager ? [selectedWorkspaceProject.manager] : [],
    coMember: [],
    client: selectedWorkspaceProject?.pms_clients || [],
  };

  const workspaceTasks = selectedWorkspaceProject?._id
    ? projectTasksMap[selectedWorkspaceProject._id] || []
    : [];

  const fetchProjectTasks = async (projectId) => {
    if (!projectId) return;
    if (projectTasksMap[projectId]) return;
    setIsLoadingTasks(true);
    try {
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: `${Service.getTaskDropdown}/${projectId}`,
      });
      if (response?.data?.statusCode === 200) {
        const tasks = response.data.data || [];
        setProjectTasksMap((prev) => ({ ...prev, [projectId]: tasks }));
      } else {
        setProjectTasksMap((prev) => ({ ...prev, [projectId]: [] }));
      }
    } catch (error) {
      console.error(error);
      setProjectTasksMap((prev) => ({ ...prev, [projectId]: [] }));
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const fetchProjectTasksForce = async (projectId) => {
    if (!projectId) return;
    setIsLoadingTasks(true);
    try {
      const response = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: `${Service.getTaskDropdown}/${projectId}`,
      });
      if (response?.data?.statusCode === 200) {
        const tasks = response.data.data || [];
        setProjectTasksMap((prev) => ({ ...prev, [projectId]: tasks }));
      } else {
        setProjectTasksMap((prev) => ({ ...prev, [projectId]: [] }));
      }
    } catch (error) {
      console.error(error);
      setProjectTasksMap((prev) => ({ ...prev, [projectId]: [] }));
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const refreshTaskStatsForProject = async (projectId) => {
    if (!projectId) return;
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getTaskList,
        body: { project_id: projectId, countFor: "All" },
      });
      if (response?.data?.statusCode === 200) {
        const latestStats = response.data.data;
        setTaskStats((prev) => ({ ...prev, [projectId]: latestStats }));
        setProjectCache((prev) => {
          const next = { ...prev };
          Object.keys(next).forEach((key) => {
            const entry = next[key];
            if (!entry || !entry.taskStats) return;
            next[key] = {
              ...entry,
              taskStats: { ...entry.taskStats, [projectId]: latestStats },
            };
          });
          return next;
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const groupByBucket = (tasks, bucket) => {
    if (!Array.isArray(tasks)) return [];
    const today = dayjs().format("YYYY-MM-DD");
    return tasks.filter((t) => {
      const due = t?.due_date ? dayjs(t.due_date).format("YYYY-MM-DD") : null;
      if (!due) return false;
      if (bucket === "today") return due === today;
      if (bucket === "overdue") return dayjs(due).isBefore(dayjs(today), "day");
      if (bucket === "upcoming") return dayjs(due).isAfter(dayjs(today), "day");
      return false;
    });
  };

  const todayTasks = groupByBucket(workspaceTasks, "today");
  const overdueTasks = groupByBucket(workspaceTasks, "overdue");
  const upcomingTasks = groupByBucket(workspaceTasks, "upcoming");
  const firstAvailableTask = todayTasks[0] || overdueTasks[0] || upcomingTasks[0] || null;

  useEffect(() => {
    if (!selectedTaskForEdit && firstAvailableTask) {
      setSelectedTaskForEdit(firstAvailableTask);
    }
  }, [firstAvailableTask, selectedTaskForEdit]);

  const calendarBase = dayjs();
  const calendarStart = calendarBase.startOf("month").startOf("week");
  const calendarDays = Array.from({ length: 42 }).map((_, i) => calendarStart.add(i, "day"));
  const tasksForDate = (date) =>
    workspaceTasks.filter((t) => t?.due_date && dayjs(t.due_date).isSame(date, "day"));

  const closedCount = selectedWorkspaceStats?.closed ?? 0;
  const pendingCount =
    (selectedWorkspaceStats?.today ?? 0) +
    (selectedWorkspaceStats?.overDue ?? 0) +
    (selectedWorkspaceStats?.upComing ?? 0);
  const totalChartCount = closedCount + pendingCount;

  const statusChartOptions = {
    chart: { type: "donut", toolbar: { show: false } },
    labels: ["Closed", "Pending"],
    colors: ["#2dd4bf", "#ff4d4f"],
    legend: { show: false },
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    plotOptions: {
      pie: {
        startAngle: -180,
        endAngle: 180,
        donut: {
          size: "68%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Tasks",
              fontSize: "13px",
              fontWeight: 600,
              formatter: () => totalChartCount.toString(),
            },
          },
        },
      },
    },
  };

  const statusChartSeries =
    totalChartCount === 0 ? [1, 1] : [closedCount, pendingCount];

  const userDisplayName =
    selectedWorkspaceProject?.manager?.full_name ||
    (selectedWorkspaceProject?.assignees?.[0]?.name ?? "Team");

  const completionPctRaw = selectedWorkspaceProject?.completionPercentage;
  const completionPct =
    typeof completionPctRaw === "number" && Number.isFinite(completionPctRaw)
      ? Math.min(Math.max(Math.round(completionPctRaw), 0), 100)
      : null;

  const closedPct = completionPct !== null
    ? completionPct
    : totalChartCount === 0
      ? 0
      : Math.round((closedCount / totalChartCount) * 100);

  const incompletePct = completionPct !== null
    ? Math.max(0, 100 - closedPct)
    : totalChartCount === 0
      ? 0
      : Math.round((pendingCount / totalChartCount) * 100);

  const userAnalysisOptions = {
    chart: { type: "bar", stacked: true, toolbar: { show: false } },
    dataLabels: { enabled: false },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "2%",
        borderRadius: 10,
      },
    },
    colors: ["#2dd4bf", "#ff4d4f"],
    xaxis: {
      categories: [userDisplayName],
      labels: { style: { colors: "#64748b" } },
      axisBorder: { show: true, color: "#e5e7eb" },
      axisTicks: { show: false },
    },
    yaxis: {
      min: 0,
      max: 100,
      tickAmount: 10,
      labels: { formatter: (val) => `${Math.round(val)}%`, style: { colors: "#64748b" } },
    },
    grid: { borderColor: "#eef2f7", strokeDashArray: 0 },
    tooltip: { y: { formatter: (val) => `${Math.round(val)}%` } },
    legend: { position: "top", horizontalAlign: "center" },
  };

  const userAnalysisSeries = [
    { name: "Closed Tasks", data: [closedPct] },
    { name: "Incomplete Tasks", data: [incompletePct] },
  ];

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get("tab");
    const listIdParam = searchParams.get("listID");
    const taskIdParam = searchParams.get("taskID");

    if (!selectedWorkspaceProject?._id) return;
    if (!tabParam && !listIdParam && !taskIdParam) return;

    const nextSearch = new URLSearchParams();
    if (tabParam) nextSearch.set("tab", tabParam);
    if (listIdParam) nextSearch.set("listID", listIdParam);
    if (taskIdParam) nextSearch.set("taskID", taskIdParam);

    history.replace(`/${companySlug}/project/app/${selectedWorkspaceProject._id}?${nextSearch.toString()}`);
  }, [companySlug, history, location.search, selectedWorkspaceProject?._id]);

  useEffect(() => {
    if (selectedWorkspaceProject?._id) {
      fetchProjectTasks(selectedWorkspaceProject._id);
    }
  }, [selectedWorkspaceProject?._id]);


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

  const totalCount =
    selectedDate || statusFilter ? visibleProjects.length : (pagination.total || columnDetails.length);
  const calendarOverlay = (
    <div className="ap-date-dropdown" onClick={(e) => e.stopPropagation()}>
      <div className="ap-date-dropdown-header">
        <span className="ap-date-dropdown-label">
          {(tempCalendarDate || dayjs()).format("MMM YYYY").toUpperCase()}
        </span>
        <div className="ap-date-dropdown-nav">
          <button
            type="button"
            className="ap-date-nav-btn"
            onClick={() => setTempCalendarDate((prev) => (prev || dayjs()).subtract(1, "month"))}
          >
            <LeftOutlined />
          </button>
          <button
            type="button"
            className="ap-date-nav-btn"
            onClick={() => setTempCalendarDate((prev) => (prev || dayjs()).add(1, "month"))}
          >
            <RightOutlined />
          </button>
        </div>
      </div>
      <Calendar
        fullscreen={false}
        value={tempCalendarDate}
        onSelect={(value) => setTempCalendarDate(value)}
        onPanelChange={(value) => setTempCalendarDate(value)}
        headerRender={() => null}
      />
      <div className="ap-date-dropdown-actions">
        <button
          type="button"
          className="ap-date-action ap-date-action--clear"
          onClick={() => {
            setSelectedDate(null);
            setTempCalendarDate(dayjs());
            setPagination((prev) => ({ ...prev, current: 1 }));
            setIsDateFilterOpen(false);
            setIsBrowserDateFilterOpen(false);
          }}
        >
          Clear All
        </button>
        <button
          type="button"
          className="ap-date-action ap-date-action--apply"
          onClick={() => {
            setSelectedDate(tempCalendarDate);
            setPagination((prev) => ({ ...prev, current: 1 }));
            setIsDateFilterOpen(false);
            setIsBrowserDateFilterOpen(false);
          }}
        >
          Apply
        </button>
      </div>
    </div>
  );

  return (
    <div className="ap-page-wrapper">

      {/* ── Top Bar (header + tabs) ── */}
      <div className="ap-topbar">

        {/* ── Page Header ── */}
        <div className="ap-page-header">
          <h1 className="ap-page-title">Projects</h1>
          <div className="ap-header-actions">
            <Input.Search
              ref={searchRef}
              placeholder="Search..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setPagination((prev) => ({ ...prev, current: 1 }));
              }}
              onSearch={onSearch}
              onKeyUp={resetSearchFilter}
              allowClear
              className="ap-search-input"
            />
            <AssignProjectFilter
              getRoles={() => hasPermission}
              onFilterChange={handleFilterChange}
            />
            <Select
              placeholder="Status"
              allowClear
              className="ap-status-select"
              suffixIcon={<DownOutlined style={{ fontSize: 11 }} />}
              onChange={(val) => {
                setStatusFilter(val || undefined);
                setPagination((p) => ({ ...p, current: 1 }));
              }}
              value={statusFilter}
            >
              <Select.Option key="all-projects" value="">
                All Projects
              </Select.Option>
              {projectStatusList.map((s) => (
                <Select.Option key={s._id} value={s._id}>
                  {s.title}
                </Select.Option>
              ))}
            </Select>
            <SortByComponent
              sortOption={sortOption}
              handleSortFilter={handleSortFilter}
              getProjectListing={getProjectListing}
            />
            <Dropdown
              open={isDateFilterOpen}
              onOpenChange={(open) => {
                setIsDateFilterOpen(open);
                if (open) setTempCalendarDate(selectedDate || dayjs());
              }}
              trigger={["click"]}
              dropdownRender={() => calendarOverlay}
              placement="bottomLeft"
              overlayClassName="ap-date-dropdown-overlay"
            >
              <button
                type="button"
                className={`ap-view-btn ap-date-trigger ${selectedDate ? "active" : ""}`}
                title="Date filter"
              >
                <CalendarOutlined />
              </button>
            </Dropdown>
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
                Add Project
              </Button>
            )}
          </div>
        </div>

        {/* ── Tabs + count ── */}
        <div className="ap-tabs-toolbar">
          <div className="ap-tabs-row">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                className={`ap-tab-btn ${activeTab === tab.key ? "active" : ""}`}
                onClick={() => {
                  setActiveTab(tab.key);
                  setSelectedWorkspaceProjectId(null);
                  setPagination((p) => ({ ...p, current: 1 }));
                }}
              >
                <span className="ap-tab-icon">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="ap-tabs-toolbar-right">
            <span className="ap-project-count">All Projects ({totalCount})</span>
            <span
              className="ap-view-all-link"
              onClick={() => setPagination((p) => ({ ...p, pageSize: p.total || 100, current: 1 }))}
            >
              View All
            </span>
          </div>
        </div>

      </div>{/* /ap-topbar */}

      {/* ── Content ── */}
      <div className="ap-content-area">
        {viewMode === "grid" ? (
          <div className="ap-grid-section">
            {showInitialProjectSkeleton ? (
              <div className="ap-skeleton-grid" aria-label="Loading projects">
                {Array.from({ length: 6 }).map((_, index) => (
                  <GridSkeletonCard key={`grid-skeleton-${index}`} index={index} />
                ))}
              </div>
            ) : visibleProjects.length === 0 ? (
              <div className="ap-empty-state">
                <Empty description={emptyProjectsMessage} />
              </div>
            ) : (
              <div className="ap-cards-grid">
                {visibleProjects.map((record) => (
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
            {!isloadingProject && visibleProjects.length > 0 && (
              <div className="ap-grid-pagination">
                <Pagination
                  current={pagination.current}
                  pageSize={pagination.pageSize}
                  total={totalCount}
                  showSizeChanger
                  pageSizeOptions={["10", "20", "30"]}
                  showTotal={showTotal}
                  onChange={(page, size) => setPagination({ current: page, pageSize: size })}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="ap-browser-layout">
            <aside className="ap-browser-sidebar">
              <div className="ap-browser-sidebar-toolbar">
                <Input
                  placeholder="Type here to search"
                  value={searchText}
                  onChange={(e) => {
                    setSearchText(e.target.value);
                    setPagination((prev) => ({ ...prev, current: 1 }));
                  }}
                  className="ap-browser-side-search"
                />
                <Dropdown
                  open={isBrowserDateFilterOpen}
                  onOpenChange={(open) => {
                    setIsBrowserDateFilterOpen(open);
                    if (open) setTempCalendarDate(selectedDate || dayjs());
                  }}
                  trigger={["click"]}
                  dropdownRender={() => calendarOverlay}
                  placement="bottomLeft"
                  overlayClassName="ap-date-dropdown-overlay"
                >
                  <button
                    type="button"
                    className={`ap-date-trigger ap-browser-date-btn ${selectedDate ? "active" : ""}`}
                    title="Date filter"
                  >
                    <CalendarOutlined />
                  </button>
                </Dropdown>
              </div>
              <Select
                placeholder="Select status"
                allowClear
                className="ap-browser-side-status"
                suffixIcon={<DownOutlined style={{ fontSize: 11 }} />}
                onChange={(val) => {
                  setStatusFilter(val || undefined);
                  setPagination((p) => ({ ...p, current: 1 }));
                }}
                value={statusFilter}
              >
                <Select.Option key="all-projects-browser" value="">
                  All Projects
                </Select.Option>
                {projectStatusList.map((s) => (
                  <Select.Option key={s._id} value={s._id}>
                    {s.title}
                  </Select.Option>
                ))}
              </Select>
              <div className="ap-browser-project-list">
                <div className="ap-browser-project-list-head">All Projects ({visibleProjects.length})</div>
                {showInitialProjectSkeleton ? (
                  <div className="ap-browser-project-list-skeleton">
                    {Array.from({ length: 7 }).map((_, idx) => (
                      <div key={`proj-skel-${idx}`} className="ap-browser-project-skel-row">
                        <Skeleton.Input active size="small" className="ap-browser-project-skel-input" />
                      </div>
                    ))}
                  </div>
                ) : (
                  visibleProjects.map((project) => (
                    <button
                      key={project._id}
                      type="button"
                      className={`ap-browser-project-item ${selectedWorkspaceProject?._id === project._id ? "active" : ""}`}
                      onClick={() => setSelectedWorkspaceProjectId(project._id)}
                    >
                      <span className="ap-browser-project-name">
                        {project?.title?.replace(/(?:^|\s)([a-z])/g, (m, g) => m.charAt(0) + g.toUpperCase())}
                      </span>
                      <MoreOutlined className="ap-browser-project-more" />
                    </button>
                  ))
                )}
              </div>
            </aside>

            <section className="ap-browser-workspace">
              {showInitialProjectSkeleton ? (
                <div className="ap-browser-skeleton">
                  <div className="ap-browser-skeleton-header">
                    <Skeleton.Input active size="default" className="ap-browser-skel-title" />
                    <Skeleton.Button active size="small" className="ap-browser-skel-btn" />
                  </div>
                  <div className="ap-browser-skeleton-tabs">
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <Skeleton.Button key={`tab-skel-${idx}`} active size="small" className="ap-browser-skel-tab" />
                    ))}
                  </div>
                  <div className="ap-browser-skeleton-grid">
                    <div className="ap-browser-skel-card">
                      <Skeleton active paragraph={{ rows: 3 }} />
                    </div>
                    <div className="ap-browser-skel-card">
                      <Skeleton active paragraph={{ rows: 3 }} />
                    </div>
                  </div>
                  <div className="ap-browser-skel-card">
                    <Skeleton active paragraph={{ rows: 4 }} />
                  </div>
                  <div className="ap-browser-skel-card">
                    <Skeleton active paragraph={{ rows: 5 }} />
                  </div>
                </div>
              ) : selectedWorkspaceProject ? (
                <>
                  <div className="ap-browser-workspace-header">
                    <h2 className="ap-browser-workspace-title">
                      {selectedWorkspaceProject?.title?.replace(/(?:^|\s)([a-z])/g, (m, g) => m.charAt(0) + g.toUpperCase())}
                    </h2>
                    <div className="ap-browser-workspace-actions">
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        className="ap-add-btn ap-add-task-btn"
                        onClick={() => setIsAddTaskOpen(true)}
                      >
                        Add Task
                      </Button>
                    </div>
                  </div>

                  <div className="ap-browser-subtabs">
                    <button
                      type="button"
                      className={`ap-browser-subtab ${workspaceSubtab === "overview" ? "active" : ""}`}
                      onClick={() => setWorkspaceSubtab("overview")}
                    >
                      <AppstoreOutlined />
                      Overview
                    </button>
                    <button
                      type="button"
                      className={`ap-browser-subtab ${workspaceSubtab === "list" ? "active" : ""}`}
                      onClick={() => setWorkspaceSubtab("list")}
                    >
                      <UnorderedListOutlined />
                      List
                    </button>
                    <button
                      type="button"
                      className={`ap-browser-subtab ${workspaceSubtab === "kanban" ? "active" : ""}`}
                      onClick={() => setWorkspaceSubtab("kanban")}
                    >
                      <AppstoreOutlined />
                      Kanban
                    </button>
                    <button
                      type="button"
                      className={`ap-browser-subtab ${workspaceSubtab === "calendar" ? "active" : ""}`}
                      onClick={() => setWorkspaceSubtab("calendar")}
                    >
                      <CalendarOutlined />
                      Calendar
                    </button>
                    <div className="ap-browser-subtabs-spacer" />
                    <button
                      type="button"
                      className="ap-browser-link-btn"
                      onClick={() => {
                        const taskToEdit = lastCreatedTask || selectedTaskForEdit || firstAvailableTask;
                        if (!taskToEdit?._id || !selectedWorkspaceProject?._id) {
                          message.info("No tasks available to edit.");
                          return;
                        }
                        const listId =
                          taskToEdit?.main_task_id ||
                          taskToEdit?.mainTaskId ||
                          taskToEdit?.main_task?._id ||
                          taskToEdit?.list_id ||
                          taskToEdit?.listId ||
                          "";
                        const base = `/${companySlug}/project/app/${selectedWorkspaceProject._id}?tab=Tasks`;
                        const nextUrl = listId ? `${base}&listID=${listId}` : base;
                        history.push(nextUrl);
                      }}
                    >
                      Customize
                    </button>
                  </div>

                  {workspaceSubtab === "overview" && (
                    <div className="ap-browser-overview">
                    <div className="ap-browser-overview-grid">
                      <div className="ap-browser-card ap-browser-date-card">
                        <div className="ap-browser-date-block">
                          <div className="ap-browser-date-icon"><CalendarOutlined /></div>
                          <div>
                            <div className="ap-browser-card-label">Starts</div>
                            <div className="ap-browser-card-value">
                              {selectedWorkspaceProject?.start_date ? moment(selectedWorkspaceProject.start_date).format("DD/MM/YYYY") : "N/A"}
                            </div>
                          </div>
                        </div>
                        <div className="ap-browser-arrow">→</div>
                        <div>
                          <div className="ap-browser-card-label">Ends</div>
                          <div className="ap-browser-card-value">
                            {selectedWorkspaceProject?.end_date ? moment(selectedWorkspaceProject.end_date).format("DD/MM/YYYY") : "N/A"}
                          </div>
                          <div className="ap-browser-updated">
                            Last updated on {selectedWorkspaceProject?.updatedAt ? moment(selectedWorkspaceProject.updatedAt).format("MMM D, YYYY") : "recently"}
                          </div>
                        </div>
                      </div>

                      <div className="ap-browser-card ap-browser-priority-card">
                        <div className="ap-browser-card-title">Task Snapshot</div>
                        <div className="ap-browser-priority-grid">
                          <div><span>Closed</span><strong>{selectedWorkspaceStats?.closed ?? 0}</strong></div>
                          <div><span>Today</span><strong>{selectedWorkspaceStats?.today ?? 0}</strong></div>
                          <div><span>Over Due</span><strong>{selectedWorkspaceStats?.overDue ?? 0}</strong></div>
                          <div><span>Upcoming</span><strong>{selectedWorkspaceStats?.upComing ?? 0}</strong></div>
                        </div>
                        <div className="ap-browser-donut-wrap">
                          <DonutChart percentage={selectedWorkspaceProject?.completionPercentage || 0} size={92} />
                        </div>
                      </div>
                    </div>

                    <div className="ap-browser-card">
                      <div className="ap-browser-card-title">Project Members ({(selectedWorkspaceProject?.assignees?.length || 0) + (selectedWorkspaceProject?.manager ? 1 : 0) + (selectedWorkspaceProject?.pms_clients?.length || 0)})</div>
                      <div className="ap-browser-member-tabs">
                        <span className="active">Staff member ({selectedWorkspaceProject?.assignees?.length || 0})</span>
                        <span>Project Manager ({selectedWorkspaceProject?.manager ? 1 : 0})</span>
                        <span>Co-member (0)</span>
                        <span>Client ({selectedWorkspaceProject?.pms_clients?.length || 0})</span>
                      </div>
                      <div className="ap-browser-member-grid">
                        {selectedWorkspaceProject?.assignees?.map((member) => (
                          <div key={member?._id || member?.name} className="ap-browser-member-card">
                            <MyAvatar
                              src={member?.emp_img}
                              alt={member?.name}
                              userName={member?.name}
                            />
                            <div className="ap-browser-member-name">{member?.name}</div>
                            <div className="ap-browser-member-role">Staff Member</div>
                          </div>
                        ))}
                        {selectedWorkspaceProject?.manager && (
                          <div className="ap-browser-member-card">
                            <MyAvatar
                              src={selectedWorkspaceProject.manager?.emp_img}
                              alt={selectedWorkspaceProject.manager?.full_name}
                              userName={selectedWorkspaceProject.manager?.full_name}
                            />
                            <div className="ap-browser-member-name">{selectedWorkspaceProject.manager?.full_name}</div>
                            <div className="ap-browser-member-role">Project Manager</div>
                          </div>
                        )}
                        {selectedWorkspaceProject?.pms_clients?.map((client) => (
                          <div key={client?._id || client?.full_name} className="ap-browser-member-card">
                            <MyAvatar
                              src={client?.emp_img}
                              alt={client?.full_name}
                              userName={client?.full_name}
                            />
                            <div className="ap-browser-member-name">{client?.full_name}</div>
                            <div className="ap-browser-member-role">Client</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="ap-browser-card ap-browser-chart-card">
                      <div className="ap-browser-card-title">User Analysis</div>
                      <div className="ap-browser-chart">
                        <ReactApexChart options={userAnalysisOptions} series={userAnalysisSeries} type="bar" height={320} />
                      </div>
                    </div>

                    <div className="ap-browser-card ap-browser-status-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, overflow: "visible", paddingBottom: 30 }}>
                      <div>
                        <div className="ap-browser-card-title">Status Analysis</div>
                        <div className="ap-browser-status-metrics">
                          <div className="ap-browser-status-item">
                            <span className="ap-browser-status-bar ap-browser-status-bar--closed" />
                            <div>
                              <span className="ap-browser-status-label ap-browser-status-label--closed">Closed</span>
                              <strong className="ap-browser-status-value">{closedCount}</strong>
                            </div>
                          </div>
                          <div className="ap-browser-status-item">
                            <span className="ap-browser-status-bar ap-browser-status-bar--pending" />
                            <div>
                              <span className="ap-browser-status-label ap-browser-status-label--pending">Pending</span>
                              <strong className="ap-browser-status-value">{pendingCount}</strong>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div style={{ flexShrink: 0 }}>
                        <ReactApexChart options={statusChartOptions} series={statusChartSeries} type="donut" height={220} width={220} />
                      </div>
                    </div>

                    <div className="ap-browser-card">
                      <div className="ap-browser-card-title">Details</div>
                      <div className="ap-browser-details-text">
                        {selectedWorkspaceProject?.descriptions ? (
                          <div
                            dangerouslySetInnerHTML={{ __html: selectedWorkspaceProject.descriptions }}
                          />
                        ) : (
                          "No details provided for this project."
                        )}
                      </div>
                    </div>
                    </div>
                  )}

                  {workspaceSubtab === "list" && (
                    <div className="ap-browser-list">
                      <div className="ap-browser-list-header">
                        <div>Task Name</div>
                        <div>Due Date</div>
                        <div>Assignee(s)</div>
                        <div>Status</div>
                      </div>

                      {isLoadingTasks ? (
                        <div className="ap-browser-list-empty">Loading tasks...</div>
                      ) : (
                        [
                          { key: "today", label: "Today", items: todayTasks },
                          { key: "overdue", label: "Overdue", items: overdueTasks },
                          { key: "upcoming", label: "Upcoming", items: upcomingTasks },
                        ].map((section) => (
                          <div key={section.key} className="ap-browser-list-group">
                            <div className="ap-browser-list-group-title">
                              <span>{section.label}</span>
                              <span className="ap-browser-list-count">{section.items.length}</span>
                            </div>
                            {section.items.length === 0 ? (
                              <div className="ap-browser-list-empty">No tasks</div>
                            ) : (
                              section.items.map((task) => (
                                <div
                                  key={task._id || task.id}
                                  className={`ap-browser-list-row ${
                                    selectedTaskForEdit?._id === (task._id || task.id) ? "ap-browser-list-row--active" : ""
                                  }`}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => setSelectedTaskForEdit(task)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") setSelectedTaskForEdit(task);
                                  }}
                                >
                                  <div className="ap-browser-task-name">{task.title || task.name || "Untitled"}</div>
                                  <div>{task.due_date ? moment(task.due_date).format("MMM D, YYYY") : "-"}</div>
                                  <div>-</div>
                                  <div>
                                    <span className="ap-browser-status-pill">Pending</span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {workspaceSubtab === "kanban" && (
                    <div className="ap-browser-kanban">
                      <div className="ap-browser-kanban-toolbar">
                        <div className="ap-browser-kanban-select">Select Pipeline</div>
                        <div className="ap-browser-kanban-divider" />
                        <div className="ap-browser-kanban-stages">Stages</div>
                        <div className="ap-browser-kanban-spacer" />
                        <div className="ap-browser-kanban-setting">Setting</div>
                      </div>
                      <div className="ap-browser-kanban-empty">
                        <div className="ap-browser-kanban-icon">⋯</div>
                        <div>Please Select OR Set Pipeline</div>
                      </div>
                    </div>
                  )}

                  {workspaceSubtab === "calendar" && (
                    <div className="ap-browser-calendar">
                      <div className="ap-browser-calendar-header">
                        <div className="ap-browser-calendar-title">{dayjs().format("MMMM YYYY")}</div>
                        <div className="ap-browser-calendar-controls">
                          <button type="button" className="ap-browser-calendar-btn">Today</button>
                          <button type="button" className="ap-browser-calendar-btn">Month</button>
                          <button type="button" className="ap-browser-calendar-btn">Week</button>
                          <button type="button" className="ap-browser-calendar-btn">Day</button>
                        </div>
                      </div>
                      <div className="ap-browser-calendar-grid">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                          <div key={d} className="ap-browser-calendar-cell ap-browser-calendar-head">{d}</div>
                        ))}
                        {calendarDays.map((day) => {
                          const dayTasks = tasksForDate(day);
                          const isCurrentMonth = day.month() === calendarBase.month();
                          return (
                            <div key={day.format("YYYY-MM-DD")} className="ap-browser-calendar-cell">
                              <span className={`ap-browser-calendar-date ${isCurrentMonth ? "" : "muted"}`}>
                                {day.date()}
                              </span>
                              {!isLoadingTasks && dayTasks.slice(0, 2).map((task) => (
                                <div key={task._id || task.id} className="ap-browser-calendar-task">
                                  {task.title || task.name || "Untitled"}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="ap-empty-state">
                  <Empty description="No projects found" />
                </div>
              )}
            </section>
          </div>
        )}
      </div>

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

      <Modal
        open={isCustomizeOpen}
        onCancel={() => setIsCustomizeOpen(false)}
        footer={null}
        title="Customize"
        destroyOnClose
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 14, color: "#475569" }}>
            Customize options will appear here.
          </div>
          <Button type="primary" onClick={() => setIsCustomizeOpen(false)}>
            Done
          </Button>
        </div>
      </Modal>

      <AddTaskModal
        open={isAddTaskOpen}
        onCancel={() => {
          setIsAddTaskOpen(false);
          addTaskForm.resetFields();
        }}
        onSuccess={(createdTask) => {
          setIsAddTaskOpen(false);
          addTaskForm.resetFields();
          if (createdTask?._id) {
            setLastCreatedTask(createdTask);
          }
          if (selectedWorkspaceProject?._id) {
            if (createdTask?._id) {
              setProjectTasksMap((prev) => {
                const existing = prev[selectedWorkspaceProject._id] || [];
                const already = existing.some((t) => t?._id === createdTask._id);
                if (already) return prev;
                return {
                  ...prev,
                  [selectedWorkspaceProject._id]: [createdTask, ...existing],
                };
              });

              // Optimistically bump snapshot counts so Overview updates immediately
              const due = createdTask?.due_date
                ? dayjs(createdTask.due_date)
                : createdTask?.end_date
                  ? dayjs(createdTask.end_date)
                  : null;
              const todayKey = dayjs().format("YYYY-MM-DD");
              let bumpKey = null;
              if (due && due.isValid()) {
                const dueKey = due.format("YYYY-MM-DD");
                if (dueKey === todayKey) bumpKey = "today";
                else if (due.isBefore(dayjs(), "day")) bumpKey = "overDue";
                else if (due.isAfter(dayjs(), "day")) bumpKey = "upComing";
              }
              if (bumpKey) {
                setTaskStats((prev) => {
                  const curr = prev[selectedWorkspaceProject._id] || {};
                  const nextStats = {
                    ...curr,
                    [bumpKey]: (curr[bumpKey] || 0) + 1,
                  };
                  return { ...prev, [selectedWorkspaceProject._id]: nextStats };
                });
                setProjectCache((prev) => {
                  const next = { ...prev };
                  Object.keys(next).forEach((key) => {
                    const entry = next[key];
                    if (!entry || !entry.taskStats) return;
                    const curr = entry.taskStats[selectedWorkspaceProject._id] || {};
                    next[key] = {
                      ...entry,
                      taskStats: {
                        ...entry.taskStats,
                        [selectedWorkspaceProject._id]: {
                          ...curr,
                          [bumpKey]: (curr[bumpKey] || 0) + 1,
                        },
                      },
                    };
                  });
                  return next;
                });
              }
            }
            fetchProjectTasksForce(selectedWorkspaceProject._id);
            refreshTaskStatsForProject(selectedWorkspaceProject._id);
            setTimeout(() => {
              fetchProjectTasksForce(selectedWorkspaceProject._id);
              refreshTaskStatsForProject(selectedWorkspaceProject._id);
            }, 600);
          }
        }}
        standalone
        projectId={selectedWorkspaceProject?._id}
        addform={addTaskForm}
        projectMembers={workspaceMembers}
        projectWorkflowId={selectedWorkspaceProject?.workFlow?._id}
      />
    </div>
  );
};

export default AssignProject;
