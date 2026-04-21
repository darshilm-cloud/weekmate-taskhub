/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useDispatch } from "react-redux";
import { Link, useHistory, useLocation } from "react-router-dom/cjs/react-router-dom.min";
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
import { ProjectExpenseSkeleton } from "../../components/common/SkeletonLoader";
import { useSocketAction } from "../../hooks/useSocketAction";
import { socketEvents } from "../../settings/socketEventName";
import NoDataFoundIcon from "../../components/common/NoDataFoundIcon";

const { Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const USER_ROLES = {
  ADMIN_ROLES:          ["Admin", "PC", "TL", "AM", "User"],
  EXPENSE_ACCESS_ROLES: ["Admin", "PC", "AM", "TL"],
  SUPER_ADMIN:          ["Admin"],
  CLIENT_USER_ID:       sideBarContentId2,
};
const PAGINATION_OPTIONS = ["10", "20", "25", "30"];

/* ─── helpers ───────────────────────────────────────────────────── */
const fmtINRCompact = (v) => {
  const n = parseFloat(v) || 0;
  return n >= 1000 ? `₹${(n / 1000).toFixed(1)}k` : `₹${n.toFixed(2)}`;
};

const fmtINR = (v) => {
  const n = parseFloat(v) || 0;
  return `₹${n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const fmtINRShort = (v) => {
  const n = parseFloat(v) || 0;
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}k`;
  return `₹${Math.round(n)}`;
};

const fmtINRCroreAxis = (v) => {
  const n = parseFloat(v) || 0;
  if (n === 0) return "₹0";
  if (n >= 10000000) {
    const crores = n / 10000000;
    return Number.isInteger(crores) ? `₹${crores}Cr` : `₹${crores.toFixed(2)}Cr`;
  }
  const lakhs = n / 100000;
  return Number.isInteger(lakhs) ? `₹${lakhs}L` : `₹${lakhs.toFixed(1)}L`;
};

const toExpenseArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
};

const normalizeExpenseRecord = (expense) => {
  if (!expense || typeof expense !== "object") return expense;

  const creatorName =
    expense?.createdBy?.full_name ||
    expense?.created_by?.full_name ||
    expense?.created_by_name ||
    expense?.creator?.full_name ||
    expense?.creator_name ||
    expense?.user?.full_name ||
    expense?.user_name ||
    "";

  return {
    ...expense,
    project: expense?.project || expense?.project_id || null,
    createdBy: expense?.createdBy || expense?.created_by || expense?.creator || expense?.user || {
      full_name: creatorName,
    },
  };
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

const buildExpenseFilterBody = ({
  selectedProject,
  technology,
  manager,
  accontManager,
  createdBy,
  need_to_bill_customer,
}) => {
  const body = {};

  if (Array.isArray(selectedProject) && selectedProject.length > 0) {
    body.project_id = selectedProject;
  }
  if (Array.isArray(technology) && technology.length > 0) {
    body.technology = technology;
  }
  if (Array.isArray(manager) && manager.length > 0) {
    body.manager_id = manager;
  }
  if (Array.isArray(accontManager) && accontManager.length > 0) {
    body.acc_manager_id = accontManager;
  }
  if (Array.isArray(createdBy) && createdBy.length > 0) {
    body.createdBy = createdBy;
  }
  if (need_to_bill_customer !== "All" && need_to_bill_customer !== undefined) {
    body.need_to_bill_customer = need_to_bill_customer;
  }

  return body;
};

const normalizeExpenseFilters = (filters = {}) => ({
  project: Array.isArray(filters.project) ? [...filters.project] : [],
  technology: Array.isArray(filters.technology) ? [...filters.technology] : [],
  manager: Array.isArray(filters.manager) ? [...filters.manager] : [],
  accountManager: Array.isArray(filters.accountManager) ? [...filters.accountManager] : [],
  needToBillCustomer: filters.needToBillCustomer || "All",
  createdBy: Array.isArray(filters.createdBy) ? [...filters.createdBy] : [],
});

const normalizeEntityId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") return value?._id || value?.id || value?.value || "";
  return String(value);
};

const toIdList = (...values) =>
  values
    .flatMap((value) => {
      if (Array.isArray(value)) return value;
      return value !== undefined && value !== null ? [value] : [];
    })
    .map(normalizeEntityId)
    .filter(Boolean);

const normalizeBillableValue = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["yes", "true", "1"].includes(normalized)) return true;
    if (["no", "false", "0"].includes(normalized)) return false;
  }
  return null;
};

