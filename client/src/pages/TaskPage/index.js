import React, { useState, useCallback, useEffect, useMemo, useRef, Suspense, lazy } from "react";
import { Input, Select, Checkbox, Avatar, Modal, message, Popover, Button, Radio, Badge, Divider, Spin } from "antd";
import {
  SearchOutlined,
  PlusOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  CalendarOutlined,
  FilterOutlined,
  FlagOutlined,
  MessageOutlined,
  BarChartOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useHistory, useLocation } from "react-router-dom";
import dayjs from "dayjs";
import Service from "../../service";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import { useDispatch } from "react-redux";
import { getRoles } from "../../util/hasPermission";
import AddTaskModal from "../Tasks/AddTaskModal";
import CommonTaskFormModal from "../Tasks/CommonTaskFormModal";
import TasksGanttView from "../Tasks/TasksGanttView";
import { TaskPageSkeleton } from "../../components/common/SkeletonLoader";
import NoDataFoundIcon from "../../components/common/NoDataFoundIcon";
import "./TaskPage.css";

const TaskDetailModal = lazy(() => import("./TaskDetailModal"));

const { Option } = Select;

const SECTION_PAGE_LIMIT = 25;

const DATE_PRESET_LABELS = {
  any: "Date Type",
  today: "Today",
  this_week: "This Week",
  this_month: "This Month",
  next_7_days: "Next 7 Days",
  overdue: "Overdue",
};
const SORT_MODE_LABELS = {
  default: "Default",
  due_asc: "Due Date ↑",
  due_desc: "Due Date ↓",
  title_asc: "A to Z",
  title_desc: "Z to A",
};

const TASK_STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "incomplete", label: "Incomplete" },
  { value: "completed", label: "Completed" },
];

