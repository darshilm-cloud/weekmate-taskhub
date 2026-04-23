/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback } from "react";
import {
  Tabs,
  Select,
  Table,
  Spin,
  Empty,
  Tooltip,
  Button,
  Input,
} from "antd";
import {
  PlusOutlined,
  CalendarOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  CheckCircleFilled,
  ClockCircleFilled,
  FileDoneOutlined,
  EditOutlined,
  MessageOutlined,
} from "@ant-design/icons";
import ReactApexChart from "react-apexcharts";
import dayjs from "dayjs";
import Service from "../../service";
import { removeTitle } from "../../util/nameFilter";
import { UserDashboardSkeleton } from "../../components/common/SkeletonLoader";
import AddTaskModal from "../Tasks/AddTaskModal";
import "./UserDashboard.css";
import NoDataFoundIcon from "../../components/common/NoDataFoundIcon";
import CommonTaskFormModal from "../Tasks/CommonTaskFormModal";

const { TabPane } = Tabs;
const { Option } = Select;

/* ─── helpers ──────────────────────────────────────────────────── */
const getTaskProjectId = (task) => {
  if (typeof task?.project === "object") return task.project._id;
  return task?.project || task?.project_id;
};

const mapTaskToEditFormInitial = (task) => {
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
  const rawLabels = task.taskLabels || task.task_labels || task.labels || [];
  const labelIds = (Array.isArray(rawLabels) ? rawLabels : [])
    .map((l) => (typeof l === "object" ? l._id || l.id : l))
    .filter(Boolean);
  const due = task.due_date || task.end_date;
  
  return {
    ...task,
    title: task.title || "",
    description: task.descriptions || task.description || "",
    project_id: projectId || undefined,
    main_task_id: mainTaskId,
    assignees: assigneeIds,
    task_labels: labelIds,
    start_date: task.start_date ? dayjs(task.start_date) : undefined,
    end_date: due ? dayjs(due) : undefined,
    priority: task.priority || "Low",
    custom_fields: task.custom_fields && typeof task.custom_fields === "object" ? { ...task.custom_fields } : {},
  };
};

/* ─── helpers ──────────────────────────────────────────────────── */
const AVATAR_COLORS = [
  "#2563eb", "#7c3aed", "#db2777", "#dc2626",
  "#d97706", "#16a34a", "#0891b2", "#4f46e5",
];
const avatarColor = (name = "") => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};
const initials = (n = "") =>
  n.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

const getAssigneesDisplay = (assignees) => {
  if (!Array.isArray(assignees)) return [];
  return assignees.map((a) => {
    if (!a) return "Unknown";
    if (typeof a === "object") {
      return a.full_name || `${a.first_name || ""} ${a.last_name || ""}`.trim() || a.email || "Unknown";
    }
    return a;
  });
};

const getTaskCommentCount = (task) => {
  if (typeof task?.commentsCount === "number") return task.commentsCount;
  if (Array.isArray(task?.comments)) return task.comments.length;
  return 0;
};

/* ─── Sub-Components ───────────────────────────────────────────── */

function TaskCard({ task, onClick }) {
  const dueStr = task.due_date ? dayjs(task.due_date).format("DD-MM-YYYY") : "—";
  const assigneeNames = getAssigneesDisplay(task.assignees);
  const assigneesLabel = assigneeNames.length > 0 ? assigneeNames.join(", ") : "Unassigned";
  const commentCount = getTaskCommentCount(task);
  return (
    <div
      role="button"
      tabIndex={0}
      className="ud-kanban-card"
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <div className="ud-kanban-card-title">{task.title}</div>
      {task.project?.title && <div className="ud-kanban-card-project">{task.project.title}</div>}
      <div className="ud-kanban-card-due">{dueStr}</div>
      <div className="ud-kanban-card-footer">
        <span className="ud-kanban-card-assignees" title={assigneesLabel}>
          {assigneesLabel}
        </span>
        <span className="ud-kanban-card-comments">
          <MessageOutlined /> {commentCount}
        </span>
      </div>
    </div>
  );
}