const hasLocalExpenseFilters = ({
  selectedProject = [],
  technology = [],
  manager = [],
  accontManager = [],
  createdBy = [],
  need_to_bill_customer,
}) =>
  selectedProject.length > 0 ||
  technology.length > 0 ||
  manager.length > 0 ||
  accontManager.length > 0 ||
  createdBy.length > 0 ||
  need_to_bill_customer !== "All";

const filterExpensesLocally = (
  expenses = [],
  {
    selectedProject = [],
    technology = [],
    manager = [],
    accontManager = [],
    createdBy = [],
    need_to_bill_customer = "All",
  } = {}
) => {
  const selectedProjectIds = selectedProject.map(normalizeEntityId).filter(Boolean);
  const selectedTechnologyIds = technology.map(normalizeEntityId).filter(Boolean);
  const selectedManagerIds = manager.map(normalizeEntityId).filter(Boolean);
  const selectedAccountManagerIds = accontManager.map(normalizeEntityId).filter(Boolean);
  const selectedCreatorIds = createdBy.map(normalizeEntityId).filter(Boolean);
  const selectedBillable = normalizeBillableValue(need_to_bill_customer);

  return expenses.filter((expense) => {
    const projectIds = toIdList(expense?.project, expense?.project?._id, expense?.project_id);
    const technologyIds = toIdList(
      expense?.technology,
      expense?.technology?._id,
      expense?.technology_id,
      expense?.project?.technology,
      expense?.project?.technology?._id,
      expense?.project?.technology_id,
      expense?.project?.project_tech,
      expense?.project?.project_tech?._id
    );
    const managerIds = toIdList(expense?.manager, expense?.manager?._id, expense?.manager_id);
    const accountManagerIds = toIdList(
      expense?.acc_manager,
      expense?.acc_manager?._id,
      expense?.accountManager,
      expense?.accountManager?._id,
      expense?.acc_manager_id
    );
    const creatorIds = toIdList(
      expense?.createdBy,
      expense?.createdBy?._id,
      expense?.created_by,
      expense?.created_by?._id,
      expense?.creator,
      expense?.creator?._id,
      expense?.user,
      expense?.user?._id
    );
    const billableValue = normalizeBillableValue(expense?.need_to_bill_customer);

    if (selectedProjectIds.length > 0 && !projectIds.some((id) => selectedProjectIds.includes(id))) {
      return false;
    }
    if (selectedTechnologyIds.length > 0 && !technologyIds.some((id) => selectedTechnologyIds.includes(id))) {
      return false;
    }
    if (selectedManagerIds.length > 0 && !managerIds.some((id) => selectedManagerIds.includes(id))) {
      return false;
    }
    if (
      selectedAccountManagerIds.length > 0 &&
      !accountManagerIds.some((id) => selectedAccountManagerIds.includes(id))
    ) {
      return false;
    }
    if (selectedCreatorIds.length > 0 && !creatorIds.some((id) => selectedCreatorIds.includes(id))) {
      return false;
    }
    if (selectedBillable !== null && billableValue !== selectedBillable) {
      return false;
    }

    return true;
  });
};