const TASK_SORT_OPTIONS = Object.entries(SORT_MODE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const TASK_DATE_OPTIONS = Object.entries(DATE_PRESET_LABELS)
  .filter(([value]) => value !== "any")
  .map(([value, label]) => ({ value, label }));

const CALENDAR_MONTH_OPTIONS = dayjs.months().map((label, value) => ({
  value,
  label,
}));

function updateCalendarMonthYear(currentDate, nextMonth, nextYear) {
  const targetYear = Number.isInteger(nextYear) ? nextYear : currentDate.year();
  const targetMonth = Number.isInteger(nextMonth) ? nextMonth : currentDate.month();
  const safeDay = Math.min(currentDate.date(), dayjs().year(targetYear).month(targetMonth).daysInMonth());

  return currentDate.year(targetYear).month(targetMonth).date(safeDay);
}

function getTaskProjectId(task) {
  return (
    task?.project?._id ||
    task?.project?.id ||
    task?.project_id?._id ||
    task?.project_id?.id ||
    task?.project_id ||
    ""
  );
}

function getTaskProjectTitle(task) {
  const p = task?.project;
  const pid = task?.project_id;
  if (typeof p === "object" && p?.title) return p.title;
  if (typeof p === "object" && p?.name) return p.name;
  if (typeof pid === "object" && pid?.title) return pid.title;
  if (typeof pid === "object" && pid?.name) return pid.name;
  return "—";
}

function mergeSectionKeysFromTotals(statusTotals) {
  const order = ["todo", "inprogress", "onhold", "done"];
  const keys = new Set(order);
  Object.keys(statusTotals || {}).forEach((k) => {
    if (k && k !== "_none_") keys.add(k);
  });
  const rest = [...keys].filter((k) => !order.includes(k)).sort();
  return [...order.filter((k) => keys.has(k)), ...rest];
}

function mapTaskToEditFormInitial(task) {
  if (!task) return {};
  const projectId = getTaskProjectId(task);
  const mainTaskId =
    (typeof task?.mainTask === "object" && task.mainTask?._id) ||
    (typeof task?.main_task_id === "object" && task.main_task_id?._id) ||
    task?.main_task_id ||
    undefined;
  const assigneeIds = (Array.isArray(task.assignees) ? task.assignees : [])
    .map((a) => (typeof a === "object" ? a._id || a.id : a))
    .filter(Boolean);
  const rawLabels = task.taskLabels || task.task_labels || [];
  const labelIds = (Array.isArray(rawLabels) ? rawLabels : [])
    .map((l) => (typeof l === "object" ? l._id || l.id : l))
    .filter(Boolean);
  const due = task.due_date || task.end_date;
  return {
    title: task.title || "",
    description: task.descriptions || "",
    project_id: projectId || undefined,
    main_task_id: mainTaskId,
    assignees: assigneeIds,
    task_labels: labelIds,
    start_date: task.start_date ? dayjs(task.start_date) : undefined,
    end_date: due ? dayjs(due) : undefined,
    priority: task.priority || "Low",
    custom_fields: task.custom_fields && typeof task.custom_fields === "object" ? { ...task.custom_fields } : {},
  };
}

function isCompletedTask(task) {
  const statusTitle = String(task?.task_status?.title || task?.task_status?.name || task?.status || "").toLowerCase();
  return statusTitle.includes("done") || statusTitle.includes("complete") || statusTitle.includes("closed");
}

function isTaskAssignedToUser(task, userId) {
  if (!userId) return false;
  const assignees = Array.isArray(task?.assignees) ? task.assignees : [];
  return assignees.some((assignee) => {
    const assigneeId = typeof assignee === "object" ? assignee?._id || assignee?.id : assignee;
    return String(assigneeId || "") === String(userId);
  });
}

function matchesDatePreset(task, presetKey) {
  if (!presetKey || presetKey === "any") return true;

  const today = dayjs().startOf("day");
  const due = task?.due_date ? dayjs(task.due_date).startOf("day") : null;
  const start = task?.start_date ? dayjs(task.start_date).startOf("day") : null;
  const reference = due || start;

  if (presetKey === "today") {
    return Boolean((due && due.isSame(today, "day")) || (start && start.isSame(today, "day")));
  }

  if (presetKey === "this_week") {
    const weekStart = today.startOf("week");
    const weekEnd = today.endOf("week");
    return Boolean(reference && !reference.isBefore(weekStart, "day") && !reference.isAfter(weekEnd, "day"));
  }

  if (presetKey === "this_month") {
    return Boolean(reference && reference.isSame(today, "month"));
  }

  if (presetKey === "next_7_days") {
    const end = today.add(7, "day");
    return Boolean(reference && !reference.isBefore(today, "day") && !reference.isAfter(end, "day"));
  }

  if (presetKey === "overdue") {
    return Boolean(due && due.isBefore(today, "day") && !isCompletedTask(task));
  }

  return true;
}

/** Get display name from assignee (populated object or raw id) */
function getAssigneeName(a) {
  if (!a) return "";
  if (typeof a === "object") {
    if (a.full_name && String(a.full_name).trim()) return a.full_name.trim();
    const first = a.first_name ? String(a.first_name).trim() : "";
    const last = a.last_name ? String(a.last_name).trim() : "";
    return [first, last].filter(Boolean).join(" ") || "—";
  }
  return "";
}

/** Get list of assignee display names for a task */
function getAssigneesDisplay(assignees) {
  if (!Array.isArray(assignees) || assignees.length === 0) return [];
  return assignees.map(getAssigneeName).filter(Boolean);
}

/** Parse URL search into filter state so first fetch uses correct params (avoids race with useEffect) */
function getTaskPageStateFromSearch(search, isAdmin) {
  const params = new URLSearchParams(search || "");
  const filter = params.get("filter");
  const viewParam = params.get("view");
  const sectionParam = params.get("section");
  const kanbanStatusParam = params.get("kanbanStatus");
  const statusParam = params.get("status");
  const projectParam = params.get("project") || params.get("projectId") || "";

  const view =
    viewParam && ["list", "kanban", "calendar", "gantt"].includes(viewParam) ? viewParam : null;
  const section =
    sectionParam && ["today", "overdue", "upcoming"].includes(sectionParam) ? sectionParam : null;
  const kanbanStatus = kanbanStatusParam ? String(kanbanStatusParam).trim() : null;

  const projectIds = projectParam
    ? String(projectParam)
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
    : [];

  let base = { viewAll: true, statusFilter: "all", taskStartDate: null, taskEndDate: null };

  if (filter === "assigned_to_me") {
    base = { viewAll: false, statusFilter: "all", taskStartDate: null, taskEndDate: null };
  } else if (filter === "due_today") {
    const today = dayjs().format("YYYY-MM-DD");
    base = { viewAll: isAdmin, statusFilter: "all", taskStartDate: today, taskEndDate: today };
  } else if (filter === "past_due") {
    const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");
    base = { viewAll: isAdmin, statusFilter: "incomplete", taskStartDate: null, taskEndDate: yesterday };
  } else if (filter === "all") {
    base = { viewAll: isAdmin, statusFilter: "all", taskStartDate: null, taskEndDate: null };
  }

  const finalStatus =
    statusParam && ["all", "incomplete", "completed"].includes(statusParam) ? statusParam : base.statusFilter;

  return {
    ...base,
    statusFilter: finalStatus,
    taskStartDate: base.taskStartDate,
    taskEndDate: base.taskEndDate,
    projectIds,
    view,
    section,
    kanbanStatus,
  };
}

function getDatePresetFromState(startDate, endDate) {
  const today = dayjs().format("YYYY-MM-DD");
  const weekStart = dayjs().startOf("week").format("YYYY-MM-DD");
  const weekEnd = dayjs().endOf("week").format("YYYY-MM-DD");
  const monthStart = dayjs().startOf("month").format("YYYY-MM-DD");
  const monthEnd = dayjs().endOf("month").format("YYYY-MM-DD");
  const next7End = dayjs().add(7, "day").format("YYYY-MM-DD");
  const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");

  if (!startDate && !endDate) return "any";
  if (startDate === today && endDate === today) return "today";
  if (startDate === weekStart && endDate === weekEnd) return "this_week";
  if (startDate === monthStart && endDate === monthEnd) return "this_month";
  if (startDate === today && endDate === next7End) return "next_7_days";
  if (!startDate && endDate === yesterday) return "overdue";
  return "any";
}

function sortTaskList(items, sortMode) {
  if (sortMode === "default") return items;

  const sorted = [...items];
  sorted.sort((a, b) => {
    if (sortMode === "title_asc") {
      return String(a?.title || "").localeCompare(String(b?.title || ""));
    }
    if (sortMode === "title_desc") {
      return String(b?.title || "").localeCompare(String(a?.title || ""));
    }

    const aDue = a?.due_date ? dayjs(a.due_date).valueOf() : Number.POSITIVE_INFINITY;
    const bDue = b?.due_date ? dayjs(b.due_date).valueOf() : Number.POSITIVE_INFINITY;

    if (sortMode === "due_asc") return aDue - bDue;
    if (sortMode === "due_desc") return bDue - aDue;
    return 0;
  });
  return sorted;
}

function normalizeKanbanStatusKey(status) {
  const title = String(status?.title || status?.name || status || "").toLowerCase();
  const compact = title.replace(/[\s_-]+/g, "");

  if (compact.includes("todo")) return "todo";
  if (compact.includes("inprogress") || title.includes("progress")) return "inprogress";
  if (compact.includes("onhold") || title.includes("hold") || title.includes("review")) return "onhold";
  if (title.includes("done") || title.includes("complete") || title.includes("closed")) return "done";

  return title.trim() || "_none_";
}

function getKanbanStatusMeta(status) {
  const key = normalizeKanbanStatusKey(status);

  if (key === "todo") {
    return { key, title: "To-Do", color: "#64748b" };
  }
  if (key === "inprogress") {
    return { key, title: "In Progress", color: "#ef4444" };
  }
  if (key === "onhold") {
    return { key, title: "On Hold", color: "#f59e0b" };
  }
  if (key === "done") {
    return { key, title: "Done", color: "#22c55e" };
  }

  return {
    key,
    title: status?.title || status?.name || "No status",
    color: status?.color || "#d9d9d9",
  };
}

function TaskCombinedFacetFilter({
  statusFilter,
  setStatusFilter,
  projectFilter,
  setProjectFilter,
  projects,
  isAdmin,
  viewAll,
  setViewAll,
  sortMode,
  setSortMode,
  datePreset,
  applyDatePreset,
  onProjectSearch,
  onProjectScroll,
  isFetchingProjects,
  projectSearch
}) {

  const FILTER_SECTIONS = [
    { key: "status", label: "Status", defaultValue: "all", options: TASK_STATUS_OPTIONS },
    { key: "project", label: "Project", defaultValue: [], options: projects || [], mode: "multiple" },
    ...(isAdmin
      ? [
        {
          key: "scope",
          label: "Task Scope",
          defaultValue: true,
          options: [
            { value: true, label: "All Tasks" },
            { value: false, label: "My Tasks" },
          ],
        },
      ]
      : []),
    { key: "sort", label: "Default", defaultValue: "default", options: TASK_SORT_OPTIONS },
    { key: "date", label: "Date Type", defaultValue: "any", options: TASK_DATE_OPTIONS },
  ];

  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("status");
  const [draftFilters, setDraftFilters] = useState({
    status: statusFilter || "all",
    project: Array.isArray(projectFilter) ? projectFilter : [],
    scope: Boolean(viewAll),
    sort: sortMode || "default",
    date: datePreset || "any",
  });

  useEffect(() => {
    if (!open) {
      setDraftFilters({
        status: statusFilter || "all",
        project: Array.isArray(projectFilter) ? projectFilter : [],
        scope: Boolean(viewAll),
        sort: sortMode || "default",
        date: datePreset || "any",
      });
    }
  }, [datePreset, open, projectFilter, sortMode, statusFilter, viewAll]);

  const activeCount = useMemo(() => {
    let count = 0;
    if (statusFilter && statusFilter !== "all") count += 1;
    if (Array.isArray(projectFilter) && projectFilter.length > 0) count += 1;
    if (isAdmin && Boolean(viewAll) !== true) count += 1;
    if (sortMode && sortMode !== "default") count += 1;
    if (datePreset && datePreset !== "any") count += 1;
    return count;
  }, [datePreset, isAdmin, projectFilter, sortMode, statusFilter, viewAll]);

  const activeConfig = FILTER_SECTIONS.find((section) => section.key === activeSection) || FILTER_SECTIONS[0];

  const handleApply = () => {
    setStatusFilter(draftFilters.status || "all");
    setProjectFilter(Array.isArray(draftFilters.project) ? draftFilters.project : []);
    if (isAdmin) {
      setViewAll(Boolean(draftFilters.scope));
    }
    setSortMode(draftFilters.sort || "default");
    applyDatePreset(draftFilters.date || "any");
    setOpen(false);
  };

  const handleReset = () => {
    setDraftFilters((prev) => ({
      ...prev,
      [activeSection]: activeConfig.defaultValue,
    }));
  };

  const panel = (
    <div className="task-shared-filter-popover">
      <div className="filter-sidebar">
        <div className="filter-header">
          <h4 className="filter-sidebar-title">Filters</h4>
        </div>
        <Divider style={{ margin: "8px 0" }} />
        {FILTER_SECTIONS.map((section) => {
          const currentValue = draftFilters[section.key];
          const isSelected = Array.isArray(currentValue)
            ? currentValue.length > 0
            : currentValue !== section.defaultValue;

          return (
            <div
              key={section.key}
              onClick={() => setActiveSection(section.key)}
              className={`filter-menu-item ${activeSection === section.key ? "active" : ""}`}
            >
              <span>{section.label}</span>
              {isSelected ? <Badge size="small" color="#1890ff" /> : null}
            </div>
          );
        })}
      </div>

      <div className="filter-content">
        <div className="filter-content-inner">
          <h4 className="filter-title">{activeConfig.label}</h4>
          {activeSection === "project" ? (
            <div className="task-filter-panel-select-wrap">
              <Input
                allowClear
                placeholder="Search project"
                value={projectSearch}
                onChange={(e) => onProjectSearch(e.target.value)}
                style={{ marginBottom: 10 }}
              />
              <div
                className="task-filter-project-list"
                style={{
                  maxHeight: 280,
                  overflowY: "auto",
                  border: "1px solid #e8e8e8",
                  borderRadius: 6,
                  padding: 8,
                  background: "#fff",
                }}
                onScroll={onProjectScroll}
              >
                {(projects || []).length > 0 ? (
                  projects.map((project) => {
                    const projectId = String(project._id || project.id || project.projectId || "");
                    const selected = Array.isArray(draftFilters.project)
                      ? draftFilters.project.some((id) => String(id) === projectId)
                      : false;

                    return (
                      <div
                        key={projectId}
                        className={`task-project-list-item${selected ? " selected" : ""}`}
                        onClick={() => {
                          setDraftFilters((prev) => {
                            const current = Array.isArray(prev.project) ? prev.project : [];
                            const next = selected
                              ? current.filter((id) => String(id) !== projectId)
                              : [...current, projectId];
                            return {
                              ...prev,
                              project: next,
                            };
                          });
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 10px",
                          borderRadius: 4,
                          cursor: "pointer",
                          background: selected ? "#f0f7ff" : "transparent",
                          marginBottom: 4,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <Checkbox checked={selected} />
                          <span style={{ marginLeft: 8, color: "#262626" }}>{project.title || project.projectId || "Untitled project"}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: 18, textAlign: "center", color: "#8c8c8c" }}>
                    {isFetchingProjects ? "Loading projects..." : "No projects found."}
                  </div>
                )}
                {isFetchingProjects && (projects || []).length > 0 && (
                  <div style={{ padding: 10, textAlign: "center" }}>
                    <Badge status="processing" text="Loading more..." />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Radio.Group
              value={draftFilters[activeSection]}
              onChange={(e) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  [activeSection]: e.target.value,
                }))
              }
              style={{ display: "flex", flexDirection: "column" }}
            >
              {activeConfig.options.map((opt) => (
                <div
                  key={opt.value}
                  className={`assignee-item${draftFilters[activeSection] === opt.value ? " selected" : ""}`}
                  onClick={() =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      [activeSection]: opt.value,
                    }))
                  }
                  style={{ cursor: "pointer" }}
                >
                  <Radio value={opt.value}>
                    <span style={{ color: "#374151", fontWeight: 500 }}>{opt.label}</span>
                  </Radio>
                </div>
              ))}
            </Radio.Group>
          )}
          <div className="filter-actions">
            <Button size="small" className="filter-btn" onClick={handleApply}>
              Apply Filter
            </Button>
            <Button size="small" className="delete-btn" onClick={handleReset}>
              Reset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Popover
      content={panel}
      trigger="click"
      open={open}
      onOpenChange={(visible) => {
        if (visible) {
          setDraftFilters({
            status: statusFilter || "all",
            project: Array.isArray(projectFilter) ? projectFilter : [],
            scope: Boolean(viewAll),
            sort: sortMode || "default",
            date: datePreset || "any",
          });
        }
        setOpen(visible);
      }}
      placement="bottomLeft"
      overlayClassName="task-shared-filter-overlay"
    >
      <Button icon={<FilterOutlined />} className="task-combined-filter-btn filter-btn">
        Filter
        {activeCount > 0 ? (
          <Badge count={activeCount} size="small" offset={[6, 0]} color="#1890ff" />
        ) : null}
      </Button>
    </Popover>
  );
}

