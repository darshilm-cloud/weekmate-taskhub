/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Drawer, Popconfirm, Select, Table, Tooltip, message } from "antd";
import { Link } from "react-router-dom/cjs/react-router-dom.min";
import {
  AlertOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";
import ReactApexChart from "react-apexcharts";
import moment from "moment";
import { useDispatch } from "react-redux";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import Service from "../../service";
import { getRoles } from "../../util/hasPermission";
import ComplaintFilterComponent from "./ComplaintFilterComponent";
import { TablePageSkeleton } from "../../components/common/SkeletonLoader";
import "./Complaints.css";

/* ── constants ─────────────────────────────────────────────── */
const ACCESS_ROLES = ["Admin", "PC", "TL", "AM"];
const ADD_ROLES    = ["Admin", "PC", "AM", "TL"];

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved",    label: "Resolved" },
  { value: "pending",     label: "Pending" },
  { value: "closed",      label: "Closed" },
  { value: "open",        label: "Open" },
];

/* ── helpers ────────────────────────────────────────────────── */
const formatStatus = (s = "") =>
  s.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

const statusClass = (s = "") => {
  const key = s.toLowerCase().replace(/\s+/g, "-");
  if (key.includes("progress")) return "in-progress";
  if (key.includes("resolv"))   return "resolved";
  if (key.includes("pending"))  return "pending";
  if (key.includes("closed"))   return "closed";
  if (key.includes("open"))     return "open";
  return "default";
};

const priorityClass = (p = "") => {
  const key = p.toLowerCase();
  if (key === "high")   return "high";
  if (key === "medium") return "medium";
  if (key === "low")    return "low";
  return "default";
};

