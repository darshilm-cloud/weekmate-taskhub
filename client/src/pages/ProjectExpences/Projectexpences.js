/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useDispatch } from "react-redux";
import { Link, useHistory, useLocation } from "react-router-dom/cjs/react-router-dom.min";
import RowActions from "../../components/common/RowActions";
import {
  Button,
  Col,
  DatePicker,
  Drawer,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Row,
  Select,
  Switch,
  Table,
  Tooltip,
  Typography,
} from "antd";
import {
  DownloadOutlined,
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
import { getRoles, can } from "../../util/hasPermission";
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
import ProjectExpenseFormModal from "./ProjectExpenseFormModal";
import ColumnSelector from "../../components/common/ColumnSelector";
import useColumnVisibility from "../../hooks/useColumnVisibility";
import useExportColumns from "../../hooks/useExportColumns";
import useCompanyCurrency from "../../hooks/useCompanyCurrency";
import { getAppCurrencyCode, getAppCurrencySymbol } from "../../util/currencyUtils";
import { EditActionIcon, DeleteActionIcon } from "../../components/common/ActionIcons";
import { HRMS_CHART_PRIMARY } from "../../util/chartTheme";

// Every field the server's expense export can write (labels double as keys —
// the server picks its CSV fields by these names).
const PROJECT_EXPENSE_EXPORT_COLUMNS = [
  "Project Name",
  "Cost",
  "Need To Bill Customer",
  "Creator",
  "Creation Date",
  "Status",
  "Billing Cycle",
  "Purchase Request Details",
  "Details",
  "Nature Of Expense",
].map((label) => ({ key: label, label }));

const downloadExpensesCSV = async (columns) => {
  try {
    const response = await Service.makeAPICall({
      methodName: Service.postMethod,
      api_url: Service.exportProjectExpenses,
      body: { exportFileType: "csv", isExport: true, columns },
    });
    if (response?.data?.data) {
      const base64 = String(response.data.data || "");
      const binaryStr = atob(base64);
      const bytes = Uint8Array.from(binaryStr, (c) => c.charCodeAt(0));
      const decodedCsv = new TextDecoder("utf-8").decode(bytes);
      const csvBlob = new Blob([`\uFEFF${decodedCsv}`], {
        type: "text/csv;charset=utf-8;",
      });
      const objectUrl = URL.createObjectURL(csvBlob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "Project Expense.csv";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } else {
      message.error(response?.data?.message || "Export failed");
    }
  } catch (err) {
    message.error("Failed to export CSV");
  }
};

const { Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const USER_ROLES = {
  ADMIN_ROLES: ["Admin", "PC", "TL", "AM", "User"],
  SUPER_ADMIN: ["Admin"],
  CLIENT_USER_ID: sideBarContentId2,
};
const PAGINATION_OPTIONS = ["10", "20", "25", "50", "100"];

/* ─── helpers ───────────────────────────────────────────────────── */
// Amounts use the company currency (Company Profile → Currency). Lakh/crore
// abbreviations only make sense for INR; every other currency gets k/M/B.
const sym = () => getAppCurrencySymbol();
const isINR = () => getAppCurrencyCode() === "INR";

const fmtINRCompact = (v) => {
  const n = parseFloat(v) || 0;
  return n >= 1000 ? `${sym()}${(n / 1000).toFixed(1)}k` : `${sym()}${n.toFixed(2)}`;
};

const fmtINR = (v) => {
  const n = parseFloat(v) || 0;
  return `${sym()}${n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const fmtINRShort = (v) => {
  const n = parseFloat(v) || 0;
  if (isINR()) {
    if (n >= 10000000) return `${sym()}${(n / 10000000).toFixed(1)}Cr`;
    if (n >= 100000) return `${sym()}${(n / 100000).toFixed(1)}L`;
  } else {
    if (n >= 1000000000) return `${sym()}${(n / 1000000000).toFixed(1)}B`;
    if (n >= 1000000) return `${sym()}${(n / 1000000).toFixed(1)}M`;
  }
  if (n >= 1000) return `${sym()}${(n / 1000).toFixed(0)}k`;
  return `${sym()}${Math.round(n)}`;
};

// Fixed 0 → 1Cr (10M) scale of the "Top projects" bars.
// Axis for "Expense by Project": scaled to the largest project (rounded up to
// a clean step) so bars actually fill their track, instead of a fixed ₹1Cr scale.
const niceAxisMax = (value) => {
  if (!value || value <= 0) return 5;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((m) => m * magnitude >= value) * magnitude;
  return step;
};

const projectAxisLabels = (axisMax) =>
  [0, 0.2, 0.4, 0.6, 0.8, 1].map((f) => (f === 0 ? `${sym()}0` : fmtINRShort(axisMax * f)));

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
    case "pending": return "pending";
    case "rejected": return "rejected";
    case "paid": return "paid";
    default: return "default";
  }
};

const buildExpenseFilterBody = ({
  selectedProject,
  technology,
  manager,
  accontManager,
  createdBy,
  need_to_bill_customer,
  statusFilter,
  dateRange,
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
  // AM hidden: acc_manager_id filter removed
  // if (Array.isArray(accontManager) && accontManager.length > 0) {
  //   body.acc_manager_id = accontManager;
  // }
  if (Array.isArray(createdBy) && createdBy.length > 0) {
    body.createdBy = createdBy;
  }
  if (statusFilter && statusFilter !== "All") {
    body.status = statusFilter;
  }
  if (need_to_bill_customer && need_to_bill_customer !== "All") {
    body.need_to_bill_customer = need_to_bill_customer;
  }
  if (Array.isArray(dateRange) && dateRange[0] && dateRange[1]) {
    body.from_date = dateRange[0].toISOString ? dateRange[0].toISOString() : dateRange[0];
    body.to_date = dateRange[1].toISOString ? dateRange[1].toISOString() : dateRange[1];
  }

  return body;
};

const normalizeExpenseFilters = (filters = {}) => ({
  status: filters.status || "All",
  dateRange: Array.isArray(filters.dateRange)
    ? [filters.dateRange[0] || null, filters.dateRange[1] || null]
    : [null, null],
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
  const dispatch = useDispatch();
  const { currencyCode, currencySymbol } = useCompanyCurrency();
  const companySlug = localStorage.getItem("companyDomain");
  const history = useHistory();
  const location = useLocation();
  const { emitEvent, listenEvent } = useSocketAction();

  /* ── filter state (wired to existing FilterComponent) ── */
  const [selectedProject, setSelectedProject] = useState([]);
  const [technology, setTechnology] = useState([]);
  const [manager, setManager] = useState([]);
  const [accontManager, setAccountManager] = useState([]);
  const [need_to_bill_customer, setFeedBackTypeFilter] = useState("All");
  const [createdBy, setCreatedBy] = useState([]);

  /* ── status / date range (also edited from the Filter popover) ── */
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateRange, setDateRange] = useState([null, null]);

  /* ── data ── */
  const [summary, setSummary] = useState(null); // stat cards + charts, from the listing API
  const summaryKeyRef = React.useRef(null);
  const [projectexpencesList, setprojectexpencesList] = useState([]); // paginated table
  const [optimisticExpenses, setOptimisticExpenses] = useState([]);
  const optimisticRef = React.useRef([]);
  // Keep ref in sync so fetch callbacks always read latest value
  React.useEffect(() => { optimisticRef.current = optimisticExpenses; }, [optimisticExpenses]);
  const [tableLoading, setTableLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 25 });

  /* ── modal state ── */
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formModalMode, setFormModalMode] = useState("add"); // add, edit, view
  const [selectedExpenseId, setSelectedExpenseId] = useState(null);

  /* ── permissions ── */
  const userData = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user_data")) || {}; }
    catch { return {}; }
  }, []);
  const userPermissions = useMemo(() => ({
    hasAccess: getRoles(USER_ROLES.ADMIN_ROLES),
    hasClientAccess: userData._id === USER_ROLES.CLIENT_USER_ID,
    canAddExpense: can("expense_add"),
    canEditExpense: can("expense_edit"),
    canDeleteExpense: can("expense_delete"),
    isSuperAdmin: getRoles(USER_ROLES.SUPER_ADMIN),
  }), [userData._id]);

  const appliedFilters = useMemo(() => normalizeExpenseFilters({
    project: selectedProject,
    technology,
    manager,
    accountManager: accontManager,
    needToBillCustomer: need_to_bill_customer,
    createdBy,
    status: statusFilter,
    dateRange,
  }), [selectedProject, technology, manager, accontManager, need_to_bill_customer, createdBy, statusFilter, dateRange]);

  const fetchExpenseRecords = useCallback(async ({ pageNo, limit, filters } = {}) => {
    const response = await Service.makeAPICall({
      methodName: Service.postMethod,
      api_url: Service.getprojectexpanses,
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
    const summary = response?.data?.metadata?.summary || null;

    return { rows, total, summary };
  }, []);

  /* ─────────────────────────────────────────────────────────────
     FETCH — paginated table data
  ───────────────────────────────────────────────────────────── */
  const fetchTableData = useCallback(async ({ forceSummary = false } = {}) => {
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
        statusFilter,
        dateRange,
      });

      // Stat cards / charts come back with the listing (same filters, whole result set). They
      // only change with the filters or the data, so page changes don't ask for them again.
      const summaryKey = JSON.stringify(activeFilters);
      const wantSummary = forceSummary || summaryKeyRef.current !== summaryKey;

      const { rows: serverExpenses, total: serverTotal, summary: serverSummary } = await fetchExpenseRecords({
        pageNo: pagination.current,
        limit: pagination.pageSize,
        filters: {
          ...activeFilters,
          ...(wantSummary
            ? { include_summary: true, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }
            : {}),
        },
      });
      if (serverSummary) {
        summaryKeyRef.current = summaryKey;
        setSummary(serverSummary);
      }

      dispatch(hideAuthLoader());

      setprojectexpencesList(serverExpenses);
      setPagination((p) => ({ ...p, total: serverTotal }));
      setOptimisticExpenses([]);
    } catch (err) {
      dispatch(hideAuthLoader());
      console.error(err);
    } finally {
      setSummary((prev) => prev || {}); // never leave the cards on a spinner if the request failed
      setTableLoading(false);
      setPageLoading(false);
    }
  }, [
    pagination.current, pagination.pageSize,
    selectedProject, technology, manager, accontManager, createdBy, need_to_bill_customer,
    statusFilter, dateRange,
    dispatch, fetchExpenseRecords,
  ]);

  useEffect(() => {
    const justCreatedExpense = location?.state?.justCreatedExpense;
    if (!justCreatedExpense?._id) return;

    setOptimisticExpenses((prev) => mergeExpensesById([justCreatedExpense], prev));
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
    fetchTableData();
  }, [fetchTableData]);

  /* ─────────────────────────────────────────────────────────────
     REAL-TIME LISTENERS
  ───────────────────────────────────────────────────────────── */
  useEffect(() => {
    const cleanup = listenEvent(socketEvents.PROJECT_EXPENSE_UPDATED, (data) => {
      console.log("Real-time expense update received:", data);
      fetchTableData({ forceSummary: true });
    });
    return cleanup;
  }, [listenEvent, fetchTableData]);

  /* ─────────────────────────────────────────────────────────────
     ANALYTICS — summary returned by the listing API
  ───────────────────────────────────────────────────────────── */
  const analytics = useMemo(() => {
    const t = summary?.totals || {};
    const totalAmt = t.totalAmt || 0;
    const billableAmt = t.billableAmt || 0;

    /* monthly trend — last 6 months (server groups by YYYY-MM in the browser's timezone) */
    const monthSums = Object.fromEntries((summary?.monthly || []).map((m) => [m._id, m.amount]));
    const monthlyLabels = [];
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const m = moment().subtract(i, "months");
      monthlyLabels.push(m.format("MMM YY"));
      monthlyData.push(monthSums[m.format("YYYY-MM")] || 0);
    }

    /* expense by project — top 8 (already sorted by the server) */
    const projectLabels = (summary?.projects || []).map((p) => p.title || "Unknown");
    const projectData = (summary?.projects || []).map((p) => parseFloat((p.amount || 0).toFixed(2)));

    return {
      totalCount: t.totalCount || 0,
      totalAmt,
      billableCount: t.billableCount || 0,
      billableAmt,
      pendingCount: t.pendingCount || 0,
      pendingAmt: t.pendingAmt || 0,
      approvedCount: t.approvedCount || 0,
      approvedAmt: t.approvedAmt || 0,
      monthlyLabels,
      monthlyData,
      projectLabels,
      projectData,
      billableAmt2: billableAmt,
      nonBillableAmt: totalAmt - billableAmt,
    };
  }, [summary]);


  /* ─────────────────────────────────────────────────────────────
     CHART OPTIONS
  ───────────────────────────────────────────────────────────── */
  const lineOptions = useMemo(() => ({
    chart: { type: "area", fontFamily: "inherit", toolbar: { show: false }, sparkline: { enabled: false } },
    stroke: { curve: "smooth", width: 3 },
    colors: [HRMS_CHART_PRIMARY],
    fill: {
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
        style: { fontSize: "11px", colors: "#787878" },
        rotate: 0,
        rotateAlways: false,
        hideOverlappingLabels: true,
        trim: true,
      },
    },
    yaxis: {
      tickAmount: 4,
      labels: {
        formatter: (v) => fmtINRShort(v),
        style: { fontSize: "11px", colors: "#787878" },
      },
    },
    dataLabels: { enabled: false },
    grid: {
      borderColor: "#f2f5f8",
      strokeDashArray: 3,
      padding: { left: 6, right: 14, top: 8, bottom: 0 },
    },
    tooltip: { y: { formatter: (v) => fmtINR(v) } },
  }), [analytics.monthlyLabels, currencyCode]);

  const lineSeries = useMemo(() => [{
    name: `Expense (${currencySymbol})`,
    data: analytics.monthlyData,
  }], [analytics.monthlyData, currencySymbol]);

  const projectAxisMax = useMemo(
    () => niceAxisMax(Math.max(0, ...analytics.projectData.map((v) => Number(v) || 0))),
    [analytics.projectData]
  );
  const fixedProjectAxisLabels = projectAxisLabels(projectAxisMax);

  const projectBarRows = useMemo(
    () =>
      (analytics.projectLabels.length ? analytics.projectLabels : ["No Data"]).map((label, index) => {
        const value = analytics.projectData[index] || 0;
        const widthPercent = Math.min((value / projectAxisMax) * 100, 100);

        return {
          label,
          value,
          widthPercent,
        };
      }),
    [analytics.projectData, analytics.projectLabels, projectAxisMax]
  );

  const handleViewExpense = useCallback((expenseId) => {
    setSelectedExpenseId(expenseId);
    setFormModalMode("view");
    setFormModalOpen(true);
  }, []);

  const donutOptions = useMemo(() => ({
    chart: { type: "donut", fontFamily: "inherit" },
    labels: ["Billable", "Non-Billable"],
    colors: [HRMS_CHART_PRIMARY, "#e8e8e8"],
    legend: { show: false },
    plotOptions: { pie: { donut: { size: "68%" } } },
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    tooltip: { y: { formatter: (v) => fmtINR(v) } },
  }), [currencyCode]);

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
        api_url: `${Service.deleteprojectexpanses}/${deleteId}`,
      });
      dispatch(hideAuthLoader());
      if (response?.data?.data) {
        fetchTableData({ forceSummary: true });
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
  }, [dispatch, fetchTableData]);

  const { requestExport, exportColumnsModal } = useExportColumns();

  const exportCSV = useCallback(() => {
    requestExport({
      title: "Select Columns for Project Expense Export",
      columns: PROJECT_EXPENSE_EXPORT_COLUMNS,
      onExport: (keys) => downloadExpensesCSV(keys),
    });
  }, [requestExport]);


  /* ─────────────────────────────────────────────────────────────
     FILTER COMPONENT callback (existing filter component wiring)
  ───────────────────────────────────────────────────────────── */
  const onFilterChange = useCallback((skipParams = [], selectedFilters) => {
    const nextSkipParams = Array.isArray(skipParams) ? skipParams : [];

    if (nextSkipParams.includes("skipAll")) {
      setSelectedProject([]); setTechnology([]); setCreatedBy([]);
      setManager([]); setAccountManager([]); setFeedBackTypeFilter("All");
      setStatusFilter("All"); setDateRange([null, null]);
      setPagination((p) => ({ ...p, current: 1 }));
    } else {
      if (nextSkipParams.includes("skipProject")) setSelectedProject([]);
      if (nextSkipParams.includes("skipDepartment")) setTechnology([]);
      if (nextSkipParams.includes("skipManager")) setManager([]);
      if (nextSkipParams.includes("skipAccountManager")) setAccountManager([]);
      if (nextSkipParams.includes("skipNeedToBillCustomer")) setFeedBackTypeFilter("All");
      if (nextSkipParams.includes("skipCreatedBy")) setCreatedBy([]);
      if (nextSkipParams.includes("skipStatus")) setStatusFilter("All");
      if (nextSkipParams.includes("skipDateRange")) setDateRange([null, null]);
    }
    if (selectedFilters) {
      const normalizedFilters = normalizeExpenseFilters(selectedFilters);

      setSelectedProject(normalizedFilters.project);
      setTechnology(normalizedFilters.technology);
      setManager(normalizedFilters.manager);
      setAccountManager(normalizedFilters.accountManager);
      setFeedBackTypeFilter(normalizedFilters.needToBillCustomer);
      setCreatedBy(normalizedFilters.createdBy);
      setStatusFilter(normalizedFilters.status);
      setDateRange(normalizedFilters.dateRange);
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
              <span className="pe-amount-currency">{currencySymbol}</span>
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

    if (
      userPermissions.hasAccess ||
      userPermissions.hasClientAccess ||
      userPermissions.canEditExpense ||
      userPermissions.canDeleteExpense
    ) {
      cols.push({
        title: "Actions",
        key: "actions",
        width: 120,
        render: (_, r) => (
          <RowActions
            actions={[
              { key: "view", label: "View", icon: <EyeOutlined />, onClick: () => handleViewExpense(r?._id) },
              {
                key: "edit",
                label: "Edit",
                icon: <EditActionIcon />,
                hidden: !userPermissions.canEditExpense,
                onClick: () => {
                  setSelectedExpenseId(r._id);
                  setFormModalMode("edit");
                  setFormModalOpen(true);
                },
              },
              {
                key: "delete",
                label: "Delete",
                icon: <DeleteActionIcon />,
                hidden: !userPermissions.canDeleteExpense,
                confirm: "Delete this expense?",
                onClick: () => deleteProjectExpences(r._id),
              },
            ]}
          />
        ),
      });
    }

    return cols;
  }, [userPermissions, handleViewExpense, deleteProjectExpences, companySlug, currencySymbol]);

  const COLUMN_LOCKED = useMemo(() => ["project", "actions"], []);
  const { visibleKeys, saveVisibleKeys, filteredColumns, saving: savingColumns } =
    useColumnVisibility("projectExpenses", columns, [], COLUMN_LOCKED);

  /* ─────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────── */
  if (pageLoading) return <ProjectExpenseSkeleton />;

  return (
    <div className="pe-page">
      {exportColumnsModal}

      {/* ══ Header ══ */}
      <div className="inout-header text-left">
        <h2>Project Expense</h2>
        <div className="header-btns pe-header-actions">
          <ProjectExpenseFilterComponent
            onFilterChange={onFilterChange}
            selectedFilters={appliedFilters}
            userPermissions={userPermissions}
          />
          <ColumnSelector columns={columns} visibleKeys={visibleKeys} alwaysVisibleKeys={COLUMN_LOCKED} onSave={saveVisibleKeys} saving={savingColumns} />
          <button
            className="pe-btn"
            disabled={!pagination.total}
            onClick={exportCSV}
          >
            <DownloadOutlined /> <span>Export CSV</span>
          </button>
          {userPermissions.canAddExpense && (
            <Button
              className="add-btn"
              type="primary"
              onClick={() => {
                setSelectedExpenseId(null);
                setFormModalMode("add");
                setFormModalOpen(true);
              }}
            >
              <PlusOutlined /> Expense
            </Button>
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
              <div className="pe-chart-sub">Last 6 months · {currencyCode}</div>
            </div>
          </div>
          {!summary ? (
            <div className="pe-chart-skeleton" />
          ) : analytics.totalCount === 0 || analytics.monthlyData.every(v => v === 0) ? (
            <NoDataFoundIcon />
          ) : (
            <ReactApexChart
              type="area"
              series={lineSeries}
              options={lineOptions}
              height={300}
            />
          )}
        </div>

        {/* Expense by Project */}
        <div className="pe-chart-card">
          <div className="pe-chart-header">
            <div>
              <div className="pe-chart-title">Expense by Project</div>
              <div className="pe-chart-sub">Top 8 projects · {currencyCode}</div>
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
          {!summary ? (
            <div className="pe-chart-skeleton" />
          ) : analytics.totalCount === 0 ? (
            <NoDataFoundIcon />
          ) : (
            <ReactApexChart
              type="donut"
              series={donutSeries}
              options={donutOptions}
              height={260}
            />
          )}
          <div className="pe-legend">
            <div className="pe-legend-row">
              <div className="pe-legend-left">
                <span className="pe-legend-dot" style={{ background: HRMS_CHART_PRIMARY }} />
                Billable
              </div>
              <span className="pe-legend-val">{fmtINRCompact(analytics.billableAmt2)}</span>
            </div>
            <div className="pe-legend-row">
              <div className="pe-legend-left">
                <span className="pe-legend-dot" style={{ background: "#e8e8e8" }} />
                Non-Billable
              </div>
              <span className="pe-legend-val">{fmtINRCompact(analytics.nonBillableAmt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══ Expense Table ══ */}
      <div className="pe-table-card">
        <Table
          columns={filteredColumns}
          dataSource={projectexpencesList}
          rowKey="_id"
          loading={tableLoading}
          locale={
            {
              emptyText: <NoDataFoundIcon />,
            }
          }
          pagination={{
            showSizeChanger: true,
            pageSizeOptions: PAGINATION_OPTIONS,
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showTotal: (total) => `Total ${total} records`,
          }}
          onChange={(page) => setPagination((p) => ({ ...p, ...page }))}
          scroll={{ x: 900 }}
        />
      </div>

      <ProjectExpenseFormModal
        open={formModalOpen}
        mode={formModalMode}
        expenseId={selectedExpenseId}
        onCancel={() => {
          setFormModalOpen(false);
          setSelectedExpenseId(null);
        }}
        onSuccess={(msg) => {
          message.success(msg);
          setFormModalOpen(false);
          setSelectedExpenseId(null);
          fetchTableData({ forceSummary: true });
        }}
      />
    </div>
  );
};

export default React.memo(Projectexpences);