function CalendarGrid({ mode, current, tasksByDate, onOpenTask }) {
  const days = React.useMemo(() => {
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
    <div className="ud-calendar-grid">
      {mode === "month" && (
        <div className="ud-calendar-weekdays">
          {weekDays.map((d) => <div key={d} className="ud-calendar-weekday">{d}</div>)}
        </div>
      )}
      <div className="ud-calendar-days" style={{ gridTemplateColumns: `repeat(${mode === "month" ? 7 : mode === "week" ? 7 : 1}, 1fr)` }}>
        {days.map((dateStr) => {
          const list = tasksByDate[dateStr] || [];
          return (
            <div key={dateStr} className="ud-calendar-day-cell">
              <div className="ud-calendar-day-num">{parseInt(dateStr.split("-")[0], 10)}</div>
              <div className="ud-calendar-day-tasks">
                {list.map((t) => (
                  <button
                    key={t._id}
                    type="button"
                    className="ud-calendar-task-bar"
                    onClick={() => onOpenTask(t)}
                    title={t.title}
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Stat Card ─────────────────────────────────────────────────── */
const StatCard = ({ label, value, iconEl, variant, loading }) => (
  <div className={`ud-stat-card ${variant}`}>
    <div className="ud-stat-body">
      <div className="ud-stat-label">{label}</div>
      {loading ? (
        <Spin size="small" />
      ) : (
        <div className="ud-stat-value">{value}</div>
      )}
    </div>
    <div className={`ud-stat-icon ${variant === "completed" ? "green" : variant === "incomplete" ? "orange" : "blue"}`}>
      {iconEl}
    </div>
  </div>
);

/* ─── Main Component ────────────────────────────────────────────── */
const UserDashboard = ({ user }) => {
  const userName = removeTitle(
    user?.full_name || `${user?.first_name || ""} ${user?.last_name || ""}`.trim()
  );

  /* ── state ── */
  const [activeTab, setActiveTab] = useState("overviews");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortFilter, setSortFilter] = useState("default");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [taskDetailModalOpen, setTaskDetailModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  /* ── analytics state ── */
  const [stats, setStats] = useState({ completed: 0, incomplete: 0, total: 0 });
  const [priorityData, setPriorityData] = useState({ low: 0, medium: 0, high: 0 });
  const [performanceData, setPerformanceData] = useState({ onTrack: 0, beforeTime: 0, delayed: 0 });
  const [incompleteByStatus, setIncompleteByStatus] = useState([]);
  const [tasks, setTasks] = useState([]);

  /* ── view states ── */
  const [calendarDate, setCalendarDate] = useState(dayjs());
  const [calendarMode, setCalendarMode] = useState("month");

  /* ── date range helper ── */
  const getDateRange = () => {
    const now = dayjs();
    let from = dayjs();
    if (dateFilter === "today") {
      from = from.startOf("day");
    } else if (dateFilter === "yesterday") {
      from = from.subtract(1, "day").startOf("day");
    } else if (dateFilter === "week") {
      from = from.subtract(7, "days");
    } else if (dateFilter === "month") {
      from = from.subtract(1, "month");
    }
    return dateFilter === "all" ? {} : { from: from.toISOString(), to: now.toISOString() };
  };

  /* ── process raw task array into analytics ── */
  const processTaskArray = useCallback((rawTasks) => {
    const range = getDateRange();
    const filtered = range.from
      ? rawTasks.filter((t) => {
        const d = dayjs(t.due_date || t.created_at);
        return (d.isAfter(dayjs(range.from)) || d.isSame(dayjs(range.from))) &&
          (d.isBefore(dayjs(range.to)) || d.isSame(dayjs(range.to)));
      })
      : rawTasks;

    const total = filtered.length;
    const doneKeywords = ["done", "complete", "closed", "finish"];
    const completed = filtered.filter((t) =>
      doneKeywords.some(
        (kw) =>
          t.task_status?.title?.toLowerCase().includes(kw) ||
          t.status?.toLowerCase() === kw
      )
    ).length;
    const incomplete = total - completed;

    /* priority */
    const priority = { low: 0, medium: 0, high: 0 };
    filtered.forEach((t) => {
      const p = (t.priority || "low").toLowerCase();
      if (priority[p] !== undefined) priority[p]++;
      else priority.low++;
    });

    /* performance (due-date based) */
    const now = new Date();
    const perf = { onTrack: 0, beforeTime: 0, delayed: 0 };
    filtered.forEach((t) => {
      const isDone = doneKeywords.some(
        (kw) =>
          t.task_status?.title?.toLowerCase().includes(kw) ||
          t.status?.toLowerCase() === kw
      );
      if (!t.due_date) {
        perf.onTrack++;
        return;
      }
      const due = new Date(t.due_date);
      const done = new Date(t.updated_at || t.created_at);
      if (isDone) {
        done <= due ? perf.beforeTime++ : perf.delayed++;
      } else {
        due >= now ? perf.onTrack++ : perf.delayed++;
      }
    });

    /* incomplete by status */
    const byStatus = {};
    filtered
      .filter((t) => !doneKeywords.some(
        (kw) =>
          t.task_status?.title?.toLowerCase().includes(kw) ||
          t.status?.toLowerCase() === kw
      ))
      .forEach((t) => {
        const s = t.task_status?.title || t.status || "Pending";
        byStatus[s] = (byStatus[s] || 0) + 1;
      });

    setStats({ total, completed, incomplete });
    setPriorityData(priority);
    setPerformanceData(perf);
    setIncompleteByStatus(
      Object.entries(byStatus).map(([name, count]) => ({ name, count }))
    );
    setTasks(filtered);
  }, [dateFilter]); // eslint-disable-line

  const handleOpenTask = (task) => {
    setSelectedTask(task);
    setTaskDetailModalOpen(true);
  };

  /* ── fetch ── */
  const fetchData = useCallback(async () => {
    if (!user?._id) return;
    setLoading(true);
    try {
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.taskList,
        body: { view_all: true },
      });

      const rawTasks = Array.isArray(res?.data?.data) ? res.data.data : [];
      const matchedTasks = rawTasks.filter((task) => {
        const assignees = Array.isArray(task?.assignees) ? task.assignees : [];
        return assignees.some((assignee) => {
          const assigneeId = String(assignee?._id || assignee?.id || assignee);
          return assigneeId === String(user._id);
        });
      });

      processTaskArray(matchedTasks);
    } catch (err) {
      console.error("UserDashboard fetchData error:", err);
      setStats({ completed: 0, incomplete: 0, total: 0 });
      setPriorityData({ low: 0, medium: 0, high: 0 });
      setPerformanceData({ onTrack: 0, beforeTime: 0, delayed: 0 });
      setIncompleteByStatus([]);
      setTasks([]);
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  }, [user?._id, dateFilter, processTaskArray]);

  useEffect(() => {
    fetchData();
    /* reset tab when user changes */
    setActiveTab("overviews");
  }, [user?._id, dateFilter]); // eslint-disable-line

  /* ────────────────────────────────────────────────
     CHART OPTIONS
  ─────────────────────────────────────────────────── */

  /* Priority donut */
  const priorityTotal = priorityData.low + priorityData.medium + priorityData.high || 1;
  const donutOptions = {
    chart: { type: "donut", fontFamily: "inherit", animations: { enabled: false } },
    labels: ["Low", "Medium", "High"],
    colors: ["#16a34a", "#f59e0b", "#ef4444"],
    legend: { show: false },
    plotOptions: {
      pie: {
        donut: {
          size: "68%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "",
              fontSize: "26px",
              fontWeight: 700,
              color: "#1e293b",
              formatter: () => String(priorityTotal === 1 && stats.total === 0 ? 0 : stats.total),
            },
          },
        },
      },
    },
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    tooltip: { y: { formatter: (v) => `${v} tasks` } },
  };
  const donutSeries = [priorityData.low, priorityData.medium, priorityData.high];

  /* Performance horizontal bar */
  const perfMax = Math.max(performanceData.onTrack, performanceData.beforeTime, performanceData.delayed, 1);
  const perfOptions = {
    chart: {
      type: "bar",
      fontFamily: "inherit",
      toolbar: { show: false },
      animations: { enabled: false },
      parentHeightOffset: 0,
    },
    plotOptions: {
      bar: { horizontal: true, borderRadius: 4, barHeight: "40%", dataLabels: { position: "bottom" } },
    },
    colors: ["#16a34a", "#f59e0b", "#ef4444"],
    xaxis: {
      categories: ["On Track", "Before Time", "Delayed"],
      min: 0,
      max: perfMax,
      tickAmount: Math.min(perfMax, 5),
      labels: { style: { fontSize: "11px" }, formatter: (v) => Math.floor(v) },
    },
    yaxis: { labels: { style: { fontSize: "11px" }, maxWidth: 100 } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#f1f5f9", xaxis: { lines: { show: true } }, padding: { left: 10, right: 16 } },
    tooltip: { y: { formatter: (v) => `${v} tasks` } },
  };
  const perfSeries = [{
    name: "Tasks",
    data: [performanceData.onTrack, performanceData.beforeTime, performanceData.delayed],
  }];

  /* Incomplete tasks vertical bar */
  const incompleteCategories = incompleteByStatus.length
    ? incompleteByStatus.map((d) => d.name)
    : ["Pending"];
  const incompleteCounts = incompleteByStatus.length
    ? incompleteByStatus.map((d) => d.count)
    : [stats.incomplete || 0];
  const incompleteOptions = {
    chart: { type: "bar", fontFamily: "inherit", toolbar: { show: false }, animations: { enabled: false } },
    plotOptions: { bar: { borderRadius: 5, columnWidth: "35%" } },
    colors: ["#f59e0b"],
    xaxis: { categories: incompleteCategories, labels: { style: { fontSize: "12px" } } },
    yaxis: {
      min: 0,
      forceNiceScale: true,
      labels: { style: { fontSize: "12px" }, formatter: (v) => Math.floor(v) },
    },
    dataLabels: { enabled: false },
    grid: { borderColor: "#f1f5f9" },
    tooltip: { y: { formatter: (v) => `${v} tasks` } },
  };
  const incompleteSeries = [{ name: "Incomplete Tasks", data: incompleteCounts }];

  /* ────────────────────────────────────────────────
     TASK LIST COLUMNS
  ─────────────────────────────────────────────────── */
  const taskColumns = [
    {
      title: "Task",
      dataIndex: "title",
      key: "title",
      render: (v) => <span style={{ fontWeight: 500 }}>{v || "—"}</span>,
    },
    {
      title: "Priority",
      dataIndex: "priority",
      key: "priority",
      width: 100,
      render: (v) => (
        <span className={`ud-priority-tag ${(v || "low").toLowerCase()}`}>
          {v || "Low"}
        </span>
      ),
    },
    {
      title: "Status",
      key: "status",
      width: 130,
      render: (_, r) => {
        const s = r.task_status?.title || r.status || "Pending";
        const variant = s.toLowerCase().includes("done") || s.toLowerCase().includes("complete")
          ? "done"
          : s.toLowerCase().includes("progress")
            ? "progress"
            : "pending";
        return <span className={`ud-status-tag ${variant}`}>{s}</span>;
      },
    },
    {
      title: "Due Date",
      dataIndex: "due_date",
      key: "due_date",
      width: 110,
      render: (v) =>
        v ? (
          <span style={{ fontSize: 12, color: "#64748b" }}>
            {new Date(v).toLocaleDateString()}
          </span>
        ) : (
          <span style={{ color: "#cbd5e1", fontSize: 12 }}>—</span>
        ),
    }
  ];

  /* ────────────────────────────────────────────────
     RENDER
  ─────────────────────────────────────────────────── */

  const overviewContent = (
    <>
      {/* Filter Row */}
      <div className="ud-filter-row">
        <div className="ud-filter-left">
          <Select
            className="ud-filter-dropdown"
            value={sortFilter}
            onChange={setSortFilter}
            style={{ width: 120 }}
            size="middle"
          >
            <Option value="default">Default</Option>
            <Option value="priority">Priority</Option>
            <Option value="status">Status</Option>
            <Option value="due_date">Due Date</Option>
          </Select>
        </div>

        <div className="ud-filter-right">
          <div className="ud-quick-filter-btns">
            {["all", "month", "week", "yesterday", "today"].map((f) => (
              <button
                key={f}
                className={`ud-qf-btn ${dateFilter === f ? "active" : ""}`}
                onClick={() => setDateFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <button className="ud-calendar-btn">
            <CalendarOutlined />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="ud-stats-row">
        <StatCard
          label="Completed Tasks"
          value={stats.completed}
          variant="completed"
          loading={loading}
          iconEl={<CheckCircleFilled />}
        />
        <StatCard
          label="Incomplete Tasks"
          value={stats.incomplete}
          variant="incomplete"
          loading={loading}
          iconEl={<ClockCircleFilled />}
        />
        <StatCard
          label="Total Tasks"
          value={stats.total}
          variant="total"
          loading={loading}
          iconEl={<FileDoneOutlined />}
        />
      </div>

      {/* Charts row */}
      <div className="ud-charts-row">
        {/* Priority donut */}
        <div className="ud-chart-card">
          <div className="ud-chart-title">Priority Analysis</div>
          <div className="ud-donut-chart-wrap">
            <ReactApexChart
              type="donut"
              series={donutSeries}
              options={donutOptions}
              width={240}
              height={210}
            />
          </div>
          <div className="ud-chart-legend">
            <span className="ud-legend-item">
              <span className="ud-legend-dot" style={{ background: "#16a34a" }} />
              Low {priorityData.low}
            </span>
            <span className="ud-legend-item">
              <span className="ud-legend-dot" style={{ background: "#f59e0b" }} />
              Medium {priorityData.medium}
            </span>
            <span className="ud-legend-item">
              <span className="ud-legend-dot" style={{ background: "#ef4444" }} />
              High {priorityData.high}
            </span>
          </div>
        </div>

        {/* Performance bar */}
        <div className="ud-chart-card ud-chart-card--perf">
          <div className="ud-chart-title">Performance Analysis</div>
          <div className="ud-perf-chart-wrap">
            <ReactApexChart
              type="bar"
              series={perfSeries}
              options={perfOptions}
              width="100%"
              height={220}
            />
          </div>
          <div className="ud-chart-legend">
            <span className="ud-legend-item">
              <span className="ud-legend-dot" style={{ background: "#16a34a" }} />
              On Track {performanceData.onTrack}
            </span>
            <span className="ud-legend-item">
              <span className="ud-legend-dot" style={{ background: "#f59e0b" }} />
              Before Time {performanceData.beforeTime}
            </span>
            <span className="ud-legend-item">
              <span className="ud-legend-dot" style={{ background: "#ef4444" }} />
              Delayed {performanceData.delayed}
            </span>
          </div>
        </div>
      </div>

      {/* Incomplete tasks chart */}
      <div className="ud-chart-card" style={{ marginBottom: 0 }}>
        <div className="ud-chart-title">Incompleted Task Analysis</div>
        <ReactApexChart
          type="bar"
          series={incompleteSeries}
          options={incompleteOptions}
          width="100%"
          height={220}
        />
      </div>
    </>
  );

  const listContent = (
    <div className="ud-task-table-wrap">
      {tasks.length === 0 && !loading ? (
        <div className="ud-empty-state">
          <NoDataFoundIcon />
          <p>No tasks found for this user</p>
        </div>
      ) : (
        <Table
          dataSource={tasks}
          columns={taskColumns}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          size="middle"
        />
      )}
    </div>
  );

  const tasksByStatus = React.useMemo(() => {
    const grouped = {};
    tasks.forEach((t) => {
      const s = t.task_status?.title || t.status || "Pending";
      if (!grouped[s]) grouped[s] = [];
      grouped[s].push(t);
    });
    return grouped;
  }, [tasks]);

  const tasksByDate = React.useMemo(() => {
    const grouped = {};
    tasks.forEach((t) => {
      const d = dayjs(t.due_date || t.created_at).format("DD-MM-YYYY");
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(t);
    });
    return grouped;
  }, [tasks]);

  const kanbanContent = (
    <div className="ud-kanban-view">
      {Object.keys(tasksByStatus).length === 0 && !loading ? (
        <div className="ud-empty-state">
          <NoDataFoundIcon />
          <p>No tasks found for this user</p>
        </div>
      ) : (
        <div className="ud-kanban-columns">
          {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
            <div key={status} className="ud-kanban-column">
              <div className="ud-kanban-column-header">
                <span className="ud-kanban-column-title">{status}</span>
                <span className="ud-kanban-column-count">{statusTasks.length}</span>
              </div>
              <div className="ud-kanban-column-cards">
                {statusTasks.map((t) => (
                  <TaskCard key={t._id} task={t} onClick={() => handleOpenTask(t)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const calendarContent = (
    <div className="ud-calendar-view">
      <div className="ud-calendar-toolbar">
        <div className="ud-calendar-nav">
          <Button onClick={() => setCalendarDate(calendarDate.subtract(1, calendarMode))}>&lt;</Button>
          <span className="ud-calendar-title">
            {calendarDate.format(calendarMode === "month" ? "MMMM YYYY" : "DD-MM-YYYY")}
          </span>
          <Button onClick={() => setCalendarDate(calendarDate.add(1, calendarMode))}>&gt;</Button>
        </div>
        <div className="ud-calendar-modes">
          {["month", "week", "day"].map((m) => (
            <button
              key={m}
              className={`ud-mode-btn ${calendarMode === m ? "active" : ""}`}
              onClick={() => setCalendarMode(m)}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <CalendarGrid
        mode={calendarMode}
        current={calendarDate}
        tasksByDate={tasksByDate}
        onOpenTask={handleOpenTask}
      />
    </div>
  );

  if (pageLoading) return <UserDashboardSkeleton />;

  return (
    <div className="user-dashboard">
      {/* ── Action Bar ── */}
      <div className="ud-header">
        <div className="ud-header-spacer" />
        <Button className="add-btn" type="primary" onClick={() => setAddModalOpen(true)}>
          <PlusOutlined />
          Add Task
        </Button>
      </div>

      {/* ── Tab Bar ── */}
      <div className="ud-tabs-bar">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          tabBarStyle={{ marginBottom: 0 }}
        >
          <TabPane
            key="overviews"
            tab={
              <span>
                <BarChartOutlined className="ud-tab-icon" />
                Overviews
              </span>
            }
          />
          <TabPane
            key="list"
            tab={
              <span>
                <UnorderedListOutlined className="ud-tab-icon" />
                List
              </span>
            }
          />
          <TabPane
            key="kanban"
            tab={
              <span>
                <AppstoreOutlined className="ud-tab-icon" />
                Kanban
              </span>
            }
          />
          <TabPane
            key="calendar"
            tab={
              <span>
                <CalendarOutlined className="ud-tab-icon" />
                Calendar
              </span>
            }
          />
        </Tabs>
      </div>

      {/* ── Body ── */}
      <div className="ud-body">
        {loading && (activeTab === "overviews" || activeTab === "kanban" || activeTab === "calendar") && (
          <div className="ud-loading-overlay">
            <Spin size="large" tip="Loading data…" />
          </div>
        )}

        {!loading && (
          <>
            {activeTab === "overviews" && overviewContent}
            {activeTab === "list" && listContent}
            {activeTab === "kanban" && kanbanContent}
            {activeTab === "calendar" && calendarContent}
          </>
        )}
      </div>

      <AddTaskModal
        open={addModalOpen}
        onCancel={() => setAddModalOpen(false)}
        onSuccess={() => {
          setAddModalOpen(false);
          fetchData();
        }}
        standalone
        defaultAssigneeIds={user?._id ? [user._id] : []}
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
          setSelectedTask(null);
        }}
        onSubmit={() => { }}
      />
    </div>
  );
};

export default UserDashboard;