const mergeExpensesById = (primary = [], secondary = []) => {
  const map = new Map();
  [...primary, ...secondary].forEach((expense) => {
    const normalizedExpense = normalizeExpenseRecord(expense);
    if (normalizedExpense?._id) {
      map.set(normalizedExpense._id, normalizedExpense);
    }
  });
  return Array.from(map.values());
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
  const history       = useHistory();
  const location      = useLocation();
  const { emitEvent, listenEvent } = useSocketAction();

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
  const [optimisticExpenses,   setOptimisticExpenses]   = useState([]);
  const optimisticRef = React.useRef([]);
  // Keep ref in sync so fetch callbacks always read latest value
  React.useEffect(() => { optimisticRef.current = optimisticExpenses; }, [optimisticExpenses]);
  const [analyticsLoading,     setAnalyticsLoading]     = useState(false);
  const [tableLoading,         setTableLoading]         = useState(false);
  const [pageLoading,          setPageLoading]          = useState(true);
  const [pagination,           setPagination]           = useState({ current: 1, pageSize: 25 });

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

  const appliedFilters = useMemo(() => normalizeExpenseFilters({
    project: selectedProject,
    technology,
    manager,
    accountManager: accontManager,
    needToBillCustomer: need_to_bill_customer,
    createdBy,
  }), [selectedProject, technology, manager, accontManager, need_to_bill_customer, createdBy]);

  const fetchExpenseRecords = useCallback(async ({ pageNo, limit, filters } = {}) => {
    const response = await Service.makeAPICall({
      methodName: Service.postMethod,
      api_url:    Service.getprojectexpanses,
      body: {
        pageNo,
        limit,
        sort: "_id",
        sortBy: "desc",
        ...(filters || {}),
      },
    });

    const rows = toExpenseArray(response?.data?.data).map(normalizeExpenseRecord);
    const total = response?.data?.metadata?.total || rows.length;

    return { rows, total };
  }, []);

  /* ─────────────────────────────────────────────────────────────
     FETCH — full dataset for analytics (large limit, no pagination)
  ───────────────────────────────────────────────────────────── */
  const fetchAllForAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const activeFilters = buildExpenseFilterBody({
        selectedProject,
        technology,
        manager,
        accontManager,
        createdBy,
        need_to_bill_customer,
      });
      const shouldFilterLocally = hasLocalExpenseFilters({
        selectedProject,
        technology,
        manager,
        accontManager,
        createdBy,
        need_to_bill_customer,
      });

      let { rows: serverExpenses } = await fetchExpenseRecords({
        pageNo: 1,
        limit: 1000,
        filters: shouldFilterLocally ? {} : activeFilters,
      });

      if (shouldFilterLocally) {
        serverExpenses = filterExpensesLocally(serverExpenses, {
          selectedProject,
          technology,
          manager,
          accontManager,
          createdBy,
          need_to_bill_customer,
        });
      }

      setAllExpenses(serverExpenses);
      setOptimisticExpenses([]);
    } catch (err) {
      console.error("Analytics fetch error:", err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [
    selectedProject,
    technology,
    manager,
    accontManager,
    createdBy,
    need_to_bill_customer,
    fetchExpenseRecords,
  ]);

  /* ─────────────────────────────────────────────────────────────
     FETCH — paginated table data
  ───────────────────────────────────────────────────────────── */
  const fetchTableData = useCallback(async () => {
    setTableLoading(true);
    try {
      dispatch(showAuthLoader());
      const activeFilters = buildExpenseFilterBody({
        selectedProject,
        technology,
        manager,
        accontManager,
        createdBy,
        need_to_bill_customer,
      });
      const shouldFilterLocally = hasLocalExpenseFilters({
        selectedProject,
        technology,
        manager,
        accontManager,
        createdBy,
        need_to_bill_customer,
      });

      let { rows: serverExpenses, total: serverTotal } = await fetchExpenseRecords({
        pageNo: pagination.current,
        limit: pagination.pageSize,
        filters: shouldFilterLocally ? {} : activeFilters,
      });

      if (shouldFilterLocally) {
        const { rows: allServerExpenses } = await fetchExpenseRecords({
          pageNo: 1,
          limit: 1000,
        });
        const locallyFilteredExpenses = filterExpensesLocally(allServerExpenses, {
          selectedProject,
          technology,
          manager,
          accontManager,
          createdBy,
          need_to_bill_customer,
        });
        const startIndex = (pagination.current - 1) * pagination.pageSize;
        const endIndex = startIndex + pagination.pageSize;

        serverExpenses = locallyFilteredExpenses.slice(startIndex, endIndex);
        serverTotal = locallyFilteredExpenses.length;
      }

      dispatch(hideAuthLoader());

      setprojectexpencesList(serverExpenses);
      setPagination((p) => ({ ...p, total: serverTotal }));
      setOptimisticExpenses([]);
    } catch (err) {
      dispatch(hideAuthLoader());
      console.error(err);
    } finally {
      setTableLoading(false);
      setPageLoading(false);
    }
  }, [
    pagination.current, pagination.pageSize,
    selectedProject, technology, manager, accontManager, createdBy, need_to_bill_customer,
    dispatch, fetchExpenseRecords,
  ]);

  useEffect(() => {
    const justCreatedExpense = location?.state?.justCreatedExpense;
    if (!justCreatedExpense?._id) return;

    setOptimisticExpenses((prev) => mergeExpensesById([justCreatedExpense], prev));
    setAllExpenses((prev) => mergeExpensesById([justCreatedExpense], prev));
    setprojectexpencesList((prev) =>
      pagination.current === 1 ? mergeExpensesById([justCreatedExpense], prev) : prev
    );
    setPagination((prev) => ({
      ...prev,
      total: Math.max((prev.total || 0) + 1, 1),
    }));

    history.replace(location.pathname, {});
  }, [history, location.pathname, location.state, pagination.current]);

  useEffect(() => {
    fetchAllForAnalytics();
  }, [fetchAllForAnalytics]);

  useEffect(() => {
    fetchTableData();
  }, [fetchTableData]);

  /* ─────────────────────────────────────────────────────────────
     REAL-TIME LISTENERS
  ───────────────────────────────────────────────────────────── */
  useEffect(() => {
    const cleanup = listenEvent(socketEvents.PROJECT_EXPENSE_UPDATED, (data) => {
      console.log("Real-time expense update received:", data);
      fetchAllForAnalytics();
      fetchTableData();
    });
    return cleanup;
  }, [listenEvent, fetchAllForAnalytics, fetchTableData]);

  /* ─────────────────────────────────────────────────────────────
     ANALYTICS — computed from allExpenses
  ───────────────────────────────────────────────────────────── */
  const analytics = useMemo(() => {
    let expenses = allExpenses.length ? allExpenses : projectexpencesList;

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
  }, [allExpenses, projectexpencesList, statusFilter, billableToggle, dateRange]);

  /* ─────────────────────────────────────────────────────────────
     CHART OPTIONS
  ───────────────────────────────────────────────────────────── */
  const lineOptions = useMemo(() => ({
    chart:  { type: "area", fontFamily: "inherit", toolbar: { show: false }, sparkline: { enabled: false } },
    stroke: { curve: "smooth", width: 3 },
    colors: ["#2563eb"],
    fill:   {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.22,
        opacityTo: 0.04,
        stops: [0, 90, 100],
      },
    },
    markers: {
      size: 4,
      strokeWidth: 0,
      hover: { size: 6 },
    },
    xaxis: {
      categories: analytics.monthlyLabels,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { fontSize: "11px", colors: "#64748b" },
        rotate: 0,
        rotateAlways: false,
        hideOverlappingLabels: true,
        trim: true,
      },
    },
    yaxis:  {
      tickAmount: 4,
      labels: {
        formatter: (v) => fmtINRShort(v),
        style: { fontSize: "11px", colors: "#64748b" },
      },
    },
    dataLabels: { enabled: false },
    grid: {
      borderColor: "#eef2f7",
      strokeDashArray: 3,
      padding: { left: 6, right: 14, top: 8, bottom: 0 },
    },
    tooltip: { y: { formatter: (v) => fmtINR(v) } },
  }), [analytics.monthlyLabels]);

  const lineSeries = useMemo(() => [{
    name: "Expense (₹)",
    data: analytics.monthlyData,
  }], [analytics.monthlyData]);

  const fixedProjectAxisLabels = ["₹0", "₹20L", "₹40L", "₹60L", "₹80L", "₹1Cr"];

  const projectBarRows = useMemo(
    () =>
      (analytics.projectLabels.length ? analytics.projectLabels : ["No Data"]).map((label, index) => {
        const value = analytics.projectData[index] || 0;
        const widthPercent = Math.min((value / 10000000) * 100, 100);

        return {
          label,
          value,
          widthPercent,
        };
      }),
    [analytics.projectData, analytics.projectLabels]
  );

  const donutOptions = useMemo(() => ({
    chart:  { type: "donut", fontFamily: "inherit" },
    labels: ["Billable", "Non-Billable"],
    colors: ["#2563eb", "#e2e8f0"],
    legend: { show: false },
    plotOptions: { pie: { donut: { size: "68%" } } },
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    tooltip: { y: { formatter: (v) => fmtINR(v) } },
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
        await emitEvent(socketEvents.PROJECT_EXPENSE_UPDATED, {
          type: "delete",
          id: deleteId,
        });
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
  const onFilterChange = useCallback((skipParams = [], selectedFilters) => {
    const nextSkipParams = Array.isArray(skipParams) ? skipParams : [];

    if (nextSkipParams.includes("skipAll")) {
      setSelectedProject([]); setTechnology([]); setCreatedBy([]);
      setManager([]); setAccountManager([]); setFeedBackTypeFilter("All");
      setPagination((p) => ({ ...p, current: 1 }));
    } else {
      if (nextSkipParams.includes("skipProject"))            setSelectedProject([]);
      if (nextSkipParams.includes("skipDepartment"))         setTechnology([]);
      if (nextSkipParams.includes("skipManager"))            setManager([]);
      if (nextSkipParams.includes("skipAccountManager"))     setAccountManager([]);
      if (nextSkipParams.includes("skipNeedToBillCustomer")) setFeedBackTypeFilter("All");
      if (nextSkipParams.includes("skipCreatedBy"))          setCreatedBy([]);
    }
    if (selectedFilters) {
      const normalizedFilters = normalizeExpenseFilters(selectedFilters);

      setSelectedProject(normalizedFilters.project);
      setTechnology(normalizedFilters.technology);
      setManager(normalizedFilters.manager);
      setAccountManager(normalizedFilters.accountManager);
      setFeedBackTypeFilter(normalizedFilters.needToBillCustomer);
      setCreatedBy(normalizedFilters.createdBy);
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
              <span className="pe-amount-currency">₹</span>
              {parseFloat(r.cost_in_usd).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
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
        render: (_, r) =>
          r?.createdBy?.full_name ||
          r?.created_by?.full_name ||
          r?.created_by_name ||
          r?.creator?.full_name ||
          r?.creator_name ||
          r?.user?.full_name ||
          r?.user_name ||
          "—",
      },
      {
        title: "Date",
        key: "date",
        width: 110,
        render: (_, r) =>
          r?.createdAt ? moment(r.createdAt).format("DD-MM-YYYY") : "—",
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
  if (pageLoading) return <ProjectExpenseSkeleton />;

  return (
    <div className="pe-page">

      {/* ══ Header ══ */}
      <div className="pe-header">
        <h1 className="pe-title">Project Expense</h1>
        <div className="pe-header-actions">
          <ProjectExpenseFilterComponent
            onFilterChange={onFilterChange}
            selectedFilters={appliedFilters}
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
              <Button className="add-btn" type="primary">
                <PlusOutlined /> Add Expense
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* ══ Stats Cards ══ */}
      <div className="pe-stats-grid">
        <StatCard
          icon={<WalletOutlined />}
          label="Total Expenses"
          value={fmtINRCompact(analytics.totalAmt)}
          sub={`${analytics.totalCount} records`}
          color="blue"
        />
        <StatCard
          icon={<CheckCircleOutlined />}
          label="Approved"
          value={fmtINRCompact(analytics.approvedAmt)}
          sub={`${analytics.approvedCount} records`}
          color="green"
        />
        <StatCard
          icon={<ClockCircleOutlined />}
          label="Pending"
          value={fmtINRCompact(analytics.pendingAmt)}
          sub={`${analytics.pendingCount} records`}
          color="orange"
        />
        <StatCard
          icon={<DollarCircleOutlined />}
          label="Billable"
          value={fmtINRCompact(analytics.billableAmt)}
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
              <div className="pe-chart-sub">Last 6 months · INR</div>
            </div>
          </div>
          <ReactApexChart
            type="area"
            series={lineSeries}
            options={lineOptions}
            height={300}
          />
        </div>

        {/* Expense by Project */}
        <div className="pe-chart-card">
          <div className="pe-chart-header">
            <div>
              <div className="pe-chart-title">Expense by Project</div>
              <div className="pe-chart-sub">Top 8 projects · INR</div>
            </div>
          </div>
          <div className="pe-project-bars">
            {projectBarRows.map((project) => (
              <div className="pe-project-bars-row" key={project.label}>
                <div className="pe-project-bars-name" title={project.label}>
                  {project.label}
                </div>
                <div className="pe-project-bars-track">
                  <div
                    className="pe-project-bars-fill"
                    style={{ width: `${project.widthPercent}%` }}
                  />
                </div>
                <div className="pe-project-bars-value">
                  {fmtINRShort(project.value)}
                </div>
              </div>
            ))}
          </div>
          <div className="pe-fixed-axis">
            {fixedProjectAxisLabels.map((label) => (
              <span key={label} className="pe-fixed-axis-label">
                {label}
              </span>
            ))}
          </div>
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
            height={260}
          />
          <div className="pe-legend">
            <div className="pe-legend-row">
              <div className="pe-legend-left">
                <span className="pe-legend-dot" style={{ background: "#2563eb" }} />
                Billable
              </div>
              <span className="pe-legend-val">{fmtINRCompact(analytics.billableAmt2)}</span>
            </div>
            <div className="pe-legend-row">
              <div className="pe-legend-left">
                <span className="pe-legend-dot" style={{ background: "#e2e8f0" }} />
                Non-Billable
              </div>
              <span className="pe-legend-val">{fmtINRCompact(analytics.nonBillableAmt)}</span>
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
          format="DD-MM-YYYY"
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
          locale={
            {
               emptyText: <NoDataFoundIcon />,
            }
          }
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
            {fmtINR(viewData?.cost_in_usd || 0)}
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
                {viewData?.createdAt ? moment(viewData.createdAt).format("DD-MM-YYYY") : "—"}
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
