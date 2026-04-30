import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Input, Select, Checkbox, Avatar, Modal, message, Popover, Button, Radio, Badge, Divider, Spin, Form, Tooltip, Row, Col } from "antd";
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
  DragOutlined,
} from "@ant-design/icons";
import { useHistory, useLocation } from "react-router-dom";
import dayjs from "dayjs";
import Service from "../../service";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import { useDispatch } from "react-redux";
import { getRoles, hasPermission } from "../../util/hasPermission";
import AddTaskModal from "../Tasks/AddTaskModal";
import CommonTaskFormModal from "../Tasks/CommonTaskFormModal";
import TasksGanttView from "../Tasks/TasksGanttView";
import { TaskPageSkeleton } from "../../components/common/SkeletonLoader";
import NoDataFoundIcon from "../../components/common/NoDataFoundIcon";
import "./TaskPage.css";

const { Option } = Select;

const SECTION_PAGE_LIMIT = 25;
const INITIAL_TASKS_LIMIT = 200;
const MONGO_ID_REGEX = /^[a-fA-F0-9]{24}$/;
const LIST_AUTOSCROLL_EDGE_PX = 56;
const LIST_AUTOSCROLL_STEP = 18;

const computeBucketHasMore = (mergedLength, fetchedLength, total, meta = {}) => {
  const tot = Number(total) || 0;
  const page = Number(meta.page);
  const rawTp = Number(meta.totalPages);
  const tp =
    Number.isFinite(rawTp) && rawTp > 0
      ? rawTp
      : tot > 0
        ? Math.ceil(tot / SECTION_PAGE_LIMIT)
        : 0;

  if (fetchedLength === 0) return false;
  if (tot > 0 && mergedLength >= tot) return false;
  if (Number.isFinite(page) && tp > 0 && page >= tp) return false;
  if (tot > 0 && mergedLength < tot) return true;
  return fetchedLength >= SECTION_PAGE_LIMIT;
};

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


function mergeSectionKeysFromTotals(statusTotals, statusMetaBySection = {}) {
  const keys = new Set();
  Object.keys(statusTotals || {}).forEach((k) => {
    if (k && k !== "_none_") keys.add(k);
  });
  Object.keys(statusMetaBySection || {}).forEach((k) => {
    if (k && k !== "_none_") keys.add(k);
  });

  const allKeys = [...keys];
  const hasSequence = allKeys.some((key) => Number.isFinite(Number(statusMetaBySection?.[key]?.sequence)));
  if (hasSequence) {
    return allKeys.sort((a, b) => {
      const aSeq = Number(statusMetaBySection?.[a]?.sequence);
      const bSeq = Number(statusMetaBySection?.[b]?.sequence);
      const aHas = Number.isFinite(aSeq);
      const bHas = Number.isFinite(bSeq);
      if (aHas && bHas && aSeq !== bSeq) return aSeq - bSeq;
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      return String(a).localeCompare(String(b));
    });
  }

  return allKeys.sort((a, b) => String(a).localeCompare(String(b)));
}

function getTaskPageSectionKeyFromStatus(item) {
  const statusId = String(item?.statusId || item?._id || "").trim();
  if (statusId) return statusId;
  return "";
}

