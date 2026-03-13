import React, { useState, useCallback, useEffect, useMemo, Suspense, lazy } from "react";
import { Input, Select, Checkbox, Spin, Avatar, Dropdown } from "antd";
import {
  SearchOutlined,
  FilterOutlined,
  PlusOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  CalendarOutlined,
  DownOutlined,
  FlagOutlined,
  MessageOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useHistory, useLocation } from "react-router-dom";
import dayjs from "dayjs";
import Service from "../../service";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import { useDispatch } from "react-redux";
import { getRoles } from "../../util/hasPermission";
import AddTaskModal from "../Tasks/AddTaskModal";
import "./TaskPage.css";

const TaskDetailModal = lazy(() => import("./TaskDetailModal"));

const { Option } = Select;

const TODAY = dayjs().format("YYYY-MM-DD");

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
function getFilterStateFromSearch(search, isAdmin) {
  const params = new URLSearchParams(search || "");
  const filter = params.get("filter");
  if (filter === "assigned_to_me") {
    return { viewAll: false, statusFilter: "all", taskStartDate: null, taskEndDate: null };
  }
  if (filter === "due_today") {
    const today = dayjs().format("YYYY-MM-DD");
    return { viewAll: isAdmin, statusFilter: "all", taskStartDate: today, taskEndDate: today };
  }
  if (filter === "past_due") {
    const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");
    return { viewAll: isAdmin, statusFilter: "incomplete", taskStartDate: null, taskEndDate: yesterday };
  }
  if (filter === "all") {
    return { viewAll: isAdmin, statusFilter: "all", taskStartDate: null, taskEndDate: null };
  }
  return { viewAll: true, statusFilter: "all", taskStartDate: null, taskEndDate: null };
}