/* ── stat card ──────────────────────────────────────────────── */
const StatCard = ({ icon, label, value, color }) => (
  <div className={`cmp-stat-card ${color}`}>
    <div className={`cmp-stat-icon ${color}`}>{icon}</div>
    <div>
      <div className="cmp-stat-label">{label}</div>
      <div className="cmp-stat-value">{value}</div>
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
const Complaints = () => {
  const companySlug   = localStorage.getItem("companyDomain");
  const dispatch      = useDispatch();

  /* ── list (paginated) ── */
  const [complaintList, setComplaintList] = useState([]);
  const [pagination,    setPagination]    = useState({ current: 1, pageSize: 20 });

  /* ── all complaints (analytics) ── */
  const [allComplaints, setAllComplaints] = useState([]);

  /* ── filters ── */
  const [selectedProject, setSelectedProject] = useState([]);
  const [technology,      setTechnology]      = useState([]);
  const [manager,         setManager]         = useState([]);
  const [accontManager,   setAccountManager]  = useState([]);
  const [priority,        setPriority]        = useState("");
  const [status,          setStatus]          = useState("");

  /* ── drawer ── */
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [drawerRecord, setDrawerRecord] = useState(null);

  const [tableLoading, setTableLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const userHasAccess = useMemo(() => getRoles(ACCESS_ROLES), []);
  const canAdd        = useMemo(() => getRoles(ADD_ROLES),    []);

  /* ───────────────────────────────────────────────────────────
     API CALLS
  ─────────────────────────────────────────────────────────── */

  const fetchAllForAnalytics = useCallback(async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url:    Service.getComplaintList,
        body: { pageNo: 1, limit: 1000 },
      });
      if (response?.data?.data) setAllComplaints(response.data.data);
    } catch { /* silent */ }
  }, []);

  const getComplaintList = useCallback(async () => {
    try {
      setTableLoading(true);
      dispatch(showAuthLoader());
      const reqBody = {
        pageNo:         pagination.current,
        limit:          pagination.pageSize,
        project_id:     selectedProject,
        technology,
        manager_id:     manager,
        acc_manager_id: accontManager,
      };
      if (priority) reqBody.priority = priority;
      if (status)   reqBody.status   = status;

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url:    Service.getComplaintList,
        body:       reqBody,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data) {
        setComplaintList(response.data.data);
        setPagination((p) => ({ ...p, total: response.data.metadata?.total || 0 }));
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.error(error);
    } finally {
      setTableLoading(false);
      setPageLoading(false);
    }
  }, [pagination.current, pagination.pageSize, selectedProject, technology, manager, accontManager, priority, status, dispatch]);

  const deleteComplaints = useCallback(async (id) => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url:    Service.deleteComplaint + `/${id}`,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data) {
        message.success(response.data.message);
        getComplaintList();
        fetchAllForAnalytics();
      }
    } catch (error) {
      dispatch(hideAuthLoader());
      console.error(error);
    }
  }, [dispatch, getComplaintList, fetchAllForAnalytics]);

  useEffect(() => { fetchAllForAnalytics(); }, [fetchAllForAnalytics]);
  useEffect(() => { getComplaintList(); },     [getComplaintList]);

  /* ───────────────────────────────────────────────────────────
     ANALYTICS
  ─────────────────────────────────────────────────────────── */
  const analytics = useMemo(() => {
    const total      = allComplaints.length;
    const resolved   = allComplaints.filter((c) => c.status?.toLowerCase().includes("resolv")).length;
    const inProgress = allComplaints.filter((c) => c.status?.toLowerCase().includes("progress")).length;
    const thisMonth  = allComplaints.filter((c) =>
      moment(c.createdAt).isSame(moment(), "month")
    ).length;

    /* status breakdown */
    const statusMap = {};
    allComplaints.forEach((c) => {
      const s = formatStatus(c.status || "Unknown");
      statusMap[s] = (statusMap[s] || 0) + 1;
    });

    /* monthly trend — last 6 months */
    const monthlyMap = {};
    for (let i = 5; i >= 0; i--) {
      monthlyMap[moment().subtract(i, "months").format("MMM YY")] = 0;
    }
    allComplaints.forEach((c) => {
      const key = moment(c.createdAt).format("MMM YY");
      if (key in monthlyMap) monthlyMap[key]++;
    });

    return { total, resolved, inProgress, thisMonth, statusMap, monthlyMap };
  }, [allComplaints]);

  /* chart options */
  const donutSeries  = Object.values(analytics.statusMap);
  const donutLabels  = Object.keys(analytics.statusMap);
  const donutOptions = useMemo(() => ({
    chart:       { type: "donut", fontFamily: "inherit" },
    labels:      donutLabels.length ? donutLabels : ["No Data"],
    colors:      ["#2563eb", "#16a34a", "#ea580c", "#dc2626", "#64748b", "#7c3aed"],
    legend:      { position: "bottom", fontSize: "12px" },
    plotOptions: { pie: { donut: { size: "65%" } } },
    dataLabels:  { enabled: false },
    stroke:      { width: 0 },
    tooltip:     { y: { formatter: (v) => `${v} complaints` } },
  }), [donutLabels]);

  const barSeries  = [{ name: "Complaints", data: Object.values(analytics.monthlyMap) }];
  const barOptions = useMemo(() => ({
    chart:       { type: "bar", fontFamily: "inherit", toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 6, columnWidth: "45%" } },
    colors:      ["#dc2626"],
    xaxis:       { categories: Object.keys(analytics.monthlyMap) },
    yaxis:       { labels: { style: { fontSize: "11px" } }, tickAmount: 3 },
    dataLabels:  { enabled: false },
    grid:        { borderColor: "#f1f5f9" },
    tooltip:     { y: { formatter: (v) => `${v} complaints` } },
  }), [analytics.monthlyMap]);

  /* ───────────────────────────────────────────────────────────
     FILTER HANDLER
  ─────────────────────────────────────────────────────────── */
  const onFilterChange = useCallback((skipParams, selectedFilters) => {
    if (skipParams.includes("skipAll")) {
      setSelectedProject([]); setTechnology([]);
      setManager([]); setAccountManager([]);
      setPriority(""); setStatus("");
      setPagination((p) => ({ ...p, current: 1 }));
      return;
    }
    if (skipParams.includes("skipProject"))        setSelectedProject([]);
    if (skipParams.includes("skipDepartment"))     setTechnology([]);
    if (skipParams.includes("skipManager"))        setManager([]);
    if (skipParams.includes("skipAccountManager")) setAccountManager([]);
    if (skipParams.includes("skipPriority"))       setPriority("");
    if (skipParams.includes("skipStatus"))         setStatus("");
    if (selectedFilters) {
      setSelectedProject(selectedFilters.project      || []);
      setTechnology(selectedFilters.technology         || []);
      setManager(selectedFilters.manager               || []);
      setAccountManager(selectedFilters.accountManager || []);
      setPriority(selectedFilters.priority             || "");
      setStatus(selectedFilters.status                 || "");
      setPagination((p) => ({ ...p, current: 1 }));
    }
  }, []);

  /* ───────────────────────────────────────────────────────────
     TABLE COLUMNS
  ─────────────────────────────────────────────────────────── */
  const columns = useMemo(() => {
    const base = [
      {
        title: "Project",
        width: 180,
        render: (_, r) => (
          <span className="cmp-project-chip">{r.project?.title || "—"}</span>
        ),
      },
      {
        title: "Created By",
        width: 140,
        render: (_, r) => r.createdBy?.full_name || "—",
      },
      {
        title: "Account Manager",
        width: 150,
        render: (_, r) => r.acc_manager?.full_name || "—",
      },
      {
        title: "Project Manager",
        width: 150,
        render: (_, r) => r.manager?.full_name || "—",
      },
      {
        title: "Client",
        width: 130,
        render: (_, r) => <span style={{ fontWeight: 500 }}>{r.client_name || "—"}</span>,
      },
      {
        title: "Status",
        width: 130,
        render: (_, r) => r.status ? (
          <span className={`cmp-status-badge ${statusClass(r.status)}`}>
            {formatStatus(r.status)}
          </span>
        ) : "—",
      },
      {
        title: "Priority",
        width: 100,
        render: (_, r) => r.priority ? (
          <span className={`cmp-priority-badge ${priorityClass(r.priority)}`}>
            {r.priority.charAt(0).toUpperCase() + r.priority.slice(1)}
          </span>
        ) : "—",
      },
      {
        title: "Date",
        width: 110,
        render: (_, r) => moment(r.createdAt).format("DD MMM YYYY"),
      },
    ];

    if (userHasAccess) {
      base.push({
        title: "Actions",
        width: 110,
        render: (_, record) => (
          <div className="cmp-action-row">
            <Tooltip title="View details">
              <button
                className="cmp-action-btn view"
                onClick={() => { setDrawerRecord(record); setDrawerOpen(true); }}
              >
                <EyeOutlined />
              </button>
            </Tooltip>
            <Tooltip title="Action details">
              <Link to={`/${companySlug}/add/complaintForm-action-details/${record._id}`}>
                <button className="cmp-action-btn view">
                  <FileTextOutlined />
                </button>
              </Link>
            </Tooltip>
            <Tooltip title="Edit">
              <Link to={`/${companySlug}/edit/complaintsForm/${record._id}`}>
                <button className="cmp-action-btn edit"><EditOutlined /></button>
              </Link>
            </Tooltip>
            <Popconfirm
              icon={<QuestionCircleOutlined style={{ color: "red" }} />}
              title="Delete this complaint?"
              onConfirm={() => deleteComplaints(record._id)}
              okText="Yes"
              cancelText="No"
            >
              <Tooltip title="Delete">
                <button className="cmp-action-btn delete"><DeleteOutlined /></button>
              </Tooltip>
            </Popconfirm>
          </div>
        ),
      });
    }

    return base;
  }, [userHasAccess, deleteComplaints, companySlug]);

  /* ───────────────────────────────────────────────────────────
     RENDER
  ─────────────────────────────────────────────────────────── */
  if (pageLoading) return <TablePageSkeleton />;

  return (
    <div className="cmp-page">

      {/* Header */}
      <div className="cmp-header">
        <h1 className="cmp-title">Complaints</h1>
        {canAdd && (
          <div>
            <Link to={`/${companySlug}/add/complaintsform`} className="cmp-btn primary">
              <PlusOutlined /> Add Complaint
            </Link>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="cmp-stats-grid">
        <StatCard icon={<AlertOutlined />}          label="Total Complaints" value={analytics.total}      color="blue"   />
        <StatCard icon={<ClockCircleOutlined />}     label="In Progress"      value={analytics.inProgress} color="orange" />
        <StatCard icon={<CheckCircleOutlined />}     label="Resolved"         value={analytics.resolved}   color="green"  />
        <StatCard icon={<CalendarOutlined />}        label="This Month"       value={analytics.thisMonth}  color="purple" />
      </div>

      {/* Charts */}
      {analytics.total > 0 && (
        <div className="cmp-charts-grid">
          <div className="cmp-chart-card">
            <div className="cmp-chart-title">Status Distribution</div>
            <div className="cmp-chart-sub">Breakdown of complaints by current status</div>
            <ReactApexChart
              type="donut"
              series={donutSeries.length ? donutSeries : [1]}
              options={donutOptions}
              height={260}
            />
          </div>
          <div className="cmp-chart-card">
            <div className="cmp-chart-title">Monthly Trend</div>
            <div className="cmp-chart-sub">Complaints raised over the last 6 months</div>
            <ReactApexChart
              type="bar"
              series={barSeries}
              options={barOptions}
              height={260}
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="cmp-table-card">
        <div className="cmp-table-header">
          <div className="cmp-table-title">
            All Complaints
            <span style={{ marginLeft: 8, fontSize: 13, color: "#94a3b8", fontWeight: 400 }}>
              ({pagination.total || 0})
            </span>
          </div>
          <div className="cmp-table-toolbar">
            <Select
              size="small"
              value={status}
              onChange={(v) => { setStatus(v); setPagination((p) => ({ ...p, current: 1 })); }}
              options={STATUS_OPTIONS}
              style={{ width: 150 }}
            />
            <ComplaintFilterComponent onFilterChange={onFilterChange} />
          </div>
        </div>

        <Table
          loading={tableLoading}
          columns={columns}
          dataSource={complaintList}
          rowKey="_id"
          pagination={{
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "30"],
            showTotal: (total) => `Total ${total} complaints`,
            ...pagination,
          }}
          onChange={(page) => setPagination((p) => ({ ...p, ...page }))}
          scroll={{ x: 1000 }}
        />
      </div>

      {/* Detail Drawer */}
      <Drawer
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ExclamationCircleOutlined style={{ color: "#dc2626" }} />
            <span>Complaint Detail</span>
          </div>
        }
        placement="right"
        width={480}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setDrawerRecord(null); }}
        bodyStyle={{ padding: 0 }}
        extra={
          drawerRecord && userHasAccess && (
            <div style={{ display: "flex", gap: 8 }}>
              <Link to={`/${companySlug}/add/complaintForm-action-details/${drawerRecord._id}`}>
                <button className="cmp-btn" style={{ fontSize: 12, padding: "6px 12px" }}>
                  <FileTextOutlined /> Actions
                </button>
              </Link>
              <Link to={`/${companySlug}/edit/complaintsForm/${drawerRecord._id}`}>
                <button className="cmp-btn" style={{ fontSize: 12, padding: "6px 12px" }}>
                  <EditOutlined /> Edit
                </button>
              </Link>
            </div>
          )
        }
      >
        {drawerRecord && (
          <>
            <div className="cmp-drawer-section">
              <div className="cmp-drawer-fields">
                <div className="cmp-drawer-field">
                  <div className="cmp-drawer-label">Project</div>
                  <div className="cmp-drawer-value">{drawerRecord.project?.title || "—"}</div>
                </div>
                <div className="cmp-drawer-field">
                  <div className="cmp-drawer-label">Client</div>
                  <div className="cmp-drawer-value">{drawerRecord.client_name || "—"}</div>
                </div>
                <div className="cmp-drawer-field">
                  <div className="cmp-drawer-label">Account Manager</div>
                  <div className="cmp-drawer-value">{drawerRecord.acc_manager?.full_name || "—"}</div>
                </div>
                <div className="cmp-drawer-field">
                  <div className="cmp-drawer-label">Project Manager</div>
                  <div className="cmp-drawer-value">{drawerRecord.manager?.full_name || "—"}</div>
                </div>
                <div className="cmp-drawer-field">
                  <div className="cmp-drawer-label">Status</div>
                  <div className="cmp-drawer-value">
                    {drawerRecord.status ? (
                      <span className={`cmp-status-badge ${statusClass(drawerRecord.status)}`}>
                        {formatStatus(drawerRecord.status)}
                      </span>
                    ) : "—"}
                  </div>
                </div>
                <div className="cmp-drawer-field">
                  <div className="cmp-drawer-label">Priority</div>
                  <div className="cmp-drawer-value">
                    {drawerRecord.priority ? (
                      <span className={`cmp-priority-badge ${priorityClass(drawerRecord.priority)}`}>
                        {drawerRecord.priority.charAt(0).toUpperCase() + drawerRecord.priority.slice(1)}
                      </span>
                    ) : "—"}
                  </div>
                </div>
                <div className="cmp-drawer-field">
                  <div className="cmp-drawer-label">Date</div>
                  <div className="cmp-drawer-value">{moment(drawerRecord.createdAt).format("DD MMM YYYY")}</div>
                </div>
                <div className="cmp-drawer-field">
                  <div className="cmp-drawer-label">Created By</div>
                  <div className="cmp-drawer-value">{drawerRecord.createdBy?.full_name || "—"}</div>
                </div>
              </div>
            </div>

            {drawerRecord.complaint && (
              <div className="cmp-drawer-section">
                <div className="cmp-drawer-label" style={{ marginBottom: 10 }}>Complaint</div>
                <div
                  className="cmp-complaint-content"
                  dangerouslySetInnerHTML={{ __html: drawerRecord.complaint }}
                />
              </div>
            )}
          </>
        )}
      </Drawer>

    </div>
  );
};

export default React.memo(Complaints);