function getTaskPageSectionKeyFromTask(task) {
  const statusId = String(task?._stId || task?.task_status?._id || task?.task_status || "").trim();
  if (statusId) return statusId;
  return "_none_";
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

function getTaskCommentCount(task) {
  const directCount =
    task?.comment_count ??
    task?.comments_count ??
    task?.commentsCount ??
    task?.commentCount;
  if (Number.isFinite(Number(directCount))) return Number(directCount);
  if (Array.isArray(task?.comments)) return task.comments.length;
  return 0;
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

  let base = { viewAll: true, statusFilter: "all", taskStartDate: null, taskEndDate: null, assignedOnly: false };

  if (filter === "assigned_to_me") {
    base = { viewAll: false, assignedOnly: true, statusFilter: "all", taskStartDate: null, taskEndDate: null };
  } else if (filter === "due_today") {
    const today = dayjs().format("DD-MM-YYYY");
    base = { viewAll: isAdmin, assignedOnly: false, statusFilter: "all", taskStartDate: today, taskEndDate: today };
  } else if (filter === "past_due") {
    const yesterday = dayjs().subtract(1, "day").format("DD-MM-YYYY");
    base = { viewAll: isAdmin, assignedOnly: false, statusFilter: "incomplete", taskStartDate: null, taskEndDate: yesterday };
  } else if (filter === "all") {
    base = { viewAll: isAdmin, assignedOnly: false, statusFilter: "all", taskStartDate: null, taskEndDate: null };
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
  const today = dayjs().format("DD-MM-YYYY");
  const weekStart = dayjs().startOf("week").format("DD-MM-YYYY");
  const weekEnd = dayjs().endOf("week").format("DD-MM-YYYY");
  const monthStart = dayjs().startOf("month").format("DD-MM-YYYY");
  const monthEnd = dayjs().endOf("month").format("DD-MM-YYYY");
  const next7End = dayjs().add(7, "day").format("DD-MM-YYYY");
  const yesterday = dayjs().subtract(1, "day").format("DD-MM-YYYY");

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
  if (compact.includes("onhold") || title.includes("hold")) return "onhold";
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
  const canAddTask = hasPermission(["task_add"]);
  const canEditTask = hasPermission(["task_edit"]);
  const canDeleteTask = hasPermission(["task_delete"]);
  const canAddStage = hasPermission(["task_add"]);
  const canManageStageOrder = hasPermission(["task_edit"]);
  const currentUserId = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user_data") || "{}")?._id || "";
    } catch (error) {
      return "";
    }
  }, []);

  const filterState = getTaskPageStateFromSearch(location.search, isAdmin);

  const [view, setView] = useState(filterState.view || "kanban"); // list | kanban | calendar | gantt
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(filterState.statusFilter);
  const [projectFilter, setProjectFilter] = useState(filterState.projectIds || []);
  const [viewAll, setViewAll] = useState(filterState.viewAll);
  const [assignedOnly, setAssignedOnly] = useState(filterState.assignedOnly || false);
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
  const [addTaskModalSessionKey, setAddTaskModalSessionKey] = useState(0);
  const [modalInitialStatusId, setModalInitialStatusId] = useState(null);
  const [modalInitialStatusMeta, setModalInitialStatusMeta] = useState(null);
  const [taskDetailModalOpen, setTaskDetailModalOpen] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const [dragOverColumnId, setDragOverColumnId] = useState(null);
  const [statusTotals, setStatusTotals] = useState({});
  const [statusMetaBySection, setStatusMetaBySection] = useState({});
  const [sectionBuckets, setSectionBuckets] = useState({});
  const [listSectionIds, setListSectionIds] = useState(["todo", "inprogress", "onhold", "done"]);
  const [editTaskModalOpen, setEditTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [addStageModalOpen, setAddStageModalOpen] = useState(false);
  const [stageSubmitting, setStageSubmitting] = useState(false);
  const [stageRenameId, setStageRenameId] = useState(null);
  const [stageRenameValue, setStageRenameValue] = useState("");
  const [stageRenaming, setStageRenaming] = useState(false);
  const [draggingStageId, setDraggingStageId] = useState(null);
  const [defaultWorkflowId, setDefaultWorkflowId] = useState("");
  const [workflowList, setWorkflowList] = useState([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState("");
  const selectedWorkflowIdRef = useRef("");
  const tasksContainerRef = React.useRef(null);
  const sectionBucketsRef = useRef({});
  const listSectionLoadGuardRef = useRef(new Set());
  const [stageForm] = Form.useForm();

  useEffect(() => {
    sectionBucketsRef.current = sectionBuckets;
  }, [sectionBuckets]);

  useEffect(() => {
    selectedWorkflowIdRef.current = selectedWorkflowId;
  }, [selectedWorkflowId]);


  // Project select infinite loading state
  const [projectSearch, setProjectSearch] = useState("");
  const [projectPagination, setProjectPagination] = useState({ pageNo: 1, limit: 25 });
  const [hasMoreProjects, setHasMoreProjects] = useState(true);
  const [isFetchingProjects, setIsFetchingProjects] = useState(false);
  const isFetchingRef = React.useRef(false);
  const pendingEditTaskRef = useRef(null);



  const calendarYearOptions = useMemo(() => {
    const currentYear = dayjs().year();
    return Array.from({ length: 21 }, (_, index) => currentYear - 10 + index);
  }, []);

  // Sync state when URL changes (e.g. user navigates to same page with different filter)
  useEffect(() => {
    const next = getTaskPageStateFromSearch(location.search, isAdmin);
    setViewAll(next.viewAll);
    setAssignedOnly(next.assignedOnly || false);
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

  const fetchDefaultWorkflowId = useCallback(async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getworkflow,
        body: {
          isDropdown: true,
          pageNo: 1,
          limit: 100,
        },
      });

      const workflows = Array.isArray(response?.data?.data) ? response.data.data : [];
      setWorkflowList(workflows);
      // API sorts isDefault:-1 so Standard comes first
      const firstWorkflow = workflows[0]?._id || "";
      setDefaultWorkflowId(firstWorkflow);
      // Only set selectedWorkflowId on first load (empty string means not yet set)
      setSelectedWorkflowId((prev) => prev || firstWorkflow);
      return firstWorkflow;
    } catch (error) {
      setDefaultWorkflowId("");
      return "";
    }
  }, []);

  const resolveTaskPageWorkflowId = useCallback(
    async ({ showError = true } = {}) => {
      let workflowId = defaultWorkflowId;
      if (!workflowId) {
        workflowId = await fetchDefaultWorkflowId();
      }
      if (!workflowId && showError) {
        message.error("No workflow found.");
      }
      if (workflowId) setDefaultWorkflowId(workflowId);
      return workflowId || "";
    },
    [defaultWorkflowId, fetchDefaultWorkflowId]
  );


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
      ...(assignedOnly ? { assigned_only: true } : {}),
      ...(taskStartDate ? { start_date: taskStartDate } : {}),
      ...(taskEndDate ? { end_date: taskEndDate } : {}),
    }),
    [debouncedSearch, statusFilter, projectFilter, viewAll, assignedOnly, isAdmin, taskStartDate, taskEndDate]
  );

  const initializeBoardData = useCallback(async () => {
    setLoading(true);
    dispatch(showAuthLoader());
    listSectionLoadGuardRef.current = new Set();
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.taskList,
        body: {
          ...buildTaskListFilterBody(),
          pageNo: 1,
          limit: INITIAL_TASKS_LIMIT,
        },
      });
      if (response?.status !== 200) {
        setStatusTotals({});
        setStatusMetaBySection({});
        setListSectionIds([]);
        setSectionBuckets({});
        return;
      }
      const tasks = Array.isArray(response?.data?.data) ? response.data.data : [];
      const meta = response?.data?.metadata || {};
      const statusCounts = Array.isArray(meta.statusCounts) ? meta.statusCounts : [];
      const statusCountBySection = statusCounts.reduce((acc, item) => {
        const key = getTaskPageSectionKeyFromStatus(item);
        if (!key) return acc;
        acc[key] = Number(acc[key] || 0) + Number(item?.count || 0);
        return acc;
      }, {});

      // Prefer server-provided status metadata/order when available.
      const nextStatusMetaBySection = statusCounts.reduce((acc, item) => {
        const key = getTaskPageSectionKeyFromStatus(item);
        if (!key) return acc;
        const incomingStatusId = item?.statusId ? String(item.statusId) : null;
        acc[key] = {
          statusId: incomingStatusId || key,
          statusIds: incomingStatusId ? [incomingStatusId] : [key],
          title: item?.title || "Untitled",
          color: item?.color || "#d9d9d9",
          sequence: Number.isFinite(Number(item?.sequence)) ? Number(item.sequence) : null,
          isDefault: Boolean(item?.isDefault),
          workflowId: item?.workflowId || null,
          workflowName: item?.workflowName || "",
        };
        return acc;
      }, {});

      const nextBuckets = {};
      tasks.forEach((task) => {
        const bucketId = getTaskPageSectionKeyFromTask(task);
        if (!nextBuckets[bucketId]) {
          nextBuckets[bucketId] = {
            tasks: [],
            pageNo: 0,
            hasMore: false,
            loading: false,
            total: 0,
          };
        }
        nextBuckets[bucketId].tasks.push(task);
        nextBuckets[bucketId].total += 1;

        if (!nextStatusMetaBySection[bucketId]) {
          nextStatusMetaBySection[bucketId] = {
            statusId:
              String(task?._stId || task?.task_status?._id || "").trim() || bucketId,
            statusIds: [
              String(task?._stId || task?.task_status?._id || "").trim() || bucketId,
            ],
            title: task?.task_status?.title || task?.task_status?.name || "No status",
            color: task?.task_status?.color || "#d9d9d9",
            sequence: Number.isFinite(Number(task?.task_status?.sequence))
              ? Number(task.task_status.sequence)
              : null,
            isDefault: Boolean(task?.task_status?.isDefault),
            workflowId: task?.task_status?.workflow_id || null,
            workflowName: "",
          };
        }
      });

      const nextStatusTotals = Object.keys(nextBuckets).reduce((acc, bucketId) => {
        acc[bucketId] = Number(nextBuckets?.[bucketId]?.tasks?.length || 0);
        return acc;
      }, {});

      // Fetch authoritative stage sequences + workflow names so the kanban
      // column order always matches Workflow Stages config and duplicate-named
      // stages can be labelled with their workflow name.
      const uniqueWorkflowIds = [
        ...new Set(
          Object.values(nextStatusMetaBySection)
            .map((m) => m.workflowId)
            .filter((id) => id && MONGO_ID_REGEX.test(String(id)))
        ),
      ];
      if (uniqueWorkflowIds.length > 0) {
        try {
          const [stageLists, workflowListResp] = await Promise.all([
            Promise.all(
              uniqueWorkflowIds.map((wfId) =>
                Service.makeAPICall({
                  methodName: Service.getMethod,
                  api_url: `${Service.getworkflowStatus}/${wfId}`,
                }).then((res) =>
                  Array.isArray(res?.data?.data) ? res.data.data : []
                ).catch(() => [])
              )
            ),
            Service.makeAPICall({
              methodName: Service.postMethod,
              api_url: Service.getworkflow,
              body: { isDropdown: true, pageNo: 1, limit: 500 },
            }).catch(() => null),
          ]);

          const workflowNameMap = new Map();
          (Array.isArray(workflowListResp?.data?.data) ? workflowListResp.data.data : [])
            .forEach((wf) => {
              if (wf?._id) workflowNameMap.set(String(wf._id), wf.project_workflow || "");
            });

          stageLists.flat().forEach((stage) => {
            const stId = String(stage?._id || "");
            if (!stId) return;
            const sectionKey = Object.keys(nextStatusMetaBySection).find(
              (k) => String(nextStatusMetaBySection[k]?.statusId || "") === stId
            );
            if (sectionKey) {
              if (Number.isFinite(Number(stage?.sequence))) {
                nextStatusMetaBySection[sectionKey].sequence = Number(stage.sequence);
              }
              const wfId = nextStatusMetaBySection[sectionKey].workflowId;
              if (wfId && workflowNameMap.has(String(wfId))) {
                nextStatusMetaBySection[sectionKey].workflowName =
                  workflowNameMap.get(String(wfId));
              }
            }
          });
        } catch {
          /* non-fatal: fall back to existing sequences */
        }
      }

      const sectionOrder = mergeSectionKeysFromTotals(nextStatusTotals, nextStatusMetaBySection);
      sectionOrder.forEach((bucketId) => {
        const sectionTotal = Number(statusCountBySection?.[bucketId] || nextBuckets?.[bucketId]?.total || 0);
        const loadedCount = Number(nextBuckets?.[bucketId]?.tasks?.length || 0);
        if (!nextBuckets[bucketId]) {
          nextBuckets[bucketId] = {
            tasks: [],
            pageNo: 0,
            hasMore: sectionTotal > 0,
            loading: false,
            total: sectionTotal,
          };
        } else {
          nextBuckets[bucketId] = {
            ...nextBuckets[bucketId],
            pageNo: 0,
            total: sectionTotal,
            hasMore: loadedCount < sectionTotal,
          };
        }
      });

      setStatusTotals(nextStatusTotals);
      setStatusMetaBySection(nextStatusMetaBySection);
      setListSectionIds(sectionOrder);
      setSectionBuckets(nextBuckets);
    } catch (e) {
      setStatusTotals({});
      setStatusMetaBySection({});
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
        const nextPage = Number(snap?.pageNo) > 0 ? Number(snap.pageNo) + 1 : 1;
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
        const total = Number(m.total || sectionBucketsRef.current[sectionId]?.total || 0);
        const respPage = Number(m.page) > 0 ? Number(m.page) : nextPage;
        setSectionBuckets((prev) => {
          const cur = prev[sectionId] || { tasks: [], pageNo: 0, hasMore: false, total: 0, loading: false };
          const mergedById = new Map();
          [...(cur.tasks || []), ...fetchedTasks].forEach((task) => {
            const key = String(task?._id || "");
            if (!key) return;
            mergedById.set(key, task);
          });
          const merged = [...mergedById.values()];
          const metaForHasMore = { ...m, page: respPage };
          return {
            ...prev,
            [sectionId]: {
              tasks: merged,
              pageNo: respPage,
              hasMore: computeBucketHasMore(merged.length, fetchedTasks.length, total, metaForHasMore),
              loading: false,
              total,
            },
          };
        });
      } catch (e) {
        setSectionBuckets((prev) => ({
          ...prev,
          [sectionId]: { ...prev[sectionId], loading: false, hasMore: false },
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
    fetchDefaultWorkflowId();
  }, [fetchDefaultWorkflowId]);

  useEffect(() => {
    setLoading(true);
    initializeBoardData();
  }, [initializeBoardData, debouncedSearch, statusFilter, projectFilter, viewAll, assignedOnly, taskStartDate, taskEndDate, isAdmin]);

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

  const handleListViewDragOver = useCallback(
    (event) => {
      if (!canManageStageOrder || !draggingStageId) return;
      const container = tasksContainerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const pointerY = event.clientY;
      const distanceToTop = pointerY - rect.top;
      const distanceToBottom = rect.bottom - pointerY;

      if (distanceToBottom <= LIST_AUTOSCROLL_EDGE_PX) {
        container.scrollTop += LIST_AUTOSCROLL_STEP;
        event.preventDefault();
      } else if (distanceToTop <= LIST_AUTOSCROLL_EDGE_PX) {
        container.scrollTop -= LIST_AUTOSCROLL_STEP;
        event.preventDefault();
      }
    },
    [canManageStageOrder, draggingStageId]
  );

  const applyDatePreset = useCallback((presetKey) => {
    const today = dayjs();
    setGanttAppliedDefaultRange(false);
    setDatePreset(presetKey);

    switch (presetKey) {
      case "today":
        setTaskStartDate(today.format("DD-MM-YYYY"));
        setTaskEndDate(today.format("DD-MM-YYYY"));
        break;
      case "this_week":
        setTaskStartDate(today.startOf("week").format("DD-MM-YYYY"));
        setTaskEndDate(today.endOf("week").format("DD-MM-YYYY"));
        break;
      case "this_month":
        setTaskStartDate(today.startOf("month").format("DD-MM-YYYY"));
        setTaskEndDate(today.endOf("month").format("DD-MM-YYYY"));
        break;
      case "next_7_days":
        setTaskStartDate(today.format("DD-MM-YYYY"));
        setTaskEndDate(today.add(7, "day").format("DD-MM-YYYY"));
        break;
      case "overdue":
        setTaskStartDate(null);
        setTaskEndDate(today.subtract(1, "day").format("DD-MM-YYYY"));
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

  // Sections visible for the currently selected workflow
  const filteredSectionIds = useMemo(() => {
    if (!selectedWorkflowId) return listSectionIds;
    return listSectionIds.filter(
      (id) => String(statusMetaBySection[id]?.workflowId || "") === String(selectedWorkflowId)
    );
  }, [listSectionIds, selectedWorkflowId, statusMetaBySection]);

  const mergedTasksFromBuckets = useMemo(() => {
    const map = new Map();
    filteredSectionIds.forEach((bucketId) => {
      (sectionBuckets[bucketId]?.tasks || []).forEach((t) => {
        if (t?._id) map.set(t._id, t);
      });
    });
    return Array.from(map.values());
  }, [filteredSectionIds, sectionBuckets]);

  const filteredTasks = useMemo(() => mergedTasksFromBuckets, [mergedTasksFromBuckets]);

  const sortedTasks = useMemo(() => sortTaskList(filteredTasks, sortMode), [filteredTasks, sortMode]);

  const openAddTaskModalForStatus = useCallback((statusInput = null) => {
    const normalizedStatusId =
      typeof statusInput === "string"
        ? statusInput
        : typeof statusInput === "object" && statusInput?._id
          ? statusInput._id
          : null;
    setModalInitialStatusId(normalizedStatusId);
    setModalInitialStatusMeta(
      typeof statusInput === "object" && statusInput
        ? statusInput
        : null
    );
    setAddTaskModalSessionKey((prev) => prev + 1);
    setAddTaskModalOpen(true);
  }, []);

  const handleAddTaskClick = useCallback(() => {
    openAddTaskModalForStatus();
  }, [openAddTaskModalForStatus]);

  const handleOpenAddStageModal = useCallback(async () => {
    if (!canAddStage) {
      message.error("You do not have permission to add stage.");
      return;
    }
    const workflowId = selectedWorkflowIdRef.current || await resolveTaskPageWorkflowId();
    if (!workflowId) {
      message.error("No workflow found to add stage.");
      return;
    }
    setAddStageModalOpen(true);
  }, [canAddStage, resolveTaskPageWorkflowId]);

  const handleAddStageSubmit = useCallback(async () => {
    if (!canAddStage) {
      message.error("You do not have permission to add stage.");
      return;
    }
    try {
      const values = await stageForm.validateFields();
      const workflowId = selectedWorkflowIdRef.current || await resolveTaskPageWorkflowId();

      if (!workflowId) {
        message.error("No workflow found to add stage.");
        return;
      }

      setStageSubmitting(true);
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addworkflowStatus,
        body: {
          workflow_id: workflowId,
          title: String(values?.title || "").trim(),
          color: values?.color || "#64748b",
        },
      });

      if (response?.data?.status) {
        message.success(response?.data?.message || "Stage added successfully");
        setAddStageModalOpen(false);
        stageForm.resetFields();
        await initializeBoardData();
      } else {
        message.error(response?.data?.message || "Failed to add stage");
      }
    } catch (error) {
      if (error?.errorFields) return;
      message.error(error?.response?.data?.message || error?.message || "Failed to add stage");
    } finally {
      setStageSubmitting(false);
    }
  }, [canAddStage, initializeBoardData, resolveTaskPageWorkflowId, stageForm]);

  const isCustomStage = useCallback(
    (column) =>
      Boolean(column?.statusId) &&
      !Boolean(column?.statusMeta?.isDefault),
    []
  );

  const handleStartRenameStage = useCallback((column) => {
    if (!canManageStageOrder) return;
    if (!isCustomStage(column)) return;
    setStageRenameId(column.id);
    setStageRenameValue(column.title || "");
  }, [canManageStageOrder, isCustomStage]);

  const handleRenameStageSubmit = useCallback(async (column) => {
    if (!canManageStageOrder) {
      setStageRenameId(null);
      message.error("You do not have permission to rename stage.");
      return;
    }
    if (!column?.statusId || !isCustomStage(column)) {
      setStageRenameId(null);
      return;
    }
    const nextTitle = String(stageRenameValue || "").trim();
    if (!nextTitle) {
      message.error("Stage name is required.");
      return;
    }
    if (nextTitle === String(column.title || "").trim()) {
      setStageRenameId(null);
      return;
    }
    try {
      const workflowId = await resolveTaskPageWorkflowId();
      if (!workflowId) {
        message.error("No workflow found to update stage.");
        return;
      }
      setStageRenaming(true);
      const response = await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: `${Service.updateworkflowStatus}/${column.statusId}`,
        body: {
          workflow_id: workflowId,
          title: nextTitle,
          color: column.color || "#64748b",
        },
      });
      if (response?.data?.status) {
        setStatusMetaBySection((prev) => ({
          ...prev,
          [column.id]: {
            ...(prev?.[column.id] || {}),
            title: nextTitle,
          },
        }));
        message.success(response?.data?.message || "Stage updated");
        setStageRenameId(null);
      } else {
        message.error(response?.data?.message || "Failed to update stage");
      }
    } catch (error) {
      message.error(error?.response?.data?.message || "Failed to update stage");
    } finally {
      setStageRenaming(false);
    }
  }, [canManageStageOrder, isCustomStage, resolveTaskPageWorkflowId, stageRenameValue]);

  const persistStageOrder = useCallback(async (orderedSectionIds) => {
    const orderedStatusIds = (orderedSectionIds || [])
      .map((sectionId) => String(statusMetaBySection?.[sectionId]?.statusId || sectionId || "").trim())
      .filter((id) => MONGO_ID_REGEX.test(id));
    if (!orderedStatusIds.length) return;

    const workflowsResponse = await Service.makeAPICall({
      methodName: Service.postMethod,
      api_url: Service.getworkflow,
      body: {
        isDropdown: true,
        pageNo: 1,
        limit: 500,
      },
    });
    const workflows = Array.isArray(workflowsResponse?.data?.data)
      ? workflowsResponse.data.data
      : [];
    if (!workflows.length) return;

    for (const workflow of workflows) {
      const workflowId = String(workflow?._id || "");
      if (!workflowId) continue;

      const stageListResponse = await Service.makeAPICall({
        methodName: Service.getMethod,
        api_url: `${Service.getworkflowStatus}/${workflowId}`,
      });
      const workflowStagesRaw = Array.isArray(stageListResponse?.data?.data)
        ? stageListResponse.data.data
        : [];
      const workflowStages = [...workflowStagesRaw].sort(
        (a, b) => Number(a?.sequence || 0) - Number(b?.sequence || 0)
      );
      if (!workflowStages.length) continue;

      const workflowStageIds = workflowStages
        .map((stage) => String(stage?._id || ""))
        .filter(Boolean);
      const workflowStageIdSet = new Set(workflowStageIds);

      const orderedStageIds = [
        ...orderedStatusIds.filter((id) => workflowStageIdSet.has(id)),
        ...workflowStageIds.filter((id) => !orderedStatusIds.includes(id)),
      ]
        .filter((id) => MONGO_ID_REGEX.test(String(id || "")))
        .filter((id, index, arr) => arr.indexOf(id) === index);

      if (orderedStageIds.length !== workflowStages.length) continue;

      await Service.makeAPICall({
        methodName: Service.putMethod,
        api_url: Service.reorderWorkflowStatus,
        body: {
          workflow_id: workflowId,
          ordered_stage_ids: orderedStageIds,
        },
      });
    }
  }, [statusMetaBySection]);

  const reorderSections = useCallback((fromId, toId) => {
    if (!canManageStageOrder) {
      message.error("You do not have permission to reorder stage.");
      return;
    }
    if (!fromId || !toId || fromId === toId) return;
    setListSectionIds((prev) => {
      const current = Array.isArray(prev) ? [...prev] : [];
      const fromIndex = current.indexOf(fromId);
      const toIndex = current.indexOf(toId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      current.splice(fromIndex, 1);
      current.splice(toIndex, 0, fromId);
      persistStageOrder(current).catch(() => {
        message.error("Failed to reorder stages");
      });
      return current;
    });
  }, [canManageStageOrder, persistStageOrder]);

  const kanbanColumns = useMemo(() => {
    const rawColumns = filteredSectionIds.map((bucketId) => {
      const sectionMeta = statusMetaBySection[bucketId] || {};
      const meta = getKanbanStatusMeta({ title: sectionMeta.title || bucketId, name: sectionMeta.title || bucketId });
      const colTasks = sectionBuckets[bucketId]?.tasks || [];
      const first = colTasks[0];
      return {
        id: bucketId,
        title: sectionMeta.title || meta.title,
        color: sectionMeta.color || meta.color,
        workflowId: sectionMeta.workflowId || null,
        workflowName: sectionMeta.workflowName || "",
        statusId: sectionMeta.statusId || first?._stId || first?.task_status?._id || null,
        statusMeta:
          first?.task_status || {
            _id: sectionMeta.statusId || null,
            title: sectionMeta.title || meta.title,
            color: sectionMeta.color || meta.color,
          },
        tasks: sortTaskList(colTasks, sortMode),
      };
    });

    // Always label each column with its workflow name so users can tell
    // which workflow a stage belongs to. Columns are never merged.
    const grouped = new Map();
    rawColumns.forEach((col) => {
      const wfLabel = col.workflowName ? ` (${col.workflowName})` : "";
      grouped.set(col.id, {
        ...col,
        title: col.title + wfLabel,
        tasks: [...(col?.tasks || [])],
      });
    });

    const all = [...grouped.values()];

    if (!kanbanStatusFilter) return all;

    const needle = String(kanbanStatusFilter || "");
    const filtered = all.filter(
      (col) =>
        String(col.id || "") === needle ||
        String(col.statusId || "") === needle
    );
    return filtered.length ? filtered : all;
  }, [filteredSectionIds, sectionBuckets, sortMode, kanbanStatusFilter, statusMetaBySection]);

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
      const d = dayjs(t.due_date).format("DD-MM-YYYY");
      if (!map[d]) map[d] = [];
      map[d].push(t);
    });
    return map;
  }, [sortedTasks]);

  const handleOpenEditTask = useCallback((task) => {
    if (!canEditTask) {
      message.error("You do not have permission to edit task.");
      return;
    }
    if (!task?._id) return;
    setTaskToEdit(task);
    setEditTaskModalOpen(true);
  }, [canEditTask]);

  const normalizeDateForApi = useCallback((value, withTime = false) => {
    if (!value) return null;
    if (typeof value === "string") return value;
    if (value?.format) return value.format(withTime ? "DD-MM-YYYY HH:mm:ss" : "DD-MM-YYYY");
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
    const targetStatusId = String(
      targetColumn?.statusId || targetColumn?.statusMeta?._id || ""
    );
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

      const mappedTargetBucketId =
        listSectionIds.find(
          (bid) =>
            String(statusMetaBySection?.[bid]?.statusId || "") === targetStatusId
        ) ||
        (listSectionIds.includes(String(targetColumn.id))
          ? String(targetColumn.id)
          : null);
      if (!mappedTargetBucketId) return prev;
      if (String(sourceId) === String(mappedTargetBucketId)) return prev;

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
      const targetBucket =
        next[mappedTargetBucketId] || {
          tasks: [],
          pageNo: 1,
          hasMore: false,
          loading: false,
          total: 0,
        };
      const targetTasks = [...(targetBucket.tasks || []).filter((t) => t._id !== taskId), updatedTask];
      next[mappedTargetBucketId] = {
        ...targetBucket,
        tasks: targetTasks,
      };
      return next;
    });
  }, [listSectionIds, statusMetaBySection]);

  const updateTaskKanbanStatus = useCallback(async (taskId, targetColumn, previousTask, previousBucketId = null) => {
    if (!canEditTask) {
      message.error("You do not have permission to move task.");
      return;
    }
    const statusToSend = targetColumn?.statusId || targetColumn?.statusMeta?._id || targetColumn?.title;
    if (!taskId || !statusToSend) {
      message.error("Unable to move task to this column");
      return;
    }

    /* workflow mismatch guard — task belongs to a different project workflow
       than the target stage, so moving it there would be invalid */
    const taskWorkflowId =
      previousTask?.task_status?.workflow_id ||
      statusMetaBySection[
        Object.keys(statusMetaBySection).find((sId) =>
          String(statusMetaBySection[sId]?.statusId || "") ===
          String(previousTask?.task_status?._id || previousTask?._stId || "")
        )
      ]?.workflowId;
    const targetWorkflowId = targetColumn?.workflowId;
    if (taskWorkflowId && targetWorkflowId && String(taskWorkflowId) !== String(targetWorkflowId)) {
      Modal.warning({
        title: "Stage not available",
        content: `The stage "${targetColumn?.title || "this stage"}" does not belong to this task's project workflow. Please use only the stages configured for the task's project.`,
        okText: "OK",
      });
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
                  assignees:
                    Array.isArray(updatedTask?.assignees) &&
                    updatedTask.assignees.some(
                      (a) => typeof a === "object" && (a?.full_name || a?.first_name || a?.last_name)
                    )
                      ? updatedTask.assignees
                      : task.assignees,
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
        const previousStatusId = String(
          previousTask?.task_status?._id || previousTask?._stId || ""
        );
        const derivedBucketFromStatus =
          Object.keys(statusMetaBySection || {}).find(
            (sectionId) =>
              String(statusMetaBySection?.[sectionId]?.statusId || "") === previousStatusId
          ) || null;
        const rollbackBucketId =
          previousBucketId ||
          derivedBucketFromStatus ||
          listSectionIds.find((id) => id === previousStatusId) ||
          null;

        Object.keys(next).forEach((bid) => {
          const currentBucket = next[bid] || { tasks: [] };
          next[bid] = {
            ...currentBucket,
            tasks: (currentBucket.tasks || []).filter((task) => task._id !== taskId),
          };
        });
        if (rollbackBucketId && next[rollbackBucketId]) {
          next[rollbackBucketId] = {
            ...next[rollbackBucketId],
            tasks: [...(next[rollbackBucketId].tasks || []), previousTask],
          };
        }
        return next;
      });
      message.error(error?.response?.data?.message || error?.message || "Failed to update task status");
    }
  }, [canEditTask, listSectionIds, moveTaskLocally, statusMetaBySection]);

  const handleKanbanDragStart = useCallback((task) => {
    setDraggingTaskId(task?._id || null);
  }, []);

  const handleKanbanDragEnd = useCallback(() => {
    setDraggingTaskId(null);
    setDragOverColumnId(null);
  }, []);

  const handleKanbanDrop = useCallback(async (targetColumn) => {
    if (!canEditTask) {
      setDragOverColumnId(null);
      setDraggingTaskId(null);
      return;
    }
    if (!draggingTaskId || !targetColumn) {
      setDragOverColumnId(null);
      return;
    }

    const draggedTask = mergedTasksFromBuckets.find((task) => task._id === draggingTaskId);
    const sourceBucketId =
      listSectionIds.find((bucketId) =>
        (sectionBuckets?.[bucketId]?.tasks || []).some((task) => task?._id === draggedTask?._id)
      ) || null;

    if (!draggedTask) {
      setDragOverColumnId(null);
      setDraggingTaskId(null);
      return;
    }

    const currentStatusId =
      String(
        draggedTask?.task_status?._id ||
        draggedTask?._stId ||
        ""
      );
    const targetStatusId = String(targetColumn?.statusId || targetColumn?.id || "");
    if (currentStatusId && targetStatusId && currentStatusId === targetStatusId) {
      setDragOverColumnId(null);
      setDraggingTaskId(null);
      return;
    }

    setDragOverColumnId(null);
    setDraggingTaskId(null);
    await updateTaskKanbanStatus(draggedTask._id, targetColumn, draggedTask, sourceBucketId);
  }, [canEditTask, draggingTaskId, listSectionIds, mergedTasksFromBuckets, sectionBuckets, updateTaskKanbanStatus]);

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
    if (!canDeleteTask) {
      message.error("You do not have permission to delete task.");
      return;
    }
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
  }, [canDeleteTask, deleteTasksByIds, dispatch, initializeBoardData, selectedTaskIds]);

  const handleDeleteOneTask = useCallback(
    (task) => {
      if (!canDeleteTask) {
        message.error("You do not have permission to delete task.");
        return;
      }
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
    [canDeleteTask, deleteTasksByIds, dispatch, initializeBoardData, selectedTask]
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
          {canDeleteTask && selectedTaskIds.length > 0 && (
            <Button
              type="button"
        className="delete-btn"
              onClick={handleDeleteSelected}
            >
              <PlusOutlined rotate={45} /> Delete Selected ({selectedTaskIds.length})
            </Button>
          )}
          {canAddTask && (
            <Button
              type="primary"
              className="add-btn"
              onClick={handleAddTaskClick}
            >
              <PlusOutlined /> Add Task
            </Button>
          )}
        </div>
      </div>

      {/* ── Row 2: View tabs + secondary controls ── */}
      <div className="task-page-tabsbar">
        <div className="task-page-tabs">
          
          <button
            className={`task-tab ${view === "kanban" ? "active" : ""}`}
            onClick={() => handleViewChange("kanban")}
          >
            <AppstoreOutlined className="task-tab-icon" /> Kanban
          </button>
          <button
            className={`task-tab ${view === "list" ? "active" : ""}`}
            onClick={() => handleViewChange("list")}
          >
            <UnorderedListOutlined className="task-tab-icon" /> List
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
        {workflowList.length > 0 && (
          <Select
            value={selectedWorkflowId || undefined}
            onChange={(val) => setSelectedWorkflowId(val)}
            placeholder="Select Workflow"
            className="task-workflow-select"
            style={{ minWidth: 160 }}
            options={workflowList.map((w) => ({
              value: w._id,
              label: w.project_workflow || "Unnamed",
            }))}
          />
        )}
      </div>

      <AddTaskModal
        key={`taskpage-add-modal-${addTaskModalSessionKey}`}
        open={addTaskModalOpen}
        initialStatusId={modalInitialStatusId}
        onCancel={() => {
          setAddTaskModalOpen(false);
          setModalInitialStatusId(null);
          setModalInitialStatusMeta(null);
        }}
        onSuccess={() => {
          setAddTaskModalOpen(false);
          setModalInitialStatusId(null);
          setModalInitialStatusMeta(null);
          initializeBoardData();
        }}
        initialStatusMeta={modalInitialStatusMeta}
        standalone
      />

      <Modal
        open={addStageModalOpen}
        title="Add Stage"
        okText="Save"
        onOk={handleAddStageSubmit}
        confirmLoading={stageSubmitting}
        onCancel={() => {
          setAddStageModalOpen(false);
          stageForm.resetFields();
        }}
        cancelButtonProps={{ className: "delete-btn" }}
        width="100%"
        style={{ maxWidth: 480 }}
      >
        <Form
          form={stageForm}
          layout="vertical"
          initialValues={{ title: "", color: "#64748b" }}
        >
          <Row gutter={[16, 16]}>

            <Col xs={24}>
              <Form.Item
                name="title"
                label="Stage Name"
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: "Please enter stage name",
                  },
                ]}
              >
                <Input placeholder="e.g. In Review" maxLength={60} />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item
                name="color"
                label="Color"
                rules={[
                  { required: true, message: "Please choose a color" },
                ]}
              >
                <Input type="color" />
              </Form.Item>
            </Col>

          </Row>
        </Form>
      </Modal>

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

      <CommonTaskFormModal
        key={selectedTask?._id || "view-task"}
        open={taskDetailModalOpen}
        mode="view"
        title="View Task"
        initialValues={mapTaskToEditFormInitial(selectedTask)}
        lockedProjectId={selectedTask ? getTaskProjectId(selectedTask) || undefined : undefined}
        lockedMainTaskId={
          selectedTask
            ? (typeof selectedTask?.mainTask === "object" && selectedTask?.mainTask?._id) ||
            (typeof selectedTask?.main_task_id === "object" && selectedTask?.main_task_id?._id) ||
            selectedTask?.main_task_id ||
            undefined
            : undefined
        }
        showListSelector={false}
        viewOnly
        taskId={selectedTask?._id}
        onCancel={() => {
          setTaskDetailModalOpen(false);
        }}
        onSubmit={() => { }}
        onEdit={canEditTask ? () => {
          pendingEditTaskRef.current = selectedTask;
          setTaskDetailModalOpen(false);
        } : undefined}
        afterClose={() => {
          setSelectedTask(null);
          if (pendingEditTaskRef.current) {
            handleOpenEditTask(pendingEditTaskRef.current);
            pendingEditTaskRef.current = null;
          }
        }}
      />

      {/* ── Content ── */}
      {loading ? (
        <TaskPageSkeleton view={view} />
      ) : view === "list" ? (
        <div
          className="task-list-view"
          ref={tasksContainerRef}
          style={{ overflowY: "auto", height: "calc(100vh - 300px)" }}
          onDragOver={handleListViewDragOver}
        >
          <div className="task-list-column-header">
            <span className="task-list-header-spacer" aria-hidden />
            <span className="task-list-header-spacer" aria-hidden />
            <span className="col-task-name">Task Name</span>
            <span className="col-due-date">Due Date</span>
            <span className="col-assignees">Assignee(s)</span>
            <span className="col-project">Project</span>
            <span className="col-actions">Action</span>
          </div>
          {kanbanColumns.length === 0 ? (
            <div className="task-list-empty" style={{ padding: 48, textAlign: "center", width: "100%" }}>
              <NoDataFoundIcon />
              <div className="" style={{ marginTop: 12, textAlign: "center", width: "100%" }}>
                <strong className="no-task-span">No Tasks to show.</strong>
              </div>
            </div>
          ) : (
            kanbanColumns.map((s) => (
              <TaskListSection
                key={s.id}
                sectionId={s.id}
                title={s.title}
                statusId={s.statusId}
                statusMeta={s.statusMeta || { _id: s.statusId, title: s.title, color: s.color }}
                count={statusTotals[s.id] ?? s.tasks.length}
                tasks={s.tasks}
                onAddTask={canAddTask ? openAddTaskModalForStatus : undefined}
                onOpenTask={handleOpenTask}
                onEditTask={canEditTask ? handleOpenEditTask : undefined}
                onDeleteTask={canDeleteTask ? handleDeleteOneTask : undefined}
                canEditTask={canEditTask}
                canDeleteTask={canDeleteTask}
                selectedTaskIds={selectedTaskIds}
                onSelectTask={handleSelectTask}
                onSectionScroll={handleListSectionScroll}
                isSectionLoading={Boolean(sectionBuckets[s.id]?.loading)}
                canManageStageOrder={canManageStageOrder}
                draggingStageId={draggingStageId}
                onStageDragStart={(id) => setDraggingStageId(id)}
                onStageDragEnd={() => setDraggingStageId(null)}
                onStageReorder={reorderSections}
              />
            ))
          )}
        </div>
      ) : view === "kanban" ? (
        <div className="task-kanban-view">
          {kanbanColumns.length === 0 ? (
            <div className="task-list-empty" style={{ padding: 48, textAlign: "center", width: "100%" }}>
              <NoDataFoundIcon />
              <div className="" style={{ marginTop: 12, textAlign: "center", width: "100%" }}>
                <strong className="no-task-span">No Tasks to show.</strong>
              </div>
            </div>
          ) : kanbanColumns.map((col) => (
            <div key={col.id} className="kanban-column" style={{ borderTopColor: col.color }}>
              <div
                className="kanban-column-header"
                draggable={canManageStageOrder}
                onDragStart={() => setDraggingStageId(col.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  reorderSections(draggingStageId, col.id);
                  setDraggingStageId(null);
                }}
                onDragEnd={() => setDraggingStageId(null)}
              >
                {stageRenameId === col.id ? (
                  <Input
                    size="small"
                    autoFocus
                    value={stageRenameValue}
                    onChange={(e) => setStageRenameValue(e.target.value)}
                    onPressEnter={() => handleRenameStageSubmit(col)}
                    onBlur={() => handleRenameStageSubmit(col)}
                    disabled={stageRenaming}
                    style={{ maxWidth: 180 }}
                  />
                ) : (
                  <span
                    className="kanban-column-title"
                    onDoubleClick={() => handleStartRenameStage(col)}
                    title={canManageStageOrder && isCustomStage(col) ? "Double click to rename" : undefined}
                  >
                    {col.title}
                  </span>
                )}
              </div>
              <div
                className={`kanban-column-cards ${dragOverColumnId === col.id ? "is-drop-target" : ""}`}
                style={{ overflowY: "auto" }}
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
                    draggable={canEditTask}
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
              <div className="kanban-column-footer">
                {canAddTask && (
                  <Button
                    className="add-btn "
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() =>
                      openAddTaskModalForStatus(
                        col.statusMeta || { _id: col.statusId, title: col.title, color: col.color }
                      )
                    }
                  >
                    Add Task
                  </Button>
                )}
              </div>
            </div>
          ))}
          {canAddStage && (
            <div className="kanban-add-stage-column" aria-label="Add stage column action">
              <Tooltip title="Add a stage" placement="top">
                <Button
                  type="text"

                  size="large"
                  className="kanban-add-stage-icon-btn"
                  icon={<PlusOutlined />}
                  onClick={handleOpenAddStageModal}
                  aria-label="Add a stage"
                />
              </Tooltip>
            </div>
          )}
        </div>
      ) : view === "calendar" ? (
        <div className="task-calendar-view">
          <div className="calendar-toolbar">
            <button type="button" onClick={() => setCalendarDate(calendarDate.subtract(1, calendarMode))}>&lt;</button>
            <div className="calendar-title-group">
              <span className="calendar-title">
                {calendarDate.format(calendarMode === "month" ? "MMMM YYYY" : "DD-MM-YYYY")}
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
  statusId,
  statusMeta,
  count,
  tasks,
  onAddTask,
  onOpenTask,
  onEditTask,
  onDeleteTask,
  selectedTaskIds,
  onSelectTask,
  onSectionScroll,
  isSectionLoading,
  canManageStageOrder = false,
  draggingStageId,
  onStageDragStart,
  onStageDragEnd,
  onStageReorder,
  canEditTask = false,
  canDeleteTask = false,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const isDropTarget =
    canManageStageOrder &&
    Boolean(draggingStageId) &&
    String(draggingStageId) !== String(sectionId);
  return (
    <div className="task-list-section">
      <div
        className={`task-list-section-header ${isDropTarget ? "is-drop-target" : ""}`}
        draggable={canManageStageOrder}
        onDragStart={() => onStageDragStart?.(sectionId)}
        onDragOver={(event) => {
          if (!canManageStageOrder) return;
          event.preventDefault();
        }}
        onDrop={(event) => {
          if (!canManageStageOrder) return;
          event.preventDefault();
          onStageReorder?.(draggingStageId, sectionId);
          onStageDragEnd?.();
        }}
        onDragEnd={() => onStageDragEnd?.()}
      >
        {canManageStageOrder ? (
          <DragOutlined className="task-list-section-drag-icon" />
        ) : null}
        <button type="button" className="task-list-section-toggle" onClick={() => setCollapsed((c) => !c)}>
          <span className={`section-chevron ${collapsed ? "collapsed" : ""}`} />
          <span className="section-title">{title}</span>
          <span className="section-count">{count}</span>
        </button>
        {onAddTask && (
          <Button
            className="add-btn "
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => onAddTask?.(statusMeta || statusId)}
          >
            Add Task
          </Button>
        )}
      </div>
      {!collapsed && (
        <div
          className="task-list-body"
          style={{ maxHeight: 320, overflowY: "auto" }}
          onScroll={(event) => onSectionScroll(event, sectionId)}
        >
          {tasks.length === 0 ? (
            <div className="task-list-empty" style={{ padding: "24px 0", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <NoDataFoundIcon style={{  marginBottom: 8 }} />
              <div className="" style={{ marginTop: 12, textAlign: "center", width: "100%" }}>
                <strong className="no-task-span">No Tasks to show.</strong>
              </div>
            </div>
          ) : (
            tasks.map((t) => (
              <TaskRow
                key={t._id}
                task={t}
                onOpen={() => onOpenTask(t)}
                onEdit={() => onEditTask(t)}
                onDelete={() => onDeleteTask(t)}
                canEditTask={canEditTask}
                canDeleteTask={canDeleteTask}
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

function TaskRow({
  task,
  onOpen,
  onEdit,
  onDelete,
  isSelected,
  onSelect,
  canEditTask = false,
  canDeleteTask = false,
}) {
  const dueStr = task.due_date ? dayjs(task.due_date).format("DD-MM-YYYY") : "—";
  const dueDateKey = task.due_date ? dayjs(task.due_date).format("DD-MM-YYYY") : null;
  const isOverdue = task.due_date && dayjs(task.due_date).isBefore(dayjs(), "day");
  const assigneeNames = getAssigneesDisplay(task.assignees);
  const projectTitle = getTaskProjectTitle(task);
  const initials =
    assigneeNames.length > 0
      ? assigneeNames[0].slice(0, 2).toUpperCase()
      : "—";
  const commentCount = getTaskCommentCount(task);

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
        <span className="task-row-comment"><MessageOutlined /> {commentCount}</span>
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
        {canEditTask && (
          <Button
            type="text"
            size="small"
            className="task-row-action-btn"
            icon={<EditOutlined />}
            aria-label="Edit task"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.();
            }}
          />
        )}
        {canDeleteTask && (
          <Button
            type="text"
            size="small"
            danger
            className="task-row-action-btn"
            icon={<DeleteOutlined />}
            aria-label="Delete task"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
          />
        )}
      </div>
    </div>
  );
}

function TaskCard({ task, onClick, draggable = false, isDragging = false, onDragStart, onDragEnd }) {
  const dueStr = task.due_date ? dayjs(task.due_date).format("DD-MM-YYYY") : "—";
  const assigneeNames = getAssigneesDisplay(task.assignees);
  const assigneesLabel = assigneeNames.length > 0 ? assigneeNames.join(", ") : "Unassigned";
  const commentCount = getTaskCommentCount(task);
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
        <span className="task-card-comments" title="Comments">
          <MessageOutlined /> {commentCount}
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
        arr.push(d.format("DD-MM-YYYY"));
        d = d.add(1, "day");
      }
      return arr;
    }
    if (mode === "week") {
      const start = current.startOf("week");
      return Array.from({ length: 7 }, (_, i) => start.add(i, "day").format("DD-MM-YYYY"));
    }
    return [current.format("DD-MM-YYYY")];
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
              <div className="calendar-day-num">{parseInt(dateStr.split("-")[0], 10)}</div>
              <div className="calendar-day-tasks">
                {list.map((t) => {
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TaskPage;