const TaskPage = () => {
  const dispatch = useDispatch();
  const history = useHistory();
  const location = useLocation();
  const companySlug = localStorage.getItem("companyDomain");
  const isAdmin = getRoles(["Admin"]);

  const filterState = getFilterStateFromSearch(location.search, isAdmin);

  const [view, setView] = useState("list"); // list | kanban | calendar
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(filterState.statusFilter);
  const [projectFilter, setProjectFilter] = useState([]);
  const [viewAll, setViewAll] = useState(filterState.viewAll);
  const [taskStartDate, setTaskStartDate] = useState(filterState.taskStartDate);
  const [taskEndDate, setTaskEndDate] = useState(filterState.taskEndDate);
  const [calendarMode, setCalendarMode] = useState("month");
  const [calendarDate, setCalendarDate] = useState(dayjs());
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [taskDetailModalOpen, setTaskDetailModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Sync state when URL changes (e.g. user navigates to same page with different filter)
  useEffect(() => {
    const next = getFilterStateFromSearch(location.search, isAdmin);
    setViewAll(next.viewAll);
    setStatusFilter(next.statusFilter);
    setTaskStartDate(next.taskStartDate);
    setTaskEndDate(next.taskEndDate);
  }, [location.search, isAdmin]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.myProjects,
        body: {},
      });
      if (res?.status === 200 && Array.isArray(res?.data?.data)) {
        setProjects(res.data.data);
      }
    } catch (e) {
      console.error("fetchProjects", e);
    }
  }, []);

  const fetchTaskList = useCallback(async () => {
    setLoading(true);
    dispatch(showAuthLoader());
    try {
      const body = {
        search: search.trim() || undefined,
        status: statusFilter,
        project_id: projectFilter?.length ? projectFilter : undefined,
        view_all: isAdmin ? viewAll : false,
        ...(taskStartDate ? { start_date: taskStartDate } : {}),
        ...(taskEndDate ? { end_date: taskEndDate } : {}),
      };

      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.taskList,
        body,
      });
      dispatch(hideAuthLoader());
      if (res?.status === 200) {
        const raw = res?.data?.data;
        setTasks(Array.isArray(raw) ? raw : []);
      } else {
        setTasks([]);
      }
    } catch (e) {
      dispatch(hideAuthLoader());
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [dispatch, search, statusFilter, projectFilter, viewAll, isAdmin, taskStartDate, taskEndDate]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchTaskList();
  }, [fetchTaskList]);

  const { todayTasks, overdueTasks, upcomingTasks } = useMemo(() => {
    const today = [];
    const overdue = [];
    const upcoming = [];
    tasks.forEach((t) => {
      const due = t.due_date ? dayjs(t.due_date).format("YYYY-MM-DD") : null;
      if (!due) { upcoming.push(t); return; }
      if (due === TODAY) today.push(t);
      else if (dayjs(due).isBefore(dayjs(), "day")) overdue.push(t);
      else upcoming.push(t);
    });
    return {
      todayTasks: today,
      overdueTasks: overdue.sort((a, b) => new Date(a.due_date) - new Date(b.due_date)),
      upcomingTasks: upcoming.sort((a, b) => new Date(a.due_date) - new Date(b.due_date)),
    };
  }, [tasks]);

  const kanbanColumns = useMemo(() => {
    const byStatus = {};
    tasks.forEach((t) => {
      const key = t.task_status?._id ? String(t.task_status._id) : "_none_";
      if (!byStatus[key]) {
        byStatus[key] = {
          id: key,
          title: t.task_status?.title || "No status",
          color: t.task_status?.color || "#d9d9d9",
          tasks: [],
        };
      }
      byStatus[key].tasks.push(t);
    });
    return Object.values(byStatus).sort((a, b) => a.title.localeCompare(b.title));
  }, [tasks]);

  const calendarTasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach((t) => {
      if (!t.due_date) return;
      const d = dayjs(t.due_date).format("YYYY-MM-DD");
      if (!map[d]) map[d] = [];
      map[d].push(t);
    });
    return map;
  }, [tasks]);

  const handleOpenTask = (task) => {
    setSelectedTask(task);
    setTaskDetailModalOpen(true);
  };

  const handleOpenInProject = (path) => {
    if (path) history.push(path);
  };

  const settingsMenu = {
    items: [
      { key: "columns", label: "Customize columns" },
      { key: "preferences", label: "Preferences" },
    ],
  };

  return (
    <div className="task-page">

      {/* ── Row 1: Title + Controls ── */}
      <div className="task-page-topbar">
        <h1 className="task-page-title">Task</h1>
        <div className="task-page-controls">
          <Input
            placeholder="Search..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={fetchTaskList}
            className="task-search"
            allowClear
          />
          <button type="button" className="task-filter-btn">
            <FilterOutlined /> Filter
          </button>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            className="task-filter-select"
            options={[
              { value: "all", label: "Status" },
              { value: "incomplete", label: "Incomplete" },
              { value: "completed", label: "Completed" },
            ]}
          />
          <button type="button" className="task-filter-btn">
            Default <DownOutlined style={{ fontSize: 10, marginLeft: 4 }} />
          </button>
          <button type="button" className="task-filter-btn">
            <CalendarOutlined /> Date Type
          </button>
          <button
            type="button"
            className="task-btn-add"
            onClick={() => setAddTaskModalOpen(true)}
          >
            <PlusOutlined /> Add Task
          </button>
        </div>
      </div>

      {/* ── Row 2: View tabs + secondary controls ── */}
      <div className="task-page-tabsbar">
        <div className="task-page-tabs">
          <button
            className={`task-tab ${view === "list" ? "active" : ""}`}
            onClick={() => setView("list")}
          >
            <UnorderedListOutlined className="task-tab-icon" /> List
          </button>
          <button
            className={`task-tab ${view === "kanban" ? "active" : ""}`}
            onClick={() => setView("kanban")}
          >
            <AppstoreOutlined className="task-tab-icon" /> Kanban
          </button>
          <button
            className={`task-tab ${view === "calendar" ? "active" : ""}`}
            onClick={() => setView("calendar")}
          >
            <CalendarOutlined className="task-tab-icon" /> Calendar
          </button>
        </div>
        <div className="task-page-tabs-right">
          <Select
            mode="multiple"
            placeholder="Project"
            value={projectFilter}
            onChange={setProjectFilter}
            className="task-filter-select task-filter-project"
            allowClear
            maxTagCount={1}
          >
            {projects.map((p) => (
              <Option key={p._id} value={p._id}>{p.title}</Option>
            ))}
          </Select>
          {isAdmin && (
            <Checkbox
              checked={viewAll}
              onChange={(e) => setViewAll(e.target.checked)}
              className="task-view-all"
            >
              All tasks
            </Checkbox>
          )}
          <Dropdown menu={settingsMenu} trigger={["click"]}>
            <button type="button" className="task-btn-ghost">
              <SettingOutlined /> Customize
            </button>
          </Dropdown>
          <Dropdown menu={{ items: [{ key: "more", label: "More options" }] }} trigger={["click"]}>
            <button type="button" className="task-btn-ghost">
              More <DownOutlined />
            </button>
          </Dropdown>
        </div>
      </div>

      <AddTaskModal
        open={addTaskModalOpen}
        onCancel={() => setAddTaskModalOpen(false)}
        onSuccess={() => {
          setAddTaskModalOpen(false);
          fetchTaskList();
        }}
        standalone
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
        <div className="task-page-loading">
          <Spin size="large" />
        </div>
      ) : view === "list" ? (
        <div className="task-list-view">
          <div className="task-list-column-header">
            <span className="col-task-name">Task Name</span>
            <span className="col-due-date">Due Date</span>
            <span className="col-assignees">Assignee(s)</span>
            <span className="col-status">Status</span>
          </div>
          <TaskListSection title="Today" count={todayTasks.length} tasks={todayTasks} onOpenTask={handleOpenTask} />
          <TaskListSection title="Overdue" count={overdueTasks.length} tasks={overdueTasks} onOpenTask={handleOpenTask} />
          <TaskListSection title="Upcoming" count={upcomingTasks.length} tasks={upcomingTasks} onOpenTask={handleOpenTask} />
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
                <span className="kanban-column-count">({col.tasks.length})</span>
              </div>
              <div className="kanban-column-cards">
                {col.tasks.map((t) => (
                  <TaskCard key={t._id} task={t} onClick={() => handleOpenTask(t)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="task-calendar-view">
          <div className="calendar-toolbar">
            <button type="button" onClick={() => setCalendarDate(calendarDate.subtract(1, calendarMode))}>&lt;</button>
            <span className="calendar-title">
              {calendarDate.format(calendarMode === "month" ? "MMMM YYYY" : "YYYY-MM-DD")}
            </span>
            <button type="button" onClick={() => setCalendarDate(calendarDate.add(1, calendarMode))}>&gt;</button>
            <button type="button" onClick={() => setCalendarDate(dayjs())}>Today</button>
            <div className="calendar-mode">
              <button className={calendarMode === "month" ? "active" : ""} onClick={() => setCalendarMode("month")}>Month</button>
              <button className={calendarMode === "week" ? "active" : ""} onClick={() => setCalendarMode("week")}>Week</button>
              <button className={calendarMode === "day" ? "active" : ""} onClick={() => setCalendarMode("day")}>Day</button>
            </div>
          </div>
          <CalendarGrid mode={calendarMode} current={calendarDate} tasksByDate={calendarTasksByDate} onOpenTask={handleOpenTask} />
        </div>
      )}
    </div>
  );
};

function TaskListSection({ title, count, tasks, onOpenTask }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="task-list-section">
      <button type="button" className="task-list-section-header" onClick={() => setCollapsed((c) => !c)}>
        <span className={`section-chevron ${collapsed ? "collapsed" : ""}`} />
        <span className="section-title">{title}</span>
        <span className="section-count">{count}</span>
      </button>
      {!collapsed && (
        <div className="task-list-body">
          {tasks.length === 0 ? (
            <div className="task-list-empty">No tasks</div>
          ) : (
            tasks.map((t) => <TaskRow key={t._id} task={t} onOpen={() => onOpenTask(t)} />)
          )}
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, onOpen }) {
  const dueStr = task.due_date ? dayjs(task.due_date).format("MMM D, YYYY") : "—";
  const dueDateKey = task.due_date ? dayjs(task.due_date).format("YYYY-MM-DD") : null;
  const isOverdue = dueDateKey && dayjs(dueDateKey).isBefore(dayjs(), "day");
  const statusTitle = task.task_status?.title || "Pending";
  const statusColor = task.task_status?.color || "#faad14";
  const assigneeNames = getAssigneesDisplay(task.assignees);
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
      <div className="task-row-checkbox" />
      <span className="task-row-pin" title="Pin"><i className="fi fi-rr-thumbtack" style={{ fontSize: 12, color: "#bbb" }} /></span>
      <span className="task-row-flag"><FlagOutlined style={{ color: "#52c41a", fontSize: 12 }} /></span>
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
      <div className="task-row-status">
        <span className="task-status-pill" style={{ borderColor: statusColor, color: statusColor }}>
          <span className="task-status-dot" style={{ background: statusColor }} />
          {statusTitle}
          <DownOutlined className="task-status-dropdown" />
        </span>
      </div>
    </div>
  );
}

function TaskCard({ task, onClick }) {
  const dueStr = task.due_date ? dayjs(task.due_date).format("MMM D, YYYY") : "—";
  const progress = task.task_progress || "0";
  const assigneeNames = getAssigneesDisplay(task.assignees);
  const assigneesLabel = assigneeNames.length > 0 ? assigneeNames.join(", ") : "Unassigned";
  return (
    <div
      role="button"
      tabIndex={0}
      className="task-card"
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <div className="task-card-title">{task.title}</div>
      {task.project?.title && <div className="task-card-project">{task.project.title}</div>}
      <div className="task-card-due">{dueStr}</div>
      <div className="task-card-footer">
        <span className="task-card-assignees" title={assigneesLabel}>
          {assigneesLabel}
        </span>
        <span className="task-card-progress">{progress}%</span>
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