const TaskPage = () => {
  const dispatch = useDispatch();
  const history = useHistory();
  const location = useLocation();
  const companySlug = localStorage.getItem("companyDomain");
  const isAdmin = getRoles(["Admin"]);
  const currentUserId = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user_data") || "{}")?._id || "";
    } catch (error) {
      return "";
    }
  }, []);

  const filterState = getTaskPageStateFromSearch(location.search, isAdmin);

  const [view, setView] = useState(filterState.view || "list"); // list | kanban | calendar | gantt
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(filterState.statusFilter);
  const [projectFilter, setProjectFilter] = useState(filterState.projectIds || []);
  const [viewAll, setViewAll] = useState(filterState.viewAll);
  const [taskStartDate, setTaskStartDate] = useState(filterState.taskStartDate);
  const [taskEndDate, setTaskEndDate] = useState(filterState.taskEndDate);
  const [ganttAppliedDefaultRange, setGanttAppliedDefaultRange] = useState(false);
  const [sortMode, setSortMode] = useState("default");
  const [datePreset, setDatePreset] = useState(
    getDatePresetFromState(filterState.taskStartDate, filterState.taskEndDate)
  );
  const [kanbanStatusFilter, setKanbanStatusFilter] = useState(filterState.kanbanStatus);
  const [calendarMode, setCalendarMode] = useState("month");
  const [calendarDate, setCalendarDate] = useState(dayjs());
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [taskDetailModalOpen, setTaskDetailModalOpen] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const [dragOverColumnId, setDragOverColumnId] = useState(null);
  const [statusTotals, setStatusTotals] = useState({});
  const [sectionBuckets, setSectionBuckets] = useState({});
  const [listSectionIds, setListSectionIds] = useState(["todo", "inprogress", "onhold", "done"]);
  const [editTaskModalOpen, setEditTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const tasksContainerRef = React.useRef(null);
  const sectionBucketsRef = useRef({});
  const listSectionLoadGuardRef = useRef(new Set());

  useEffect(() => {
    sectionBucketsRef.current = sectionBuckets;
  }, [sectionBuckets]);


  // Project select infinite loading state
  const [projectSearch, setProjectSearch] = useState("");
  const [projectPagination, setProjectPagination] = useState({ pageNo: 1, limit: 25 });
  const [hasMoreProjects, setHasMoreProjects] = useState(true);
  const [isFetchingProjects, setIsFetchingProjects] = useState(false);
  const isFetchingRef = React.useRef(false);



  const calendarYearOptions = useMemo(() => {
    const currentYear = dayjs().year();
    return Array.from({ length: 21 }, (_, index) => currentYear - 10 + index);
  }, []);

  // Sync state when URL changes (e.g. user navigates to same page with different filter)
  useEffect(() => {
    const next = getTaskPageStateFromSearch(location.search, isAdmin);
    setViewAll(next.viewAll);
    setStatusFilter(next.statusFilter);
    setTaskStartDate(next.taskStartDate);
    setTaskEndDate(next.taskEndDate);
    setDatePreset(getDatePresetFromState(next.taskStartDate, next.taskEndDate));
    setProjectFilter(next.projectIds || []);
    setKanbanStatusFilter(next.kanbanStatus);
    setGanttAppliedDefaultRange(false);
    if (next.view) setView(next.view);
  }, [location.search, isAdmin]);


  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchProjects = useCallback(async (page = 1, searchStr = "", append = false) => {
    if (isFetchingRef.current) return;
    
    isFetchingRef.current = true;
    setIsFetchingProjects(true);
    try {
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.myProjects,
        body: {
          pageNo: page,
          limit: 25,
          search: searchStr,
        },
      });
      
      if (res?.status === 200 && Array.isArray(res?.data?.data)) {
        const newProjects = res.data.data;
        setProjects(prev => append ? [...prev, ...newProjects] : newProjects);
        setHasMoreProjects(newProjects.length === 25);
        setProjectPagination(prev => ({ ...prev, pageNo: page }));
      } else {
        if (!append) setProjects([]);
        setHasMoreProjects(false);
      }
    } catch (e) {
      console.error("fetchProjects", e);
    } finally {
      isFetchingRef.current = false;
      setIsFetchingProjects(false);
    }
  }, []);


  // Handle project search
  const onProjectSearch = useCallback((val) => {
    setProjectSearch(val);
    setProjectPagination({ pageNo: 1, limit: 25 });
    fetchProjects(1, val, false);
  }, [fetchProjects]);

  // Handle project dropdown scroll
  const onProjectScroll = useCallback((e) => {
    const { scrollTop, offsetHeight, scrollHeight } = e.target;
    if (scrollHeight - scrollTop - offsetHeight < 10 && hasMoreProjects && !isFetchingProjects) {
      fetchProjects(projectPagination.pageNo + 1, projectSearch, true);
    }
  }, [fetchProjects, hasMoreProjects, isFetchingProjects, projectPagination.pageNo, projectSearch]);


  const buildTaskListFilterBody = useCallback(
    () => ({
      search: debouncedSearch.trim() || undefined,
      status: statusFilter,
      project_id: projectFilter?.length ? projectFilter : undefined,
      view_all: isAdmin ? viewAll : false,
      ...(taskStartDate ? { start_date: taskStartDate } : {}),
      ...(taskEndDate ? { end_date: taskEndDate } : {}),
    }),
    [debouncedSearch, statusFilter, projectFilter, viewAll, isAdmin, taskStartDate, taskEndDate]
  );

  const initializeBoardData = useCallback(async () => {
    setLoading(true);
    dispatch(showAuthLoader());
    listSectionLoadGuardRef.current = new Set();
    try {
      const metaRes = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.taskList,
        body: {
          ...buildTaskListFilterBody(),
          metadata_only: true,
        },
      });
      if (metaRes?.status !== 200) {
        setStatusTotals({});
        setListSectionIds(["todo", "inprogress", "onhold", "done"]);
        setSectionBuckets({});
        return;
      }
      const meta = metaRes?.data?.metadata || {};
      const statusCounts = Array.isArray(meta.statusCounts) ? meta.statusCounts : [];
      const nextStatusTotals = statusCounts.reduce((acc, item) => {
        const key = normalizeKanbanStatusKey({ title: item?.title, name: item?.title });
        acc[key] = Number(acc[key] || 0) + Number(item?.count || 0);
        return acc;
      }, {});
      const sectionOrder = mergeSectionKeysFromTotals(nextStatusTotals);
      setStatusTotals(nextStatusTotals);
      setListSectionIds(sectionOrder);

      const bucketResults = await Promise.all(
        sectionOrder.map((bucketId) =>
          Service.makeAPICall({
            methodName: Service.postMethod,
            api_url: Service.taskList,
            body: {
              ...buildTaskListFilterBody(),
              kanban_bucket: bucketId,
              pageNo: 1,
              limit: SECTION_PAGE_LIMIT,
            },
          }).then((r) => ({ bucketId, r }))
        )
      );

      const nextBuckets = {};
      bucketResults.forEach(({ bucketId, r }) => {
        const raw = r?.status === 200 ? r?.data?.data : [];
        const m = r?.data?.metadata || {};
        const fetchedTasks = Array.isArray(raw) ? raw : [];
        const total = Number(m.total || 0);
        nextBuckets[bucketId] = {
          tasks: fetchedTasks,
          pageNo: 1,
          hasMore: total > fetchedTasks.length,
          loading: false,
          total,
        };
      });
      setSectionBuckets(nextBuckets);
    } catch (e) {
      setStatusTotals({});
      setSectionBuckets({});
    } finally {
      setLoading(false);
      dispatch(hideAuthLoader());
    }
  }, [buildTaskListFilterBody, dispatch]);

  const loadMoreSection = useCallback(
    async (sectionId) => {
      if (!sectionId || listSectionLoadGuardRef.current.has(sectionId)) return;
      const snap = sectionBucketsRef.current[sectionId];
      if (!snap || snap.loading || !snap.hasMore) return;
      listSectionLoadGuardRef.current.add(sectionId);
      setSectionBuckets((prev) => ({
        ...prev,
        [sectionId]: { ...prev[sectionId], loading: true },
      }));
      try {
        const nextPage = (snap.pageNo || 1) + 1;
        const res = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.taskList,
          body: {
            ...buildTaskListFilterBody(),
            kanban_bucket: sectionId,
            pageNo: nextPage,
            limit: SECTION_PAGE_LIMIT,
          },
        });
        const raw = res?.status === 200 ? res?.data?.data : [];
        const m = res?.data?.metadata || {};
        const fetchedTasks = Array.isArray(raw) ? raw : [];
        const total = Number(m.total || 0);
        setSectionBuckets((prev) => {
          const cur = prev[sectionId] || { tasks: [], pageNo: 1, hasMore: false, total: 0, loading: false };
          const merged = [...(cur.tasks || []), ...fetchedTasks];
          return {
            ...prev,
            [sectionId]: {
              tasks: merged,
              pageNo: nextPage,
              hasMore: total > merged.length,
              loading: false,
              total,
            },
          };
        });
      } catch (e) {
        setSectionBuckets((prev) => ({
          ...prev,
          [sectionId]: { ...prev[sectionId], loading: false },
        }));
      } finally {
        listSectionLoadGuardRef.current.delete(sectionId);
      }
    },
    [buildTaskListFilterBody]
  );

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    initializeBoardData();
  }, [initializeBoardData, debouncedSearch, statusFilter, projectFilter, viewAll, taskStartDate, taskEndDate, isAdmin]);

  const handleKanbanColumnScroll = useCallback(
    (e, columnId) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      if (scrollHeight - scrollTop - clientHeight < 50) {
        loadMoreSection(columnId);
      }
    },
    [loadMoreSection]
  );

  const handleListSectionScroll = useCallback(
    (e, sectionId) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      if (scrollHeight - scrollTop - clientHeight < 50) {
        loadMoreSection(sectionId);
      }
    },
    [loadMoreSection]
  );

  const applyDatePreset = useCallback((presetKey) => {
    const today = dayjs();
    setGanttAppliedDefaultRange(false);
    setDatePreset(presetKey);

    switch (presetKey) {
      case "today":
        setTaskStartDate(today.format("YYYY-MM-DD"));
        setTaskEndDate(today.format("YYYY-MM-DD"));
        break;
      case "this_week":
        setTaskStartDate(today.startOf("week").format("YYYY-MM-DD"));
        setTaskEndDate(today.endOf("week").format("YYYY-MM-DD"));
        break;
      case "this_month":
        setTaskStartDate(today.startOf("month").format("YYYY-MM-DD"));
        setTaskEndDate(today.endOf("month").format("YYYY-MM-DD"));
        break;
      case "next_7_days":
        setTaskStartDate(today.format("YYYY-MM-DD"));
        setTaskEndDate(today.add(7, "day").format("YYYY-MM-DD"));
        break;
      case "overdue":
        setTaskStartDate(null);
        setTaskEndDate(today.subtract(1, "day").format("YYYY-MM-DD"));
        break;
      default:
        setTaskStartDate(null);
        setTaskEndDate(null);
        break;
    }
  }, []);

  const handleViewChange = useCallback((nextView) => {
    if (view === "gantt" && nextView !== "gantt" && ganttAppliedDefaultRange) {
      setTaskStartDate(null);
      setTaskEndDate(null);
      setDatePreset("any");
      setGanttAppliedDefaultRange(false);
    }

    setView(nextView);
  }, [ganttAppliedDefaultRange, taskEndDate, taskStartDate, view]);

  const mergedTasksFromBuckets = useMemo(() => {
    const map = new Map();
    listSectionIds.forEach((bucketId) => {
      (sectionBuckets[bucketId]?.tasks || []).forEach((t) => {
        if (t?._id) map.set(t._id, t);
      });
    });
    return Array.from(map.values());
  }, [listSectionIds, sectionBuckets]);

  const filteredTasks = useMemo(() => mergedTasksFromBuckets, [mergedTasksFromBuckets]);

  const sortedTasks = useMemo(() => sortTaskList(filteredTasks, sortMode), [filteredTasks, sortMode]);

  const kanbanColumns = useMemo(() => {
    const statusOrder = ["todo", "inprogress", "onhold", "done"];
    const all = listSectionIds.map((bucketId) => {
      const meta = getKanbanStatusMeta({ title: bucketId, name: bucketId });
      const colTasks = sectionBuckets[bucketId]?.tasks || [];
      const first = colTasks[0];
      return {
        id: bucketId,
        title: meta.title,
        color: meta.color,
        statusId: first?._stId || first?.task_status?._id || null,
        statusMeta: first?.task_status || { title: meta.title, color: meta.color },
        tasks: sortTaskList(colTasks, sortMode),
      };
    }).sort((a, b) => {
      const aIndex = statusOrder.indexOf(a.id);
      const bIndex = statusOrder.indexOf(b.id);
      const normalizedA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
      const normalizedB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
      if (normalizedA !== normalizedB) return normalizedA - normalizedB;
      return a.title.localeCompare(b.title);
    });

    if (!kanbanStatusFilter) return all;

    const needle = normalizeKanbanStatusKey(kanbanStatusFilter);
    const filtered = all.filter(
      (col) =>
        normalizeKanbanStatusKey(col.id) === needle ||
        normalizeKanbanStatusKey(col.title) === needle
    );
    return filtered.length ? filtered : all;
  }, [listSectionIds, sectionBuckets, sortMode, kanbanStatusFilter]);

  // Convert kanbanColumns → format expected by TasksGanttView
  const ganttBoards = useMemo(() =>
    kanbanColumns.map((col) => ({
      workflowStatus: { _id: col.id, title: col.title, color: col.color },
      tasks: col.tasks,
    })),
    [kanbanColumns]);

  const calendarTasksByDate = useMemo(() => {
    const map = {};
    sortedTasks.forEach((t) => {
      if (!t.due_date) return;
      const d = dayjs(t.due_date).format("YYYY-MM-DD");
      if (!map[d]) map[d] = [];
      map[d].push(t);
    });
    return map;
  }, [sortedTasks]);

  const handleOpenEditTask = useCallback((task) => {
    if (!task?._id) return;
    setTaskToEdit(task);
    setEditTaskModalOpen(true);
  }, []);

  const normalizeDateForApi = useCallback((value, withTime = false) => {
    if (!value) return null;
    if (typeof value === "string") return value;
    if (value?.format) return value.format(withTime ? "YYYY-MM-DD HH:mm:ss" : "YYYY-MM-DD");
    return null;
  }, []);

  const uploadTaskFilesForPage = useCallback(async (files = []) => {
    try {
      const validFiles = Array.isArray(files)
        ? files.filter((file) => file instanceof File || file?.originFileObj instanceof File)
        : [];
      if (!validFiles.length) return [];
      const formData = new FormData();
      validFiles.forEach((file) => formData.append("document", file?.originFileObj || file));
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: `${Service.fileUpload}?file_for=task`,
        body: formData,
        options: { "content-type": "multipart/form-data" },
      });
      return Array.isArray(res?.data?.data) ? res.data.data : [];
    } catch (e) {
      return [];
    }
  }, []);

  const handleEditTaskSubmit = useCallback(
    async (values) => {
      const task = taskToEdit;
      if (!task?._id) return;
      setEditSubmitting(true);
      try {
        const projectId = getTaskProjectId(task);
        const mainTaskId =
          (typeof task?.mainTask === "object" && task.mainTask?._id) ||
          (typeof task?.main_task_id === "object" && task.main_task_id?._id) ||
          task?.main_task_id;
        const dynamicCustomFields = { ...(values.custom_fields || {}) };
        for (const field of values.taskFormFields || []) {
          const key = String(field?.key || "");
          if (!key) continue;
          if (["title", "description", "status", "priority", "assignee_id", "labels", "start_date", "end_date", "project_id"].includes(key)) {
            continue;
          }
          if (field?.type === "date" || field?.type === "datetime") {
            dynamicCustomFields[key] = normalizeDateForApi(dynamicCustomFields[key], field?.type === "datetime");
          }
          if (field?.type === "file") {
            const current = dynamicCustomFields[key];
            const maybeFile = Array.isArray(current) ? current[0]?.originFileObj || current[0] : current;
            if (maybeFile instanceof File) {
              const uploaded = await uploadTaskFilesForPage([maybeFile]);
              dynamicCustomFields[key] = uploaded[0] || null;
            } else {
              dynamicCustomFields[key] = null;
            }
          }
        }

        const taskStatusId =
          typeof task?.task_status === "object" ? task.task_status?._id : task?.task_status;

        const reqBody = {
          updated_key: [
            "title",
            "descriptions",
            "task_labels",
            "start_date",
            "due_date",
            "assignees",
            "custom_fields",
            "priority",
            ...(taskStatusId ? ["task_status"] : []),
          ],
          project_id: projectId,
          main_task_id: mainTaskId,
          title: String(values.title || "").trim(),
          descriptions: values.description || "",
          start_date: normalizeDateForApi(values.start_date),
          due_date: normalizeDateForApi(values.end_date),
          assignees: Array.isArray(values.assignees) ? values.assignees : [],
          task_labels: Array.isArray(values.task_labels) ? values.task_labels : [],
          custom_fields: dynamicCustomFields,
          priority: values.priority || "Low",
          ...(taskStatusId ? { task_status: taskStatusId } : {}),
        };

        const res = await Service.makeAPICall({
          methodName: Service.putMethod,
          api_url: `${Service.taskPropUpdation}/${task._id}`,
          body: reqBody,
        });

        if (res?.data?.status) {
          message.success(res?.data?.message || "Task updated");
          setEditTaskModalOpen(false);
          setTaskToEdit(null);
          await initializeBoardData();
        } else {
          message.error(res?.data?.message || "Failed to update task");
        }
      } catch (e) {
        message.error(e?.response?.data?.message || e?.message || "Failed to update task");
      } finally {
        setEditSubmitting(false);
      }
    },
    [initializeBoardData, normalizeDateForApi, taskToEdit, uploadTaskFilesForPage]
  );

  const handleOpenTask = (task) => {
    setSelectedTask(task);
    setTaskDetailModalOpen(true);
  };

  const handleSelectTask = (id, e) => {
    e.stopPropagation();
    setSelectedTaskIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const moveTaskLocally = useCallback((taskId, targetColumn) => {
    if (!taskId || !targetColumn?.id) return;
    const targetId = targetColumn.id;
    setSectionBuckets((prev) => {
      let found = null;
      let sourceId = null;
      listSectionIds.forEach((bid) => {
        const t = (prev[bid]?.tasks || []).find((x) => x._id === taskId);
        if (t) {
          found = t;
          sourceId = bid;
        }
      });
      if (!found || sourceId === null) return prev;
      if (String(sourceId) === String(targetId)) return prev;
      const updatedTask = {
        ...found,
        _stId: targetColumn.statusId || found?._stId || found?.task_status?._id || null,
        task_status: {
          ...(typeof found?.task_status === "object" && found.task_status !== null ? found.task_status : {}),
          ...(typeof targetColumn.statusMeta === "object" && targetColumn.statusMeta !== null ? targetColumn.statusMeta : {}),
          _id:
            targetColumn.statusId ||
            targetColumn?.statusMeta?._id ||
            found?._stId ||
            found?.task_status?._id ||
            null,
          title: targetColumn?.statusMeta?.title || targetColumn.title,
          color: targetColumn?.statusMeta?.color || targetColumn.color,
        },
      };
      const next = { ...prev };
      next[sourceId] = {
        ...next[sourceId],
        tasks: (next[sourceId].tasks || []).filter((t) => t._id !== taskId),
      };
      const targetBucket = next[targetId] || { tasks: [], pageNo: 1, hasMore: false, loading: false, total: 0 };
      const targetTasks = [...(targetBucket.tasks || []).filter((t) => t._id !== taskId), updatedTask];
      next[targetId] = {
        ...targetBucket,
        tasks: targetTasks,
      };
      return next;
    });
  }, [listSectionIds]);

  const updateTaskKanbanStatus = useCallback(async (taskId, targetColumn, previousTask) => {
    const statusToSend = targetColumn?.statusId || targetColumn?.statusMeta?._id || targetColumn?.title;
    if (!taskId || !statusToSend) {
      message.error("Unable to move task to this column");
      return;
    }

    moveTaskLocally(taskId, targetColumn);

    try {
      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: `${Service.taskUpdateWorkFlow}/${taskId}`,
        body: { task_status: statusToSend },
      });

      if (!(response?.data?.status && response?.data?.data)) {
        throw new Error(response?.data?.message || "Failed to update task status");
      }

      const updatedTask = response.data.data;
      const normalizedStatusMeta =
        typeof updatedTask?.task_status === "object" && updatedTask?.task_status !== null
          ? {
            ...updatedTask.task_status,
            _id:
              updatedTask?.task_status?._id ||
              targetColumn?.statusId ||
              targetColumn?.statusMeta?._id ||
              null,
            title: updatedTask?.task_status?.title || targetColumn?.statusMeta?.title || targetColumn?.title,
            color: updatedTask?.task_status?.color || targetColumn?.statusMeta?.color || targetColumn?.color,
          }
          : {
            ...(typeof targetColumn?.statusMeta === "object" && targetColumn.statusMeta !== null
              ? targetColumn.statusMeta
              : {}),
            _id: targetColumn?.statusId || targetColumn?.statusMeta?._id || updatedTask?.task_status || null,
            title: targetColumn?.statusMeta?.title || targetColumn?.title || "No status",
            color: targetColumn?.statusMeta?.color || targetColumn?.color || "#d9d9d9",
          };

      setSectionBuckets((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((bid) => {
          next[bid] = {
            ...next[bid],
            tasks: (next[bid].tasks || []).map((task) =>
              task._id === taskId
                ? {
                  ...task,
                  ...updatedTask,
                  _stId:
                    updatedTask?._stId ||
                    updatedTask?.task_status?._id ||
                    targetColumn?.statusId ||
                    task?._stId,
                  task_status: normalizedStatusMeta,
                }
                : task
            ),
          };
        });
        return next;
      });
      message.success("Task moved successfully");
    } catch (error) {
      setSectionBuckets((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((bid) => {
          next[bid] = {
            ...next[bid],
            tasks: (next[bid].tasks || []).map((task) => (task._id === taskId ? previousTask : task)),
          };
        });
        return next;
      });
      message.error(error?.response?.data?.message || error?.message || "Failed to update task status");
    }
  }, [moveTaskLocally]);

  const handleKanbanDragStart = useCallback((task) => {
    setDraggingTaskId(task?._id || null);
  }, []);

  const handleKanbanDragEnd = useCallback(() => {
    setDraggingTaskId(null);
    setDragOverColumnId(null);
  }, []);

  const handleKanbanDrop = useCallback(async (targetColumn) => {
    if (!draggingTaskId || !targetColumn) {
      setDragOverColumnId(null);
      return;
    }

    const draggedTask = mergedTasksFromBuckets.find((task) => task._id === draggingTaskId);
    if (!draggedTask) {
      setDragOverColumnId(null);
      setDraggingTaskId(null);
      return;
    }

    const currentStatusKey = normalizeKanbanStatusKey(draggedTask.task_status);
    if (currentStatusKey === targetColumn.id) {
      setDragOverColumnId(null);
      setDraggingTaskId(null);
      return;
    }

    setDragOverColumnId(null);
    setDraggingTaskId(null);
    await updateTaskKanbanStatus(draggedTask._id, targetColumn, draggedTask);
  }, [draggingTaskId, mergedTasksFromBuckets, updateTaskKanbanStatus]);

  const deleteTasksByIds = useCallback(
    async (ids) => {
      const uniqueIds = [...new Set((ids || []).filter(Boolean))];
      if (uniqueIds.length === 0) return { deleted: 0, failed: 0 };
      let deleted = 0;
      let failed = 0;
      for (const id of uniqueIds) {
        try {
          const res = await Service.makeAPICall({
            methodName: Service.deleteMethod,
            api_url: `${Service.deleteTask}/${id}`,
          });
          if (res?.status === 200 && res?.data?.status) {
            deleted += 1;
          } else {
            failed += 1;
          }
        } catch (e) {
          failed += 1;
          console.error("deleteTasksByIds", id, e);
        }
      }
      return { deleted, failed };
    },
    []
  );

  const handleDeleteSelected = useCallback(() => {
    const count = selectedTaskIds.length;
    Modal.confirm({
      title: "Delete tasks",
      content: `Are you sure you want to delete ${count} selected task${count === 1 ? "" : "s"}? This cannot be undone.`,
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          dispatch(showAuthLoader());
          const { deleted, failed } = await deleteTasksByIds(selectedTaskIds);
          if (deleted > 0) {
            message.success(`${deleted} task${deleted === 1 ? "" : "s"} deleted.`);
          }
          if (failed > 0) {
            message.error(`Could not delete ${failed} task${failed === 1 ? "" : "s"}.`);
          }
          setSelectedTaskIds([]);
          initializeBoardData();
        } catch (e) {
          console.error("handleDeleteSelected", e);
          message.error("Failed to delete tasks.");
        } finally {
          dispatch(hideAuthLoader());
        }
      },
    });
  }, [deleteTasksByIds, dispatch, initializeBoardData, selectedTaskIds]);

  const handleDeleteOneTask = useCallback(
    (task) => {
      if (!task?._id) return;
      Modal.confirm({
        title: "Delete task",
        content: `Delete "${task.title || "this task"}"? This cannot be undone.`,
        okText: "Delete",
        okType: "danger",
        cancelText: "Cancel",
        onOk: async () => {
          try {
            dispatch(showAuthLoader());
            const { deleted, failed } = await deleteTasksByIds([task._id]);
            if (deleted > 0) {
              message.success("Task deleted.");
              setSelectedTaskIds((prev) => prev.filter((id) => id !== task._id));
              if (selectedTask?._id === task._id) {
                setTaskDetailModalOpen(false);
                setSelectedTask(null);
              }
              initializeBoardData();
            } else if (failed > 0) {
              message.error("Could not delete this task.");
            }
          } catch (e) {
            console.error("handleDeleteOneTask", e);
            message.error("Failed to delete task.");
          } finally {
            dispatch(hideAuthLoader());
          }
        },
      });
    },
    [deleteTasksByIds, dispatch, initializeBoardData, selectedTask]
  );

  const handleOpenInProject = (path) => {
    if (path) history.push(path);
  };

  return (
    <div className="task-page">

      {/* ── Row 1: Title + Controls ── */}
      <div className="task-page-topbar">
        <h1 className="task-page-title">Task</h1>
        <div className="task-page-controls">

          <Input.Search
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={() => initializeBoardData()}
            className="ap-search-input"
            allowClear
          />
          <TaskCombinedFacetFilter
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            projectFilter={projectFilter}
            setProjectFilter={setProjectFilter}
            projects={projects}
            isAdmin={isAdmin}
            viewAll={viewAll}
            setViewAll={setViewAll}
            sortMode={sortMode}
            setSortMode={setSortMode}
            datePreset={datePreset}
            applyDatePreset={applyDatePreset}
            onProjectSearch={onProjectSearch}
            onProjectScroll={onProjectScroll}
            isFetchingProjects={isFetchingProjects}
            projectSearch={projectSearch}
          />
          {selectedTaskIds.length > 0 && (
            <button
              type="button"
              className="task-btn-ghost"
              style={{ color: "#ff4d4f", borderColor: "#ff4d4f" }}
              onClick={handleDeleteSelected}
            >
              <PlusOutlined rotate={45} /> Delete Selected ({selectedTaskIds.length})
            </button>
          )}
          <Button
            type="primary"
            onClick={() => setAddTaskModalOpen(true)}
          >
            <PlusOutlined /> Add Task
          </Button>
        </div>
      </div>

      {/* ── Row 2: View tabs + secondary controls ── */}
      <div className="task-page-tabsbar">
        <div className="task-page-tabs">
          <button
            className={`task-tab ${view === "list" ? "active" : ""}`}
            onClick={() => handleViewChange("list")}
          >
            <UnorderedListOutlined className="task-tab-icon" /> List
          </button>
          <button
            className={`task-tab ${view === "kanban" ? "active" : ""}`}
            onClick={() => handleViewChange("kanban")}
          >
            <AppstoreOutlined className="task-tab-icon" /> Kanban
          </button>
          <button
            className={`task-tab ${view === "calendar" ? "active" : ""}`}
            onClick={() => handleViewChange("calendar")}
          >
            <CalendarOutlined className="task-tab-icon" /> Calendar
          </button>
          <button
            className={`task-tab ${view === "gantt" ? "active" : ""}`}
            onClick={() => handleViewChange("gantt")}
          >
            <BarChartOutlined className="task-tab-icon" /> Gantt
          </button>
        </div>
      </div>

      <AddTaskModal
        open={addTaskModalOpen}
        onCancel={() => setAddTaskModalOpen(false)}
        onSuccess={() => {
          setAddTaskModalOpen(false);
          initializeBoardData();
        }}
        standalone
      />

      <CommonTaskFormModal
        key={taskToEdit?._id || "edit-task"}
        open={editTaskModalOpen}
        mode="edit"
        title="Edit Task"
        submitText="Save Changes"
        initialValues={mapTaskToEditFormInitial(taskToEdit)}
        lockedProjectId={taskToEdit ? getTaskProjectId(taskToEdit) || undefined : undefined}
        lockedMainTaskId={
          taskToEdit
            ? (typeof taskToEdit?.mainTask === "object" && taskToEdit?.mainTask?._id) ||
              (typeof taskToEdit?.main_task_id === "object" && taskToEdit?.main_task_id?._id) ||
              taskToEdit?.main_task_id ||
              undefined
            : undefined
        }
        showListSelector={false}
        onCancel={() => {
          setEditTaskModalOpen(false);
          setTaskToEdit(null);
        }}
        onSubmit={handleEditTaskSubmit}
        submitting={editSubmitting}
      />

      <Suspense fallback={null}>
        <TaskDetailModal
          open={taskDetailModalOpen}
          onClose={() => {
            setTaskDetailModalOpen(false);
            setSelectedTask(null);
          }}
          task={selectedTask}
          companySlug={companySlug}
          onOpenInProject={handleOpenInProject}
        />
      </Suspense>

      {/* ── Content ── */}
      {loading ? (
        <TaskPageSkeleton view={view} />
      ) : view === "list" ? (
        <div className="task-list-view" ref={tasksContainerRef} style={{ overflowY: "auto", height: "calc(100vh - 300px)" }}>
          <div className="task-list-column-header">
            <span className="task-list-header-spacer" aria-hidden />
            <span className="task-list-header-spacer" aria-hidden />
            <span className="col-task-name">Task Name</span>
            <span className="col-due-date">Due Date</span>
            <span className="col-assignees">Assignee(s)</span>
            <span className="col-project">Project</span>
            <span className="col-actions">Action</span>
          </div>
          {kanbanColumns.map((s) => (
              <TaskListSection
                key={s.id}
                sectionId={s.id}
                title={s.title}
                count={statusTotals[s.id] ?? s.tasks.length}
                tasks={s.tasks}
                onOpenTask={handleOpenTask}
                onEditTask={handleOpenEditTask}
                onDeleteTask={handleDeleteOneTask}
                selectedTaskIds={selectedTaskIds}
                onSelectTask={handleSelectTask}
                onSectionScroll={handleListSectionScroll}
                isSectionLoading={Boolean(sectionBuckets[s.id]?.loading)}
              />
            ))}
        </div>
      ) : view === "kanban" ? (
        <div className="task-kanban-view">
          {kanbanColumns.length === 0 ? (
            <div className="task-list-empty" style={{ padding: 48, textAlign: "center", width: "100%" }}>
              No tasks to show. Adjust filters or add a task.
            </div>
          ) : kanbanColumns.map((col) => (
            <div key={col.id} className="kanban-column" style={{ borderTopColor: col.color }}>
              <div className="kanban-column-header">
                <span className="kanban-column-title">{col.title}</span>
                <span className="kanban-column-count">({statusTotals[col.id] ?? col.tasks.length})</span>
              </div>
              <div
                className={`kanban-column-cards ${dragOverColumnId === col.id ? "is-drop-target" : ""}`}
                style={{ maxHeight: "calc(100vh - 300px)", overflowY: "auto" }}
                onScroll={(e) => handleKanbanColumnScroll(e, col.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOverColumnId !== col.id) setDragOverColumnId(col.id);
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragOverColumnId(col.id);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) {
                    setDragOverColumnId((prev) => (prev === col.id ? null : prev));
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleKanbanDrop(col);
                }}
              >
                {col.tasks.map((t) => (
                  <TaskCard
                    key={t._id}
                    task={t}
                    onClick={() => handleOpenTask(t)}
                    draggable
                    isDragging={draggingTaskId === t._id}
                    onDragStart={() => handleKanbanDragStart(t)}
                    onDragEnd={handleKanbanDragEnd}
                  />
                ))}
                {sectionBuckets[col.id]?.loading && (
                  <div style={{ textAlign: "center", padding: "10px", display: "flex", justifyContent: "center", gap: 8 }}>
                    <Spin size="small" />
                    <span style={{ fontSize: 12, color: "#8c8c8c" }}>Loading more...</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : view === "calendar" ? (
        <div className="task-calendar-view">
          <div className="calendar-toolbar">
            <button type="button" onClick={() => setCalendarDate(calendarDate.subtract(1, calendarMode))}>&lt;</button>
            <div className="calendar-title-group">
              <span className="calendar-title">
                {calendarDate.format(calendarMode === "month" ? "MMMM YYYY" : "YYYY-MM-DD")}
              </span>
              <div className="calendar-month-year-controls">
                <Select
                  value={calendarDate.month()}
                  onChange={(month) => setCalendarDate((current) => updateCalendarMonthYear(current, month))}
                  className="calendar-toolbar-select"
                  size="middle"
                >
                  {CALENDAR_MONTH_OPTIONS.map((option) => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
                <Select
                  value={calendarDate.year()}
                  onChange={(year) => setCalendarDate((current) => updateCalendarMonthYear(current, undefined, year))}
                  className="calendar-toolbar-select calendar-toolbar-select-year"
                  size="middle"
                >
                  {calendarYearOptions.map((year) => (
                    <Option key={year} value={year}>
                      {year}
                    </Option>
                  ))}
                </Select>
              </div>
            </div>
            <button type="button" onClick={() => setCalendarDate(calendarDate.add(1, calendarMode))}>&gt;</button>
            <div className="calendar-mode">
              <button className={calendarMode === "month" ? "active" : ""} onClick={() => setCalendarMode("month")}>Month</button>
              <button className={calendarMode === "week" ? "active" : ""} onClick={() => setCalendarMode("week")}>Week</button>
              <button className={calendarMode === "day" ? "active" : ""} onClick={() => setCalendarMode("day")}>Day</button>
            </div>
          </div>
          <CalendarGrid mode={calendarMode} current={calendarDate} tasksByDate={calendarTasksByDate} onOpenTask={handleOpenTask} />
        </div>
      ) : view === "gantt" ? (
        <div className="task-gantt-wrapper">
          <TasksGanttView
            tasks={ganttBoards}
            rangeStart={taskStartDate}
            rangeEnd={taskEndDate}
            onTaskClick={handleOpenTask}
          />
        </div>
      ) : null}
    </div>
  );
};

function TaskListSection({
  sectionId,
  title,
  count,
  tasks,
  onOpenTask,
  onEditTask,
  onDeleteTask,
  selectedTaskIds,
  onSelectTask,
  onSectionScroll,
  isSectionLoading,
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="task-list-section">
      <button type="button" className="task-list-section-header" onClick={() => setCollapsed((c) => !c)}>
        <span className={`section-chevron ${collapsed ? "collapsed" : ""}`} />
        <span className="section-title">{title}</span>
        <span className="section-count">{count}</span>
      </button>
      {!collapsed && (
        <div
          className="task-list-body"
          style={{ maxHeight: 320, overflowY: "auto" }}
          onScroll={(event) => onSectionScroll(event, sectionId)}
        >
          {tasks.length === 0 ? (
            <div className="task-list-empty">
              <NoDataFoundIcon />
              <p>No tasks found</p>
            </div>
          ) : (
            tasks.map((t) => (
              <TaskRow
                key={t._id}
                task={t}
                onOpen={() => onOpenTask(t)}
                onEdit={() => onEditTask(t)}
                onDelete={() => onDeleteTask(t)}
                isSelected={selectedTaskIds?.includes(t._id)}
                onSelect={(e) => onSelectTask(t._id, e)}
              />
            ))
          )}
          {isSectionLoading && (
            <div style={{ textAlign: "center", padding: "12px 8px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Spin size="medium" />
              <span style={{ fontSize: 12, color: "#8c8c8c" }}>Loading more...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, onOpen, onEdit, onDelete, isSelected, onSelect }) {
  const dueStr = task.due_date ? dayjs(task.due_date).format("MMM D, YYYY") : "—";
  const dueDateKey = task.due_date ? dayjs(task.due_date).format("YYYY-MM-DD") : null;
  const isOverdue = dueDateKey && dayjs(dueDateKey).isBefore(dayjs(), "day");
  const assigneeNames = getAssigneesDisplay(task.assignees);
  const projectTitle = getTaskProjectTitle(task);
  const initials =
    assigneeNames.length > 0
      ? assigneeNames[0].slice(0, 2).toUpperCase()
      : "—";

  return (
    <div
      role="button"
      tabIndex={0}
      className="task-row"
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
    >
      <div className="task-row-checkbox-wrap" onClick={onSelect}>
        <Checkbox checked={isSelected} onClick={(e) => e.stopPropagation()} onChange={onSelect} />
      </div>
      <div className="task-row-avatar-wrap">
        <Avatar size={24} className="task-row-avatar">{initials}</Avatar>
      </div>
      <div className="task-row-main">
        <span className="task-row-title">{task.title}</span>
        <span className="task-row-comment"><MessageOutlined /> 0</span>
      </div>
      <div className={`task-row-due ${isOverdue ? "overdue" : ""}`}>{dueStr}</div>
      <div className="task-row-assignees" title={assigneeNames.join(", ")}>
        {assigneeNames.length > 0 ? (
          <span className="task-row-assignees-names">{assigneeNames.join(", ")}</span>
        ) : (
          "—"
        )}
      </div>
      <div className="task-row-project" title={projectTitle}>
        {projectTitle}
      </div>
      <div className="task-row-actions" onClick={(e) => e.stopPropagation()}>
        <Button
          type="text"
          size="small"
          className="task-row-action-btn"
          icon={<EditOutlined />}
          aria-label="Edit task"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        />
        <Button
          type="text"
          size="small"
          danger
          className="task-row-action-btn"
          icon={<DeleteOutlined />}
          aria-label="Delete task"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        />
      </div>
    </div>
  );
}

function TaskCard({ task, onClick, draggable = false, isDragging = false, onDragStart, onDragEnd }) {
  const dueStr = task.due_date ? dayjs(task.due_date).format("MMM D, YYYY") : "—";
  const assigneeNames = getAssigneesDisplay(task.assignees);
  const assigneesLabel = assigneeNames.length > 0 ? assigneeNames.join(", ") : "Unassigned";
  return (
    <div
      role="button"
      tabIndex={0}
      className={`task-card ${isDragging ? "is-dragging" : ""}`}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="task-card-title">{task.title}</div>
      {task.project?.title && <div className="task-card-project">{task.project.title}</div>}
      <div className="task-card-due">{dueStr}</div>
      <div className="task-card-footer">
        <span className="task-card-assignees" title={assigneesLabel}>
          {assigneesLabel}
        </span>
      </div>
    </div>
  );
}

function CalendarGrid({ mode, current, tasksByDate, onOpenTask }) {
  const days = useMemo(() => {
    if (mode === "month") {
      let d = current.startOf("month").startOf("week");
      const end = current.endOf("month").endOf("week");
      const arr = [];
      while (d.isBefore(end) || d.isSame(end, "day")) {
        arr.push(d.format("YYYY-MM-DD"));
        d = d.add(1, "day");
      }
      return arr;
    }
    if (mode === "week") {
      const start = current.startOf("week");
      return Array.from({ length: 7 }, (_, i) => start.add(i, "day").format("YYYY-MM-DD"));
    }
    return [current.format("YYYY-MM-DD")];
  }, [mode, current]);

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="calendar-grid">
      {mode === "month" && (
        <div className="calendar-weekdays">
          {weekDays.map((d) => <div key={d} className="calendar-weekday">{d}</div>)}
        </div>
      )}
      <div className="calendar-days" style={{ gridTemplateColumns: `repeat(${mode === "month" ? 7 : mode === "week" ? 7 : 1}, 1fr)` }}>
        {days.map((dateStr) => {
          const list = tasksByDate[dateStr] || [];
          return (
            <div key={dateStr} className="calendar-day-cell">
              <div className="calendar-day-num">{dayjs(dateStr).format("D")}</div>
              <div className="calendar-day-tasks">
                {list.slice(0, 3).map((t) => {
                  const names = getAssigneesDisplay(t.assignees);
                  const assigneeTip = names.length > 0 ? `Assigned to: ${names.join(", ")}` : "Unassigned";
                  return (
                    <button
                      key={t._id}
                      type="button"
                      className="calendar-task-bar"
                      onClick={() => onOpenTask(t)}
                      title={assigneeTip}
                    >
                      {t.title}
                    </button>
                  );
                })}
                {list.length > 3 && <span className="calendar-more">+{list.length - 3}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TaskPage;
