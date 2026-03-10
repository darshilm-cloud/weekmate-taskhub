import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom/cjs/react-router-dom.min";
import {
  Button,
  Col,
  DatePicker,
  Drawer,
  Form,
  Input,
  message,
  Popconfirm,
  Row,
  Select,
  Switch,
  Table,
  Tooltip,
  Typography,
} from "antd";
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  FilterOutlined,
  FundOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  WalletOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarCircleOutlined,
} from "@ant-design/icons";
import ReactApexChart from "react-apexcharts";
import { getRoles } from "../../util/hasPermission";
import { hideAuthLoader, showAuthLoader } from "../../appRedux/actions";
import Service from "../../service";
import moment from "moment";
import "./ProjectExpense.css";
import { sideBarContentId2 } from "../../constants";
import ProjectExpenseFilterComponent from "./ProjectExpenseFilterComponent";

const { Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const USER_ROLES = {
  ADMIN_ROLES:          ["Admin", "PC", "TL", "AM", "User"],
  EXPENSE_ACCESS_ROLES: ["Admin", "PC", "AM", "TL"],
  SUPER_ADMIN:          ["Admin"],
  CLIENT_USER_ID:       sideBarContentId2,
};
const PAGINATION_OPTIONS = ["10", "20", "30"];

/* ─── helpers ───────────────────────────────────────────────────── */
const fmtUSD = (v) => {
  const n = parseFloat(v) || 0;
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(2)}`;
};

const statusClass = (s = "") => {
  switch (s.toLowerCase()) {
    case "approved": return "approved";
    case "pending":  return "pending";
    case "rejected": return "rejected";
    case "paid":     return "paid";
    default:         return "default";
  }
};

/* ─── Stat Card ─────────────────────────────────────────────────── */
const StatCard = ({ icon, label, value, sub, color }) => (
  <div className={`pe-stat-card ${color}`}>
    <div className={`pe-stat-icon ${color}`}>{icon}</div>
    <div className="pe-stat-body">
      <div className="pe-stat-label">{label}</div>
      <div className="pe-stat-value">{value}</div>
      {sub && <div className="pe-stat-sub">{sub}</div>}
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
const Projectexpences = () => {
  const dispatch      = useDispatch();
  const companySlug   = localStorage.getItem("companyDomain");

  /* ── filter state (wired to existing FilterComponent) ── */
  const [selectedProject, setSelectedProject]     = useState([]);
  const [technology,       setTechnology]          = useState([]);
  const [manager,          setManager]             = useState([]);
  const [accontManager,    setAccountManager]      = useState([]);
  const [need_to_bill_customer, setFeedBackTypeFilter] = useState("All");
  const [createdBy,        setCreatedBy]           = useState([]);

  /* ── local filter state (filter bar) ── */
  const [statusFilter,    setStatusFilter]   = useState("All");
  const [billableToggle,  setBillableToggle] = useState(false);
  const [dateRange,       setDateRange]      = useState([null, null]);

  /* ── data ── */
  const [allExpenses,          setAllExpenses]          = useState([]); // for analytics
  const [projectexpencesList,  setprojectexpencesList]  = useState([]); // paginated table
  const [analyticsLoading,     setAnalyticsLoading]     = useState(false);
  const [tableLoading,         setTableLoading]         = useState(false);
  const [pagination,           setPagination]           = useState({ current: 1, pageSize: 20 });

  /* ── drawer ── */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewData,   setViewData]   = useState({});

  /* ── permissions ── */
  const userData = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user_data")) || {}; }
    catch { return {}; }
  }, []);
  const userPermissions = useMemo(() => ({
    hasAccess:       getRoles(USER_ROLES.ADMIN_ROLES),
    hasClientAccess: userData._id === USER_ROLES.CLIENT_USER_ID,
    canAddExpense:   getRoles(USER_ROLES.EXPENSE_ACCESS_ROLES),
    isSuperAdmin:    getRoles(USER_ROLES.SUPER_ADMIN),
  }), [userData._id]);

  /* ─────────────────────────────────────────────────────────────
     FETCH — full dataset for analytics (large limit, no pagination)
  ───────────────────────────────────────────────────────────── */
  const fetchAllForAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url:    Service.getprojectexpanses,
        body: {
          pageNo:  1,
          limit:   1000,
          project_id:          selectedProject,
          technology,
          manager_id:          manager,
          acc_manager_id:      accontManager,
          createdBy,
          need_to_bill_customer:
            need_to_bill_customer === "All" ? undefined : need_to_bill_customer,
        },
      });
      if (response?.data?.data) {
        setAllExpenses(response.data.data);
      }
    } catch (err) {
      console.error("Analytics fetch error:", err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [selectedProject, technology, manager, accontManager, createdBy, need_to_bill_customer]);

  /* ─────────────────────────────────────────────────────────────
     FETCH — paginated table data
  ───────────────────────────────────────────────────────────── */
  const fetchTableData = useCallback(async () => {
    setTableLoading(true);
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url:    Service.getprojectexpanses,
        body: {
          pageNo:   pagination.current,
          limit:    pagination.pageSize,
          project_id:     selectedProject,
          technology,
          manager_id:     manager,
          acc_manager_id: accontManager,
          createdBy,
          need_to_bill_customer:
            need_to_bill_customer === "All" ? undefined : need_to_bill_customer,
        },
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data) {
        setprojectexpencesList(response.data.data);
        setPagination((p) => ({ ...p, total: response.data.metadata?.total || 0 }));
      }
    } catch (err) {
      dispatch(hideAuthLoader());
      console.error(err);
    } finally {
      setTableLoading(false);
    }
  }, [
    pagination.current, pagination.pageSize,
    selectedProject, technology, manager, accontManager, createdBy, need_to_bill_customer,
    dispatch,
  ]);

  useEffect(() => {
    fetchAllForAnalytics();
  }, [fetchAllForAnalytics]);

  useEffect(() => {
    fetchTableData();
  }, [fetchTableData]);

  /* ─────────────────────────────────────────────────────────────
     ANALYTICS — computed from allExpenses
  ───────────────────────────────────────────────────────────── */
  const analytics = useMemo(() => {
    let expenses = allExpenses;

    /* local filters (status, billable, date range) */
    if (statusFilter !== "All") {
      expenses = expenses.filter(
        (e) => e.status?.toLowerCase() === statusFilter.toLowerCase()
      );
    }
    if (billableToggle) {
      expenses = expenses.filter((e) => e.need_to_bill_customer === true);
    }
    if (dateRange[0] && dateRange[1]) {
      const [from, to] = dateRange;
      expenses = expenses.filter((e) => {
        const d = moment(e.createdAt);
        return d.isSameOrAfter(from, "day") && d.isSameOrBefore(to, "day");
      });
    }

    const totalAmt   = expenses.reduce((s, e) => s + (parseFloat(e.cost_in_usd) || 0), 0);
    const billable   = expenses.filter((e) => e.need_to_bill_customer);
    const billableAmt = billable.reduce((s, e) => s + (parseFloat(e.cost_in_usd) || 0), 0);
    const pending    = expenses.filter((e) => e.status?.toLowerCase() === "pending");
    const pendingAmt = pending.reduce((s, e) => s + (parseFloat(e.cost_in_usd) || 0), 0);
    const approved   = expenses.filter((e) => e.status?.toLowerCase() === "approved");
    const approvedAmt = approved.reduce((s, e) => s + (parseFloat(e.cost_in_usd) || 0), 0);

    /* monthly trend — last 6 months */
    const monthMap = {};
    for (let i = 5; i >= 0; i--) {
      const key = moment().subtract(i, "months").format("MMM YY");
      monthMap[key] = 0;
    }
    expenses.forEach((e) => {
      const key = moment(e.createdAt).format("MMM YY");
      if (key in monthMap) monthMap[key] += parseFloat(e.cost_in_usd) || 0;
    });
    const monthlyLabels = Object.keys(monthMap);
    const monthlyData   = Object.values(monthMap);

    /* expense by project — top 8 */
    const projectMap = {};
    expenses.forEach((e) => {
      const name = e.project?.title || "Unknown";
      projectMap[name] = (projectMap[name] || 0) + (parseFloat(e.cost_in_usd) || 0);
    });
    const sorted = Object.entries(projectMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const projectLabels = sorted.map(([k]) => k);
    const projectData   = sorted.map(([, v]) => parseFloat(v.toFixed(2)));

    /* billable vs non-billable */
    const nonBillableAmt = totalAmt - billableAmt;

    return {
      totalCount: expenses.length,
      totalAmt,
      billableCount: billable.length,
      billableAmt,
      pendingCount:  pending.length,
      pendingAmt,
      approvedCount: approved.length,
      approvedAmt,
      monthlyLabels,
      monthlyData,
      projectLabels,
      projectData,
      billableAmt2:     billableAmt,
      nonBillableAmt,
    };
  }, [allExpenses, statusFilter, billableToggle, dateRange]);

  /* ─────────────────────────────────────────────────────────────
     CHART OPTIONS
  ───────────────────────────────────────────────────────────── */
  const lineOptions = useMemo(() => ({
    chart:  { type: "area", fontFamily: "inherit", toolbar: { show: false }, sparkline: { enabled: false } },
    stroke: { curve: "smooth", width: 2 },
    colors: ["#2563eb"],
    fill:   { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.25, opacityTo: 0.02 } },
    xaxis:  { categories: analytics.monthlyLabels, labels: { style: { fontSize: "11px" } } },
    yaxis:  { labels: { formatter: (v) => `$${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v}`, style: { fontSize: "11px" } } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#f1f5f9", strokeDashArray: 4 },
    tooltip: { y: { formatter: (v) => `$${parseFloat(v).toFixed(2)}` } },
  }), [analytics.monthlyLabels]);

  const lineSeries = useMemo(() => [{
    name: "Expense ($)",
    data: analytics.monthlyData,
  }], [analytics.monthlyData]);

  const barOptions = useMemo(() => ({
    chart:  { type: "bar", fontFamily: "inherit", toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: "55%" } },
    colors: ["#7c3aed"],
    xaxis: {
      categories: analytics.projectLabels.length ? analytics.projectLabels : ["No Data"],
      labels: { formatter: (v) => `$${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v}`, style: { fontSize: "11px" } },
    },
    yaxis: { labels: { style: { fontSize: "11px", maxWidth: 120 } } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#f1f5f9" },
    tooltip: { y: { formatter: (v) => `$${parseFloat(v || 0).toFixed(2)}` } },
  }), [analytics.projectLabels]);

  const barSeries = useMemo(() => [{
    name: "Total Expense ($)",
    data: analytics.projectData.length ? analytics.projectData : [0],
  }], [analytics.projectData]);

  const donutOptions = useMemo(() => ({
    chart:  { type: "donut", fontFamily: "inherit" },
    labels: ["Billable", "Non-Billable"],
    colors: ["#2563eb", "#e2e8f0"],
    legend: { show: false },
    plotOptions: { pie: { donut: { size: "68%" } } },
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    tooltip: { y: { formatter: (v) => `$${parseFloat(v || 0).toFixed(2)}` } },
  }), []);

  const donutSeries = useMemo(() => [
    analytics.billableAmt2 || 0,
    analytics.nonBillableAmt || 0,
  ], [analytics.billableAmt2, analytics.nonBillableAmt]);

  /* ─────────────────────────────────────────────────────────────
     ACTIONS
  ───────────────────────────────────────────────────────────── */
  const deleteProjectExpences = useCallback(async (deleteId) => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.deleteMethod,
        api_url:    `${Service.deleteprojectexpanses}/${deleteId}`,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data) {
        fetchTableData();
        fetchAllForAnalytics();
        message.success(response.data.message);
      }
    } catch (err) {
      dispatch(hideAuthLoader());
      console.error(err);
    }
  }, [dispatch, fetchTableData, fetchAllForAnalytics]);

  const handleViewExpense = useCallback(async (expenseId) => {
    try {
      dispatch(showAuthLoader());
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url:    Service.getprojectexpanses,
        body:       { _id: expenseId },
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data) {
        setViewData(response.data.data);
        setDrawerOpen(true);
      }
    } catch (err) {
      dispatch(hideAuthLoader());
      message.error("Failed to fetch expense details");
    }
  }, [dispatch]);

  const exportCSV = useCallback(async () => {
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url:    Service.exportProjectExpenses,
        body:       { exportFileType: "csv", isExport: true },
      });
      if (response?.data?.data) {
        const link = document.createElement("a");
        link.href     = "data:text/csv;base64," + response.data.data;
        link.download = "Project Expense.csv";
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        message.error(response?.data?.message || "Export failed");
      }
    } catch (err) {
      message.error("Failed to export CSV");
    }
  }, []);

  /* ─────────────────────────────────────────────────────────────
     FILTER COMPONENT callback (existing filter component wiring)
  ───────────────────────────────────────────────────────────── */
  const onFilterChange = useCallback((skipParams, selectedFilters) => {
    if (skipParams.includes("skipAll")) {
      setSelectedProject([]); setTechnology([]); setCreatedBy([]);
      setManager([]); setAccountManager([]); setFeedBackTypeFilter("All");
      setPagination((p) => ({ ...p, current: 1 }));
    } else {
      if (skipParams.includes("skipProject"))          setSelectedProject([]);
      if (skipParams.includes("skipDepartment"))       setTechnology([]);
      if (skipParams.includes("skipManager"))          setManager([]);
      if (skipParams.includes("skipAccountManager"))   setAccountManager([]);
      if (skipParams.includes("skipNeedToBillCustomer")) setFeedBackTypeFilter("All");
      if (skipParams.includes("skipCreatedBy"))        setCreatedBy([]);
    }
    if (selectedFilters) {
      setSelectedProject(selectedFilters.project        || []);
      setTechnology(selectedFilters.technology           || []);
      setManager(selectedFilters.manager                 || []);
      setAccountManager(selectedFilters.accountManager  || []);
      setFeedBackTypeFilter(selectedFilters.needToBillCustomer || "All");
      setCreatedBy(selectedFilters.createdBy             || []);
      setPagination((p) => ({ ...p, current: 1 }));
    }
  }, []);

  /* ─────────────────────────────────────────────────────────────
     TABLE COLUMNS
  ───────────────────────────────────────────────────────────── */
  const columns = useMemo(() => {
    const cols = [
      {
        title: "Project",
        key: "project",
        width: 220,
        ellipsis: true,
        render: (_, r) => (
          <span className="pe-project-chip">
            {r?.project?.title || "—"}
          </span>
        ),
      },
      {
        title: "Amount",
        key: "amount",
        width: 110,
        render: (_, r) =>
          r?.cost_in_usd ? (
            <span className="pe-amount-cell">
              <span className="pe-amount-currency">$</span>
              {parseFloat(r.cost_in_usd).toLocaleString()}
            </span>
          ) : "—",
      },
      {
        title: "Billable",
        key: "billable",
        width: 100,
        render: (_, r) =>
          r?.need_to_bill_customer
            ? <span className="pe-billable-yes">Yes</span>
            : <span className="pe-billable-no">No</span>,
      },
      {
        title: "Created By",
        key: "createdBy",
        width: 130,
        render: (_, r) => r?.createdBy?.full_name || "—",
      },
      {
        title: "Date",
        key: "date",
        width: 110,
        render: (_, r) =>
          r?.createdAt ? moment(r.createdAt).format("DD MMM YYYY") : "—",
      },
      {
        title: "Status",
        key: "status",
        width: 110,
        render: (_, r) => (
          <span className={`pe-status-badge ${statusClass(r?.status)}`}>
            {r?.status || "—"}
          </span>
        ),
      },
    ];

    if (userPermissions.hasAccess || userPermissions.hasClientAccess) {
      cols.push({
        title: "Actions",
        key: "actions",
        width: 120,
        render: (_, r) => (
          <div className="pe-actions">
            <Tooltip title="View">
              <button
                className="pe-action-btn"
                onClick={() => handleViewExpense(r?._id)}
              >
                <EyeOutlined />
              </button>
            </Tooltip>

            <Tooltip title="Edit">
              <Link to={`/${companySlug}/edit/projectexpenseform/${r._id}`}>
                <button className="pe-action-btn edit">
                  <EditOutlined />
                </button>
              </Link>
            </Tooltip>

            {userPermissions.hasAccess && (
              <Popconfirm
                icon={<QuestionCircleOutlined style={{ color: "#dc2626" }} />}
                title="Delete this expense?"
                onConfirm={() => deleteProjectExpences(r._id)}
                okText="Delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
              >
                <Tooltip title="Delete">
                  <button className="pe-action-btn delete">
                    <DeleteOutlined />
                  </button>
                </Tooltip>
              </Popconfirm>
            )}
          </div>
        ),
      });
    }

    return cols;
  }, [userPermissions, handleViewExpense, deleteProjectExpences, companySlug]);

  /* ─────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────── */
  return (
    <div className="pe-page">

      {/* ══ Header ══ */}
      <div className="pe-header">
        <h1 className="pe-title">Project Expense</h1>
        <div className="pe-header-actions">
          <ProjectExpenseFilterComponent
            onFilterChange={onFilterChange}
            userPermissions={userPermissions}
          />
          <button
            className="pe-btn"
            disabled={!pagination.total}
            onClick={exportCSV}
          >
            <DownloadOutlined /> <span>Export CSV</span>
          </button>
          {userPermissions.canAddExpense && (
            <Link to={`/${companySlug}/add/projectexpenseform`}>
              <button className="pe-btn primary">
                <PlusOutlined /> <span>Add Expense</span>
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* ══ Stats Cards ══ */}
      <div className="pe-stats-grid">
        <StatCard
          icon={<WalletOutlined />}
          label="Total Expenses"
          value={fmtUSD(analytics.totalAmt)}
          sub={`${analytics.totalCount} records`}
          color="blue"
        />
        <StatCard
          icon={<CheckCircleOutlined />}
          label="Approved"
          value={fmtUSD(analytics.approvedAmt)}
          sub={`${analytics.approvedCount} records`}
          color="green"
        />
        <StatCard
          icon={<ClockCircleOutlined />}
          label="Pending"
          value={fmtUSD(analytics.pendingAmt)}
          sub={`${analytics.pendingCount} records`}
          color="orange"
        />
        <StatCard
          icon={<DollarCircleOutlined />}
          label="Billable"
          value={fmtUSD(analytics.billableAmt)}
          sub={`${analytics.billableCount} records`}
          color="purple"
        />
      </div>

      {/* ══ Charts ══ */}
      <div className="pe-charts-grid">
        {/* Monthly Trend */}
        <div className="pe-chart-card">
          <div className="pe-chart-header">
            <div>
              <div className="pe-chart-title">Monthly Expense Trend</div>
              <div className="pe-chart-sub">Last 6 months · USD</div>
            </div>
          </div>
          <ReactApexChart
            type="area"
            series={lineSeries}
            options={lineOptions}
            height={210}
          />
        </div>

        {/* Expense by Project */}
        <div className="pe-chart-card">
          <div className="pe-chart-header">
            <div>
              <div className="pe-chart-title">Expense by Project</div>
              <div className="pe-chart-sub">Top 8 projects · USD</div>
            </div>
          </div>
          <ReactApexChart
            type="bar"
            series={barSeries}
            options={barOptions}
            height={210}
          />
        </div>

        {/* Billable vs Non-Billable donut */}
        <div className="pe-chart-card">
          <div className="pe-chart-header">
            <div>
              <div className="pe-chart-title">Billable Split</div>
              <div className="pe-chart-sub">Total spend allocation</div>
            </div>
          </div>
          <ReactApexChart
            type="donut"
            series={donutSeries}
            options={donutOptions}
            height={180}
          />
          <div className="pe-legend">
            <div className="pe-legend-row">
              <div className="pe-legend-left">
                <span className="pe-legend-dot" style={{ background: "#2563eb" }} />
                Billable
              </div>
              <span className="pe-legend-val">{fmtUSD(analytics.billableAmt2)}</span>
            </div>
            <div className="pe-legend-row">
              <div className="pe-legend-left">
                <span className="pe-legend-dot" style={{ background: "#e2e8f0" }} />
                Non-Billable
              </div>
              <span className="pe-legend-val">{fmtUSD(analytics.nonBillableAmt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══ Quick Filter Bar ══ */}
      <div className="pe-filter-bar">
        <span className="pe-filter-label">Status:</span>
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 130 }}
          size="middle"
        >
          <Option value="All">All Status</Option>
          <Option value="Pending">Pending</Option>
          <Option value="Approved">Approved</Option>
          <Option value="Rejected">Rejected</Option>
          <Option value="Paid">Paid</Option>
        </Select>

        <div className="pe-filter-divider" />

        <span className="pe-filter-label">Date Range:</span>
        <RangePicker
          size="middle"
          value={dateRange}
          onChange={(v) => setDateRange(v || [null, null])}
          allowClear
          format="DD MMM YYYY"
        />

        <div className="pe-filter-divider" />

        <span className="pe-filter-label">Billable only:</span>
        <Switch
          checked={billableToggle}
          onChange={setBillableToggle}
          size="small"
        />

        {(statusFilter !== "All" || billableToggle || dateRange[0]) && (
          <button
            className="pe-clear-filters-btn"
            onClick={() => {
              setStatusFilter("All");
              setBillableToggle(false);
              setDateRange([null, null]);
            }}
          >
            × Clear filters
          </button>
        )}
      </div>

      {/* ══ Expense Table ══ */}
      <div className="pe-table-card">
        <div className="pe-table-header">
          <div>
            <span className="pe-table-title">All Expenses</span>
            {pagination.total > 0 && (
              <span className="pe-table-count"> · {pagination.total} records</span>
            )}
          </div>
        </div>
        <Table
          columns={columns}
          dataSource={projectexpencesList}
          rowKey="_id"
          loading={tableLoading}
          pagination={{
            showSizeChanger:  true,
            pageSizeOptions:  PAGINATION_OPTIONS,
            current:          pagination.current,
            pageSize:         pagination.pageSize,
            total:            pagination.total,
            showTotal: (total) => `Total ${total} records`,
          }}
          onChange={(page) => setPagination((p) => ({ ...p, ...page }))}
          scroll={{ x: 900 }}
        />
      </div>

      {/* ══ View Drawer ══ */}
      <Drawer
        className="pe-drawer"
        title="Expense Details"
        placement="right"
        width={480}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setViewData({}); }}
        destroyOnClose
      >
        {/* Amount highlight */}
        <div className="pe-drawer-field">
          <div className="pe-drawer-label">Amount</div>
          <div className="pe-drawer-amount">
            ${parseFloat(viewData?.cost_in_usd || 0).toLocaleString()}
          </div>
        </div>

        <div className="pe-drawer-divider" />

        <Row gutter={[16, 0]}>
          <Col span={14}>
            <div className="pe-drawer-field">
              <div className="pe-drawer-label">Project</div>
              <div className="pe-drawer-value">{viewData?.project?.title || "—"}</div>
            </div>
          </Col>
          <Col span={10}>
            <div className="pe-drawer-field">
              <div className="pe-drawer-label">Status</div>
              <div style={{ paddingTop: 6 }}>
                <span className={`pe-status-badge ${statusClass(viewData?.status)}`}>
                  {viewData?.status || "—"}
                </span>
              </div>
            </div>
          </Col>
        </Row>

        <Row gutter={[16, 0]}>
          <Col span={12}>
            <div className="pe-drawer-field">
              <div className="pe-drawer-label">Created By</div>
              <div className="pe-drawer-value">{viewData?.createdBy?.full_name || "—"}</div>
            </div>
          </Col>
          <Col span={12}>
            <div className="pe-drawer-field">
              <div className="pe-drawer-label">Date</div>
              <div className="pe-drawer-value">
                {viewData?.createdAt ? moment(viewData.createdAt).format("DD MMM YYYY") : "—"}
              </div>
            </div>
          </Col>
        </Row>

        <div className="pe-drawer-field">
          <div className="pe-drawer-label">Billable to Customer</div>
          <div style={{ paddingTop: 6 }}>
            {viewData?.need_to_bill_customer
              ? <span className="pe-billable-yes">Yes – Billable</span>
              : <span className="pe-billable-no">No – Non-billable</span>}
          </div>
        </div>

        <div className="pe-drawer-divider" />

        {viewData?.purchase_request_details && (
          <div className="pe-drawer-field">
            <div className="pe-drawer-label">Purchase Request Details</div>
            <div className="pe-drawer-value">
              {viewData.purchase_request_details.replace(/<br\s*\/?>/g, "\n")}
            </div>
          </div>
        )}

        {viewData?.details && (
          <div className="pe-drawer-field">
            <div className="pe-drawer-label">Accounting Details</div>
            <div className="pe-drawer-value">{viewData.details}</div>
          </div>
        )}

        {viewData?.nature_Of_expense && (
          <div className="pe-drawer-field">
            <div className="pe-drawer-label">Nature of Expense</div>
            <div className="pe-drawer-value">{viewData.nature_Of_expense}</div>
          </div>
        )}

        {viewData?.projectexpences?.length > 0 && (
          <div className="pe-drawer-field">
            <div className="pe-drawer-label">Document</div>
            <a
              href={`${process.env.REACT_APP_API_URL}/public/projectexpense/${viewData.projectexpences}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}
            >
              <FileTextOutlined />
              {viewData.projectexpences}
            </a>
          </div>
        )}

        {/* Footer actions */}
        <div className="pe-drawer-divider" />
        <div style={{ display: "flex", gap: 10 }}>
          <Link to={`/${companySlug}/edit/projectexpenseform/${viewData?._id}`}>
            <Button icon={<EditOutlined />} type="primary" size="middle">
              Edit Expense
            </Button>
          </Link>
          {userPermissions.hasAccess && (
            <Popconfirm
              title="Delete this expense?"
              onConfirm={() => { deleteProjectExpences(viewData?._id); setDrawerOpen(false); }}
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button icon={<DeleteOutlined />} danger size="middle">Delete</Button>
            </Popconfirm>
          )}
        </div>
      </Drawer>
    </div>
  );
};

export default React.memo(Projectexpences);
