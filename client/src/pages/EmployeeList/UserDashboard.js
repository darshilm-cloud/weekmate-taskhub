/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback } from "react";
import {
  Tabs,
  Select,
  Avatar,
  Table,
  Modal,
  Form,
  Input,
  DatePicker,
  message,
  Spin,
  Empty,
  Popconfirm,
  Tooltip,
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
  DeleteOutlined,
} from "@ant-design/icons";
import ReactApexChart from "react-apexcharts";
import Service from "../../service";
import { removeTitle } from "../../util/nameFilter";
import { UserDashboardSkeleton } from "../../components/common/SkeletonLoader";
import "./UserDashboard.css";

const { TabPane } = Tabs;
const { Option } = Select;
const { TextArea } = Input;

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
  const loggedUser = JSON.parse(localStorage.getItem("user_data") || "{}");
  const isOwnProfile = loggedUser?._id === user?._id;

  const userName = removeTitle(
    user?.full_name || `${user?.first_name || ""} ${user?.last_name || ""}`.trim()
  );

  /* ── state ── */
  const [activeTab,   setActiveTab]   = useState("overviews");
  const [dateFilter,  setDateFilter]  = useState("all");
  const [sortFilter,  setSortFilter]  = useState("default");
  const [loading,     setLoading]     = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm]                      = Form.useForm();
  const [addLoading,  setAddLoading]  = useState(false);

  /* ── analytics state ── */
  const [stats, setStats] = useState({ completed: 0, incomplete: 0, total: 0 });
  const [priorityData, setPriorityData] = useState({ low: 0, medium: 0, high: 0 });
  const [performanceData, setPerformanceData] = useState({ onTrack: 0, beforeTime: 0, delayed: 0 });
  const [incompleteByStatus, setIncompleteByStatus] = useState([]);
  const [tasks, setTasks] = useState([]);

  /* ── date range helper ── */
  const getDateRange = () => {
    const now  = new Date();
    const from = new Date();
    if (dateFilter === "today") {
      from.setHours(0, 0, 0, 0);
    } else if (dateFilter === "yesterday") {
      from.setDate(from.getDate() - 1);
      from.setHours(0, 0, 0, 0);
      now.setDate(now.getDate() - 1);
      now.setHours(23, 59, 59, 999);
    } else if (dateFilter === "week") {
      from.setDate(from.getDate() - 7);
    } else if (dateFilter === "month") {
      from.setMonth(from.getMonth() - 1);
    }
    return dateFilter === "all" ? {} : { from: from.toISOString(), to: now.toISOString() };
  };

  /* ── process raw task array into analytics ── */
  const processTaskArray = useCallback((rawTasks) => {
    const range = getDateRange();
    const filtered = range.from
      ? rawTasks.filter((t) => {
          const d = new Date(t.due_date || t.created_at);
          return d >= new Date(range.from) && d <= new Date(range.to);
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
      const due  = new Date(t.due_date);
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

  /* ── fetch ── */
  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let fetchedTasks = [];

      /* Try 1: dashboard/get/my-task (works for own profile) */
      try {
        const res = await Service.makeAPICall({
          methodName: Service.getMethod,
          api_url: "/dashboard/get/my-task",
        });
        const d = res?.data?.data;
        if (Array.isArray(d) && d.length > 0) {
          fetchedTasks = d;
        } else if (d && typeof d === "object" && !Array.isArray(d)) {
          /* structured counts response — use directly */
          setStats({
            completed: d.completed_tasks ?? d.completedTasks ?? 0,
            incomplete: d.pending_tasks  ?? d.incompleteTasks ?? 0,
            total:      d.total_tasks    ?? d.totalTasks ?? 0,
          });
          setLoading(false);
          return;
        }
      } catch { /* fall through */ }

      if (fetchedTasks.length > 0) {
        processTaskArray(fetchedTasks);
      }
    } catch (err) {
      console.error("UserDashboard fetchData error:", err);
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  }, [user, dateFilter, processTaskArray]);

  useEffect(() => {
    fetchData();
    /* reset tab when user changes */
    setActiveTab("overviews");
  }, [user?._id, dateFilter]); // eslint-disable-line

  /* ── Add Task ── */
  const handleAddTask = async () => {
    try {
      const values = await addForm.validateFields();
      setAddLoading(true);

      /* Build minimal create-task payload; project_id + main_task_id are
         required by the server but may not be available here — show info */
      await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.addTask || "/projects/tasks/add",
        body: {
          title:      values.title,
          descriptions: values.description || "",
          priority:   values.priority || "low",
          due_date:   values.due_date?.toISOString() || null,
          assignees:  user?._id ? [user._id] : [],
          status:     "active",
        },
      });

      message.success("Task added successfully");
      setAddModalOpen(false);
      addForm.resetFields();
      fetchData();
    } catch (err) {
      if (err?.errorFields) return; // validation
      message.info(
        "Task creation requires a Project. Please add tasks from inside a project."
      );
    } finally {
      setAddLoading(false);
    }
  };

  /* ────────────────────────────────────────────────
     CHART OPTIONS
  ─────────────────────────────────────────────────── */

  /* Priority donut */
  const priorityTotal = priorityData.low + priorityData.medium + priorityData.high || 1;
  const donutOptions = {
    chart:  { type: "donut", fontFamily: "inherit" },
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
    stroke:     { width: 0 },
    tooltip:    { y: { formatter: (v) => `${v} tasks` } },
  };
  const donutSeries = [priorityData.low, priorityData.medium, priorityData.high];

  /* Performance horizontal bar */
  const perfOptions = {
    chart:  { type: "bar", fontFamily: "inherit", toolbar: { show: false } },
    plotOptions: {
      bar: { horizontal: true, borderRadius: 4, barHeight: "40%" },
    },
    colors: ["#16a34a", "#f59e0b", "#ef4444"],
    xaxis:  {
      categories: ["On Track", "Before Time", "Delayed"],
      min: 0,
      labels: { style: { fontSize: "12px" } },
    },
    yaxis: { labels: { style: { fontSize: "12px" } } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#f1f5f9", xaxis: { lines: { show: true } } },
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
    chart:  { type: "bar", fontFamily: "inherit", toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 5, columnWidth: "35%" } },
    colors: ["#f59e0b"],
    xaxis:  { categories: incompleteCategories, labels: { style: { fontSize: "12px" } } },
    yaxis:  {
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
    },
    {
      title: "",
      key: "actions",
      width: 60,
      render: () => (
        <Tooltip title="Open task">
          <EditOutlined style={{ color: "#94a3b8", cursor: "pointer" }} />
        </Tooltip>
      ),
    },
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
          <ReactApexChart
            type="donut"
            series={donutSeries}
            options={donutOptions}
            height={220}
          />
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
        <div className="ud-chart-card">
          <div className="ud-chart-title">Performance Analysis</div>
          <ReactApexChart
            type="bar"
            series={perfSeries}
            options={perfOptions}
            height={220}
          />
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
          height={220}
        />
      </div>
    </>
  );

  const listContent = (
    <div className="ud-task-table-wrap">
      {tasks.length === 0 && !loading ? (
        <div className="ud-empty-state">
          <Empty description="No tasks found for this user" />
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

  const kanbanContent = (
    <div className="ud-placeholder">
      <AppstoreOutlined className="ud-placeholder-icon" />
      <div className="ud-placeholder-text">Kanban Board</div>
      <span style={{ fontSize: 13, color: "#cbd5e1" }}>
        Open a project to use the Kanban board view.
      </span>
    </div>
  );

  const calendarContent = (
    <div className="ud-placeholder">
      <CalendarOutlined className="ud-placeholder-icon" />
      <div className="ud-placeholder-text">Calendar View</div>
      <span style={{ fontSize: 13, color: "#cbd5e1" }}>
        Open a project to use the Calendar view.
      </span>
    </div>
  );

  if (pageLoading) return <UserDashboardSkeleton />;

  return (
    <div className="user-dashboard">
      {/* ── Header ── */}
      <div className="ud-header">
        <div className="ud-header-left">
          <Avatar
            size={38}
            style={{
              backgroundColor: avatarColor(userName),
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {initials(userName)}
          </Avatar>
          <h2 className="ud-header-name">{userName}</h2>
        </div>
        <button className="ud-add-task-btn" onClick={() => setAddModalOpen(true)}>
          <PlusOutlined />
          Add Task
        </button>
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
        {loading && activeTab === "overviews" && (
          <div className="ud-loading-overlay">
            <Spin size="large" tip="Loading dashboard…" />
          </div>
        )}

        {(!loading || activeTab !== "overviews") && (
          <>
            {activeTab === "overviews"  && overviewContent}
            {activeTab === "list"       && listContent}
            {activeTab === "kanban"     && kanbanContent}
            {activeTab === "calendar"   && calendarContent}
          </>
        )}
      </div>

      {/* ── Add Task Modal ── */}
      <Modal
        className="ud-modal"
        title="Add Task"
        open={addModalOpen}
        onCancel={() => { setAddModalOpen(false); addForm.resetFields(); }}
        onOk={handleAddTask}
        confirmLoading={addLoading}
        okText="Save"
        cancelText="Cancel"
        okButtonProps={{ style: { borderRadius: 8, background: "#2563eb", borderColor: "#2563eb" } }}
        cancelButtonProps={{ style: { borderRadius: 8 } }}
        width={520}
      >
        <Form form={addForm} layout="vertical" requiredMark="optional">
          <Form.Item
            name="title"
            label="Task Title"
            rules={[{ required: true, message: "Please enter a task title" }]}
          >
            <Input placeholder="Enter task title" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <TextArea rows={3} placeholder="Add description (optional)" />
          </Form.Item>

          <Form.Item name="priority" label="Priority" initialValue="low">
            <Select placeholder="Select priority">
              <Option value="low">Low</Option>
              <Option value="medium">Medium</Option>
              <Option value="high">High</Option>
            </Select>
          </Form.Item>

          <Form.Item name="status" label="Status" initialValue="active">
            <Select placeholder="Select status">
              <Option value="active">Active</Option>
              <Option value="in_progress">In Progress</Option>
              <Option value="done">Done</Option>
            </Select>
          </Form.Item>

          <Form.Item name="due_date" label="Due Date">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserDashboard;
