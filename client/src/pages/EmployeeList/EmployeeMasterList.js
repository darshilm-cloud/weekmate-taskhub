/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback, useRef } from "react";
// InfiniteScroll removed - replaced with a direct scroll listener for reliability
import { Avatar, Tooltip, Select, Button, Spin, Input, message, Dropdown } from "antd";
import moment from "moment";
import {
  TeamOutlined,
  UserOutlined,
  StarOutlined,
  StarFilled,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DownloadOutlined,
  UploadOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CrownOutlined,
  MailOutlined,
  PhoneOutlined,
  BankOutlined,
  SearchOutlined,
  FileDoneOutlined,
  ClockCircleFilled,
  ArrowLeftOutlined,
  MoreOutlined,
  DownOutlined,
} from "@ant-design/icons";
import ReactApexChart from "react-apexcharts";
import { useLocation } from "react-router-dom/cjs/react-router-dom.min";
import { useDispatch } from "react-redux";
import "./EmployeeMasterList.css";
import EmployeeListTabClient from "./EmployeeListTabClient";
import EmployeeListTabUsers from "./EmployeeListTabUsers";
import UserDashboard from "./UserDashboard";
import EmployeeImportHistory from "./EmployeeImportHistory";
import ClientImportHistory from "./ClientImportHistory";
import Service from "../../service";
import { removeTitle } from "../../util/nameFilter";
import getRoleLabel from "../../util/roleLabels";
import { can } from "../../util/hasPermission";
import { UsersPageSkeleton } from "../../components/common/SkeletonLoader";
import NoDataFoundIcon from "../../components/common/NoDataFoundIcon";
import useExportColumns, { buildExportRows, toExportOptions } from "../../hooks/useExportColumns";
import PageHeader from "../../components/common/PageHeader";
import { EditActionIcon } from "../../components/common/ActionIcons";
import DeleteConfirm from "../../components/common/DeleteConfirm";
import { HRMS_CHART_PALETTE, HRMS_CHART_PRIMARY } from "../../util/chartTheme";
import CreatedDateFilter, { createdRangeParams } from "./CreatedDateFilter";

const { Search } = Input;

/* ─── avatar colour helper ──────────────────────────────────────── */
// Same gradient as the app's primary .add-btn buttons.
const AVATAR_BG = "linear-gradient(178.14deg, #005282 1.57%, #046EAC 115.33%)";
const avatarColor = () => AVATAR_BG;
const initials = (name = "") =>
  name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

const escapeCsvCell = (value) => {
  const stringValue = value == null ? "" : String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const EXPORT_FETCH_LIMIT = 10000;

const personName = (person) =>
  removeTitle(person.full_name || `${person.first_name || ""} ${person.last_name || ""}`.trim()) || "-";

const formatExportDate = (value) => (value && moment(value).isValid() ? moment(value).format("DD-MM-YYYY") : "");

const formatAddress = (address) => {
  if (!address) return "";
  if (typeof address === "string") return address;
  return Object.values(address).filter((part) => part && typeof part !== "object").join(", ");
};

const USER_EXPORT_COLUMNS = [
  { key: "name", label: "Name", value: personName },
  { key: "firstName", label: "First Name", value: (user) => user.first_name || "" },
  { key: "lastName", label: "Last Name", value: (user) => user.last_name || "" },
  { key: "email", label: "Email", value: (user) => user.email || "" },
  { key: "phone", label: "Phone Number", value: (user) => user.phone_number || "" },
  { key: "role", label: "Role", value: (user) => getRoleLabel(user?.pms_role?.role_name) || "N/A" },
  { key: "status", label: "Status", value: (user) => (user.isActivate ? "Active" : "Inactive") },
  { key: "createdAt", label: "Created On", value: (user) => formatExportDate(user.createdAt) },
];

const CLIENT_EXPORT_COLUMNS = [
  { key: "name", label: "Name", value: personName },
  { key: "firstName", label: "First Name", value: (client) => client.first_name || "" },
  { key: "lastName", label: "Last Name", value: (client) => client.last_name || "" },
  { key: "email", label: "Email", value: (client) => client.email || "" },
  { key: "phone", label: "Phone Number", value: (client) => client.phone_number || "" },
  { key: "company", label: "Company", value: (client) => client.company_name || "" },
  { key: "gender", label: "Gender", value: (client) => client.gender || "" },
  { key: "address", label: "Address", value: (client) => formatAddress(client.address) },
  { key: "status", label: "Status", value: (client) => (client.isActivate ? "Active" : "Inactive") },
  { key: "createdAt", label: "Created On", value: (client) => formatExportDate(client.createdAt) },
];

/* ─── Analytics Card ────────────────────────────────────────────── */
const AnalyticsCard = ({ icon, value, label, colorClass }) => (
  <div className="analytics-card">
    <div className={`analytics-card-icon ${colorClass}`}>{icon}</div>
    <div className="analytics-card-body">
      <div className="analytics-card-value">{value}</div>
      <div className="analytics-card-label">{label}</div>
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
const EmployeeMasterList = () => {
  const { search } = useLocation();
  const dispatch = useDispatch(); // kept for child components that use it

  const searchParams = new URLSearchParams(search);
  const paramTab = searchParams.get("tab");

  /* ── sidebar mode ── */
  const [sidebarMode, setSidebarMode] = useState(
    paramTab === "client" ? "clients" : "employees"
  );

  /* ── action refs for hidden child components ── */
  const employeeActionsRef = useRef(null);
  const clientActionsRef = useRef(null);

  /* ── import history modal ── */
  const [importHistoryVisible, setImportHistoryVisible] = useState(false);
  const [clientImportHistoryVisible, setClientImportHistoryVisible] = useState(false);
  const [uploadingEmployeeFile, setUploadingEmployeeFile] = useState(null);
  const [uploadingClientFile, setUploadingClientFile] = useState(null);
  const [recentEmployeeJobId, setRecentEmployeeJobId] = useState(null);
  const [recentClientJobId, setRecentClientJobId] = useState(null);

  /* ── sidebar ui ──
     On narrow/tablet screens the sidebar becomes an absolutely-positioned
     overlay (see the max-width: 900px rule in EmployeeMasterList.css), so
     starting it open there hides the whole page behind it on first load
     with no visible way to tell it needs dismissing. Start collapsed below
     that breakpoint instead. */
  const [sidebarOpen, setSidebarOpen] = useState(
    () => typeof window === "undefined" || window.innerWidth > 900
  );
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState("all");
  const [clientStatusFilter, setClientStatusFilter] = useState("all");
  // Created Date filter: [dayjs, dayjs] | null
  const [employeeCreatedRange, setEmployeeCreatedRange] = useState(null);
  const [clientCreatedRange, setClientCreatedRange] = useState(null);
  const [employeeListPage, setEmployeeListPage] = useState(1);
  const [clientListPage, setClientListPage] = useState(1);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [localSearch, setLocalSearch] = useState("");
  const sidebarPageSize = 25;
  const [employeeInfiniteScroll, setEmployeeInfiniteScroll] = useState({ skip: 0, loadedCount: 0, hasMore: true, isLoadingMore: false });
  // Synchronous guard - prevents concurrent scroll loads before React state can propagate
  const isScrollLoadingRef = useRef(false);

  const [clientInfiniteScroll, setClientInfiniteScroll] = useState({ skip: 0, loadedCount: 0, hasMore: true, isLoadingMore: false });
  const isClientScrollLoadingRef = useRef(false);

  // Stable refs so the scroll handler never captures a stale closure
  const onLoadMoreEmployeesRef = useRef(null);
  const onLoadMoreClientsRef = useRef(null);
  const sidebarModeRef = useRef(sidebarMode);
  useEffect(() => { sidebarModeRef.current = sidebarMode; }, [sidebarMode]);

  const openEmployeeSegment = useCallback((segment) => {
    setSidebarMode("employees");
    setSelectedClientId(null);
    setSelectedUserId(null);
    setEmployeeListPage(1);
    setEmployeeStatusFilter(segment);
    setEmployeeInfiniteScroll({ skip: 0, loadedCount: 0, hasMore: true, isLoadingMore: false });
  }, []);

  /* ── employee favorites ── */
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user_sidebar_favorites") || "[]"); }
    catch { return []; }
  });

  /* ── selection ── */
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);

  const [totalEmployees, setTotalEmployees] = useState(0);
  const [totalClients, setTotalClients] = useState(0);
  const [favoriteUserObjects, setFavoriteUserObjects] = useState([]);

  /* ── employee data ── */
  const [sidebarUsers, setSidebarUsers] = useState([]);
  const [sidebarLoading, setSidebarLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    total: 0, active: 0, inactive: 0, admins: 0,
    roleBreakdown: {}, statusBreakdown: { active: 0, inactive: 0 },
  });
  // Permanent analytics - only updated on unfiltered fetches (no search query).
  // Cards always show the true totals from the API, regardless of what the user types.
  const [permanentAnalytics, setPermanentAnalytics] = useState({
    total: 0, active: 0, inactive: 0, admins: 0,
  });

  /* ── client data ── */
  const [sidebarClients, setSidebarClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientAnalytics, setClientAnalytics] = useState({ total: 0, active: 0, inactive: 0 });

  /* ── fetch employees ───────────────────────────────────────────── */
  const fetchFavoriteUsers = useCallback(async () => {
    if (favorites.length === 0) {
      setFavoriteUserObjects([]);
      return;
    }
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getUsermaster,
        body: { ids: favorites, includeDeactivated: true, limit: favorites.length },
      });
      setFavoriteUserObjects(response?.data?.data || []);
    } catch (e) {
      console.error("fetchFavoriteUsers", e);
    }
  }, [favorites]);

  const fetchSidebarUsers = useCallback(async (skipParam = null) => {
    const isInfiniteScroll = skipParam !== null;
    if (!isInfiniteScroll) setSidebarLoading(true);

    try {
      const body = {
        // pageNo is 1-based; for scroll we derive it from skipParam
        pageNo: isInfiniteScroll ? Math.floor(skipParam / sidebarPageSize) + 1 : employeeListPage,
        limit: sidebarPageSize,
        includeDeactivated: true,
        excludeIds: favorites,
        search: sidebarSearch?.trim(),
        ...(employeeStatusFilter === "active"   ? { isActivate: true }            : {}),
        ...(employeeStatusFilter === "inactive" ? { isActivate: false }           : {}),
        ...(employeeStatusFilter === "admins"   ? { pms_role_id: "admins" }      : {}),
        ...createdRangeParams(employeeCreatedRange),
      };

      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getUsermaster,
        body,
      });

      const users = response?.data?.data || [];
      const meta = response?.data?.metadata || {};
      const total = meta.total || 0;

      if (isInfiniteScroll) {
        // Append new users - use functional updater so we never need loadedCount in deps
        setSidebarUsers(prev => [...prev, ...users]);
        setEmployeeInfiniteScroll(prev => {
          const newLoadedCount = prev.loadedCount + users.length;
          return {
            skip: prev.skip + sidebarPageSize,
            loadedCount: newLoadedCount,
            hasMore: newLoadedCount < total && users.length > 0,
            isLoadingMore: false,
          };
        });
      } else {
        // Fresh / filter-change load - replace the list
        setSidebarUsers(users);
        setEmployeeInfiniteScroll({
          skip: sidebarPageSize,
          loadedCount: users.length,
          hasMore: users.length >= sidebarPageSize && users.length < total,
          isLoadingMore: false,
        });
      }

      setTotalEmployees(total);
      setAnalytics(prev => ({
        ...prev,
        total: total + favorites.length,
        active: meta.active || 0,
        inactive: meta.inactive || 0,
        admins: meta.admins || 0,
      }));
      // Only lock in the card numbers when we’re NOT searching -
      // cards should always reflect the true full dataset, not a filtered view.
      if (!sidebarSearch && !employeeCreatedRange) {
        setPermanentAnalytics({
          total: total + favorites.length,
          active: meta.active || 0,
          inactive: meta.inactive || 0,
          admins: meta.admins || 0,
        });
      }

    } catch (e) {
      console.error("fetchSidebarUsers", e);
      if (isInfiniteScroll) {
        setEmployeeInfiniteScroll(prev => ({ ...prev, isLoadingMore: false }));
      }
    } finally {
      // Always release the synchronous guard so the next scroll can trigger a load
      isScrollLoadingRef.current = false;
      if (!isInfiniteScroll) {
        setSidebarLoading(false);
        setPageLoading(false);
      }
    }
    // ⚠️  Do NOT add employeeInfiniteScroll (or any part of it) here - it would cause a
    //     recursive re-fetch loop: loadedCount changes → new fn → useEffect fires → fresh reload.
  }, [employeeStatusFilter, employeeCreatedRange, favorites, sidebarSearch, sidebarPageSize, employeeListPage]);

  const onLoadMoreEmployees = useCallback(() => {
    // isScrollLoadingRef is a synchronous guard - blocks concurrent calls even before
    // React's async state update for isLoadingMore can propagate to the next render.
    if (isScrollLoadingRef.current || !employeeInfiniteScroll.hasMore) return;
    isScrollLoadingRef.current = true;
    setEmployeeInfiniteScroll(prev => ({ ...prev, isLoadingMore: true }));
    fetchSidebarUsers(employeeInfiniteScroll.skip);
  }, [employeeInfiniteScroll.hasMore, employeeInfiniteScroll.skip, fetchSidebarUsers]);

  // Keep the ref in sync so the scroll handler always calls the latest version
  useEffect(() => { onLoadMoreEmployeesRef.current = onLoadMoreEmployees; }, [onLoadMoreEmployees]);


  /* ── fetch clients ─────────────────────────────────────────────── */
  const fetchSidebarClients = useCallback(async (skipParam = null) => {
    const isInfiniteScroll = skipParam !== null;
    if (!isInfiniteScroll) setClientsLoading(true);

    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.clientlist,
        body: {
          pageNo: isInfiniteScroll ? Math.floor(skipParam / sidebarPageSize) + 1 : 1,
          limit: sidebarPageSize,
          search: sidebarSearch?.trim(),
          ...(clientStatusFilter === "active" ? { isActivate: true } : {}),
          ...(clientStatusFilter === "inactive" ? { isActivate: false } : {}),
          ...createdRangeParams(clientCreatedRange),
        },
      });

      const clients = response?.data?.data || [];
      const meta = response?.data?.metadata || {};
      const total = meta.total || 0;

      if (isInfiniteScroll) {
        setSidebarClients(prev => [...prev, ...clients]);
        setClientInfiniteScroll(prev => {
          const newLoadedCount = prev.loadedCount + clients.length;
          return {
            skip: prev.skip + sidebarPageSize,
            loadedCount: newLoadedCount,
            hasMore: newLoadedCount < total && clients.length > 0,
            isLoadingMore: false,
          };
        });
      } else {
        setSidebarClients(clients);
        setClientInfiniteScroll({
          skip: sidebarPageSize,
          loadedCount: clients.length,
          hasMore: clients.length >= sidebarPageSize && clients.length < total,
          isLoadingMore: false,
        });
      }

      setTotalClients(total);
      setClientAnalytics({
        // the cards show the whole client base, whichever status the sidebar list is filtered to
        total: clientStatusFilter === "all" && !clientCreatedRange ? total : (meta.active || 0) + (meta.inactive || 0),
        active: meta.active || 0,
        inactive: meta.inactive || 0,
      });
    } catch { /* silent */ }
    finally {
      isClientScrollLoadingRef.current = false;
      if (!isInfiniteScroll) setClientsLoading(false);
    }
    // No clientInfiniteScroll in deps - same reason as employees: it would cause re-fetch loops
  }, [sidebarPageSize, sidebarSearch, clientStatusFilter, clientCreatedRange]);

  const onLoadMoreClients = useCallback(() => {
    if (isClientScrollLoadingRef.current || !clientInfiniteScroll.hasMore) return;
    isClientScrollLoadingRef.current = true;
    setClientInfiniteScroll(prev => ({ ...prev, isLoadingMore: true }));
    fetchSidebarClients(clientInfiniteScroll.skip);
  }, [clientInfiniteScroll.hasMore, clientInfiniteScroll.skip, fetchSidebarClients]);

  // Keep the ref in sync with the latest version of the callback
  useEffect(() => { onLoadMoreClientsRef.current = onLoadMoreClients; }, [onLoadMoreClients]);

  /* ── Scroll detection - single listener on the sidebar container -──
     With deps=[], the effect fires on the very first render while pageLoading=true.
     At that point the component returns <UsersPageSkeleton> so the real
     sidebar-user-list div is NOT in the DOM and getElementById returns null.
     Depending on [pageLoading] causes the effect to re-run exactly once when the
     skeleton transitions to the real sidebar.                                    */
  useEffect(() => {
    if (pageLoading) return; // sidebar not in DOM yet

    const container = document.getElementById("sidebar-user-list");
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollTop + clientHeight >= scrollHeight * 0.85) {
        if (sidebarModeRef.current === "employees") {
          onLoadMoreEmployeesRef.current?.();
        } else {
          onLoadMoreClientsRef.current?.();
        }
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageLoading]); // re-runs once: pageLoading true→false




  useEffect(() => { fetchSidebarUsers(); }, [fetchSidebarUsers]);
  useEffect(() => { fetchSidebarClients(); }, [fetchSidebarClients]);
  useEffect(() => { fetchFavoriteUsers(); }, [fetchFavoriteUsers]);

  /* ── analytics from employee list ─────────────────────────────── */
  const computeAnalytics = (users) => {
    const roleBreakdown = {};
    let active = 0, inactive = 0, admins = 0;
    users.forEach((u) => {
      if (u.isActivate) active++; else inactive++;
      const role = getRoleLabel(u?.pms_role?.role_name) || "N/A";
      roleBreakdown[role] = (roleBreakdown[role] || 0) + 1;
      if (role.toLowerCase().includes("admin")) admins++;
    });
    setAnalytics({ total: users.length, active, inactive, admins, roleBreakdown, statusBreakdown: { active, inactive } });
  };

  /* ── favorites ─────────────────────────────────────────────────── */
  const toggleFavorite = (e, id) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem("user_sidebar_favorites", JSON.stringify(next));
      return next;
    });
  };

  /* ── filtered lists ────────────────────────────────────────────── */
  const filteredUsers = sidebarUsers;
  const filteredClients = sidebarClients;

  const [globalStats, setGlobalStats] = useState(null);
  // Pie/donut charts size from this height; a 440px chart is wider than a phone card.
  const [chartHeight, setChartHeight] = useState(() =>
    typeof window !== "undefined" && window.innerWidth <= 575 ? 300 : 440
  );
  useEffect(() => {
    const onResize = () => setChartHeight(window.innerWidth <= 575 ? 300 : 440);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const fetchGlobalStats = useCallback(async () => {
    try {
      const res = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: "/dashboard/get/global-team-report",
      });
      if (res?.data?.data) {
        setGlobalStats(res.data.data);
      }
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    if (!selectedUserId && !selectedClientId) {
      fetchGlobalStats();
    }
  }, [selectedUserId, selectedClientId, fetchGlobalStats]);

  /* ── auto-search debounce ────────────────────────────────────── */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== sidebarSearch) {
        setSidebarSearch(localSearch);
        setEmployeeListPage(1);
        setEmployeeInfiniteScroll({ skip: 0, loadedCount: 0, hasMore: true, isLoadingMore: false });
        isScrollLoadingRef.current = false;
        // Also reset client scroll so a fresh load fires
        setClientInfiniteScroll({ skip: 0, loadedCount: 0, hasMore: true, isLoadingMore: false });
        isClientScrollLoadingRef.current = false;
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [localSearch, sidebarSearch]);



  const downloadCsvFile = useCallback((rows, fileName) => {
    if (!rows.length) return;
    const csvContent = rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, []);

  const { requestExport, exportColumnsModal } = useExportColumns();

  // Exports cover everyone matching the current search/status filter - not just
  // the rows the sidebar has scrolled in so far.
  const fetchAllForExport = useCallback(async (apiUrl, body) => {
    const response = await Service.makeAPICall({
      methodName: Service.postMethod,
      api_url: apiUrl,
      body: { pageNo: 1, limit: EXPORT_FETCH_LIMIT, search: sidebarSearch?.trim(), ...body },
    });
    return response?.data?.data || [];
  }, [sidebarSearch]);

  // Role Distribution / Employee Status come from the complete employee list, not just the page the
  // hidden list happens to hold (that page held no admins, so they were missing from the chart)
  const refreshRoleAnalytics = useCallback(async () => {
    try {
      const items = await fetchAllForExport(Service.getUsermaster, { includeDeactivated: true, search: "" });
      computeAnalytics(items);
    } catch (e) {
      console.error("role analytics", e);
    }
  }, [fetchAllForExport]);

  useEffect(() => { refreshRoleAnalytics(); }, [refreshRoleAnalytics]);

  const runExport = useCallback(async (columns, keys, loadItems, fileName) => {
    const hide = message.loading("Preparing export...", 0);
    try {
      const items = await loadItems();
      if (!items.length) {
        message.warning("No data available to download");
        return;
      }
      const { headers, rows } = buildExportRows(columns, keys, items);
      downloadCsvFile([headers, ...rows], fileName);
    } catch (e) {
      console.error("export", e);
      message.error("Export failed, please try again");
    } finally {
      hide();
    }
  }, [downloadCsvFile]);

  const exportEmployeesCsv = useCallback(() => {
    requestExport({
      title: "Select Columns for Employee Export",
      columns: toExportOptions(USER_EXPORT_COLUMNS),
      onExport: (keys) =>
        runExport(USER_EXPORT_COLUMNS, keys, () => fetchAllForExport(Service.getUsermaster, {
          includeDeactivated: true,
          ...(employeeStatusFilter === "active" ? { isActivate: true } : {}),
          ...(employeeStatusFilter === "inactive" ? { isActivate: false } : {}),
          ...(employeeStatusFilter === "admins" ? { pms_role_id: "admins" } : {}),
          ...createdRangeParams(employeeCreatedRange),
        }), "Employees.csv"),
    });
  }, [requestExport, runExport, fetchAllForExport, employeeStatusFilter, employeeCreatedRange]);

  const exportClientsCsv = useCallback(() => {
    requestExport({
      title: "Select Columns for Client Export",
      columns: toExportOptions(CLIENT_EXPORT_COLUMNS),
      onExport: (keys) =>
        runExport(CLIENT_EXPORT_COLUMNS, keys, () => fetchAllForExport(Service.clientlist, createdRangeParams(clientCreatedRange)), "Clients.csv"),
    });
  }, [requestExport, runExport, fetchAllForExport, clientCreatedRange]);

  const favoriteUsers = favoriteUserObjects;
  const regularUsers = sidebarUsers;
  const paginatedRegularUsers = sidebarUsers;
  const paginatedClients = sidebarClients;

  // When searching, filter favourites client-side so the list stays consistent.
  // Favourites are fetched without a search term, so without this the section
  // stays visible even when no results match - giving the impression of stale data.
  const displayFavoriteUsers = sidebarSearch.trim()
    ? favoriteUsers.filter(u => {
      const name = (u.full_name || `${u.first_name || ""} ${u.last_name || ""}`.trim()).toLowerCase();
      const email = (u.email || "").toLowerCase();
      const q = sidebarSearch.trim().toLowerCase();
      return name.includes(q) || email.includes(q);
    })
    : favoriteUsers;

  const filteredClientAnalytics = React.useMemo(() => {
    const companyBreakdown = {};
    let active = 0;
    let inactive = 0;

    filteredClients.forEach((client) => {
      if (client.isActivate) active++;
      else inactive++;

      const companyName = client.company_name?.trim() || "No Company";
      companyBreakdown[companyName] = (companyBreakdown[companyName] || 0) + 1;
    });

    return {
      total: filteredClients.length,
      active,
      inactive,
      companyBreakdown,
      statusBreakdown: { active, inactive },
    };
  }, [filteredClients]);

  useEffect(() => {
    if (selectedClientId && !filteredClients.some((c) => c._id === selectedClientId)) {
      setSelectedClientId(null);
    }
  }, [filteredClients, selectedClientId]);

  useEffect(() => {
    setEmployeeListPage(1);
    // Reset client infinite scroll when switching sidebar tabs
    setClientInfiniteScroll({ skip: 0, loadedCount: 0, hasMore: true, isLoadingMore: false });
    isClientScrollLoadingRef.current = false;
  }, [sidebarMode]);

  // Page validation effects can be removed if handled by API safely or reset logic above


  /* ── selected objects ──────────────────────────────────────────── */
  const allSidebarUsers = [
    ...(Array.isArray(sidebarUsers) ? sidebarUsers : []),
    ...(Array.isArray(favoriteUserObjects) ? favoriteUserObjects : []),
  ];
  const selectedUserFromList = selectedUserId
    ? allSidebarUsers.find((u) => String(u?._id) === String(selectedUserId))
    : null;
  const selectedUser = selectedUserDetails || selectedUserFromList || null;
  const selectedClient = selectedClientId ? sidebarClients.find((c) => c._id === selectedClientId) : null;

  useEffect(() => {
    const fetchSelectedUserDetails = async () => {
      if (!selectedUserId) {
        setSelectedUserDetails(null);
        return;
      }
      try {
        const response = await Service.makeAPICall({
          methodName: Service.getMethod,
          api_url: `${Service.getUsermaster}/${selectedUserId}`,
        });
        const data = response?.data?.data;
        const userDetails = Array.isArray(data) ? data[0] : data;
        if (userDetails?._id) {
          setSelectedUserDetails(userDetails);
        } else {
          setSelectedUserDetails(selectedUserFromList || null);
        }
      } catch (e) {
        setSelectedUserDetails(selectedUserFromList || null);
      }
    };
    fetchSelectedUserDetails();
  }, [selectedUserId, selectedUserFromList]);

  const displayName = sidebarMode === "employees"
    ? (selectedUser
      ? removeTitle(selectedUser.full_name || `${selectedUser.first_name || ""} ${selectedUser.last_name || ""}`)
      : employeeStatusFilter === "active"
        ? "Active Employees"
        : employeeStatusFilter === "inactive"
          ? "Inactive Employees"
          : employeeStatusFilter === "admins"
            ? "Admins"
            : "All Employees")
    : (selectedClient
      ? removeTitle(selectedClient.full_name || `${selectedClient.first_name || ""} ${selectedClient.last_name || ""}`)
      : "All Clients");

  /* ── chart configs ─────────────────────────────────────────────── */
  const userStatusMax = Math.max(
    Math.ceil(Math.max(analytics?.statusBreakdown?.active || 0, analytics?.statusBreakdown?.inactive || 0, 1) * 1.35),
    5
  );
  const clientStatusMax = Math.max(
    Math.ceil(Math.max(filteredClientAnalytics?.statusBreakdown?.active || 0, filteredClientAnalytics?.statusBreakdown?.inactive || 0, 1) * 1.35),
    5
  );

  const donutOptions = React.useMemo(() => ({
    chart: {
      type: "donut",
      fontFamily: "inherit",
      animations: { enabled: false },
    },
    labels: ["No Data"],
    colors: HRMS_CHART_PALETTE,
    legend: {
      show: true,
      position: "bottom",
      horizontalAlign: "center",
      offsetY: 28,
      fontSize: "13px",
      fontWeight: 400,
      labels: { useSeriesColors: true },
      markers: { size: 6, shape: "square", radius: 0, offsetX: -4 },
      itemMargin: { horizontal: 8, vertical: 5 },
      formatter: (seriesName, opts) => {
        const val = opts?.w?.globals?.series?.[opts.seriesIndex];
        return val != null ? `${seriesName} (${val})` : seriesName;
      },
      onItemClick: { toggleDataSeries: false },
      onItemHover: { highlightDataSeries: false },
    },
    plotOptions: {
      pie: {
        offsetY: -16,
        donut: {
          size: "68%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Total Employees",
              fontSize: "13px",
              fontWeight: 600,
              color: "#787878",
              formatter: (w) => w.globals.seriesTotals.reduce((a, b) => a + b, 0),
            },
            value: {
              fontSize: "26px",
              fontWeight: 700,
              color: "#005282",
              offsetY: 2,
            },
          },
        },
      },
    },
    dataLabels: { enabled: false },
    stroke: { width: 2, colors: ["#ffffff"] },
    states: {
      active: { filter: { type: "none" } },
      hover: { filter: { type: "none" } },
    },
    tooltip: { y: { formatter: (v) => `${v} users` } },
  }), []);

  const barOptions = React.useMemo(() => ({
    chart: {
      type: "bar",
      fontFamily: "inherit",
      toolbar: { show: false },
      sparkline: { enabled: false },
    },
    plotOptions: {
      bar: {
        borderRadius: 8,
        horizontal: false,
        columnWidth: "38%",
        distributed: true,
        dataLabels: {
          position: "top",
        },
      },
    },
    colors: [HRMS_CHART_PRIMARY, "#8c8c8c"],
    xaxis: {
      categories: ["Active", "Inactive"],
      labels: {
        style: { fontSize: "14px", fontWeight: 600, colors: ["#262626", "#787878"] },
      },
      axisBorder: { show: true, color: "#e8e8e8" },
      axisTicks: { show: false },
    },
    yaxis: {
      min: 0,
      max: userStatusMax,
      tickAmount: 5,
      labels: {
        style: { fontSize: "12px", colors: "#787878" },
        formatter: (val) => Math.round(val),
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (v) => (v > 0 ? `${v} users` : ""),
      style: { fontSize: "13px", fontWeight: 700, colors: [HRMS_CHART_PRIMARY] },
      offsetY: -22,
    },
    legend: { show: false },
    grid: {
      borderColor: "#f5f5f5",
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      padding: {
        top: 24,
        right: 20,
        bottom: 10,
        left: 20,
      },
    },
    tooltip: { y: { formatter: (v) => `${v} users` } },
  }), [userStatusMax]);

  // Role Distribution / Employee Status charts always reflect the complete user
  // dataset (analytics, filled in once by the hidden full-list loader) rather
  // than sidebarUsers, which loads incrementally via infinite scroll - so the
  // overview shows the true global picture immediately instead of changing as
  // more users load in.
  const userRoleSeries = React.useMemo(
    () => Object.values(analytics.roleBreakdown || {}),
    [analytics.roleBreakdown]
  );
  const userRoleLabels = React.useMemo(
    () => Object.keys(analytics.roleBreakdown || {}),
    [analytics.roleBreakdown]
  );
  const userRoleOptions = React.useMemo(
    () => ({ ...donutOptions, labels: userRoleLabels }),
    [donutOptions, userRoleLabels]
  );
  const userStatusSeries = React.useMemo(
    () => [{ name: "Employees", data: [analytics.statusBreakdown.active, analytics.statusBreakdown.inactive] }],
    [analytics.statusBreakdown]
  );

  const clientCompanySeries = React.useMemo(
    () => Object.values(filteredClientAnalytics.companyBreakdown || {}),
    [filteredClientAnalytics.companyBreakdown]
  );
  const clientCompanyLabels = React.useMemo(
    () => Object.keys(filteredClientAnalytics.companyBreakdown || {}),
    [filteredClientAnalytics.companyBreakdown]
  );
  const clientCompanyOptions = React.useMemo(
    () => ({
      ...donutOptions,
      labels: clientCompanyLabels,
      tooltip: { y: { formatter: (v) => `${v} clients` } },
    }),
    [donutOptions, clientCompanyLabels]
  );
  const clientStatusSeries = React.useMemo(
    () => [{
      name: "Clients",
      data: [filteredClientAnalytics.statusBreakdown.active, filteredClientAnalytics.statusBreakdown.inactive],
    }],
    [filteredClientAnalytics.statusBreakdown]
  );
  const clientStatusOptions = React.useMemo(
    () => ({
      ...barOptions,
      yaxis: { ...barOptions.yaxis, max: clientStatusMax },
      dataLabels: { ...barOptions.dataLabels, formatter: (v) => (v > 0 ? `${v} clients` : "") },
      tooltip: { y: { formatter: (v) => `${v} clients` } },
    }),
    [barOptions, clientStatusMax]
  );

  /* ── sidebar employee item ─────────────────────────────────────── */
  // Plain render functions, not components: a component declared inside this
  // render is a new type every render, so React would remount every row (and
  // re-measure every avatar) on each click.
  const renderUserItem = (user) => {
    const name = removeTitle(user.full_name || `${user.first_name || ""} ${user.last_name || ""}`);
    const role = getRoleLabel(user?.pms_role?.role_name) || "";
    const isActive = selectedUserId === user._id;
    const isFav = favorites.includes(user._id);
    const bg = avatarColor(name);
    return (
      <div
        key={user._id}
        className={`sidebar-user-item ${isActive ? "active" : ""}`}
        onClick={() => {
          setSelectedUserId(user._id);
          if (window.innerWidth <= 900) setSidebarOpen(false);
        }}
      >
        <div className="sidebar-avatar-wrap">
          <Avatar size={34} style={{ background: bg, fontSize: 13, fontWeight: 600 }}>
            <span className="avatar-initials">{initials(name)}</span>
          </Avatar>
          <span className={`sidebar-status-dot ${user.isActivate ? "online" : "offline"}`} />
        </div>
        <div className="sidebar-user-info">
          <span className="sidebar-user-name">{name || "-"}</span>
          {role && <span className="sidebar-user-role">{role}</span>}
        </div>
        <button
          className={`sidebar-star-btn ${isFav ? "starred" : ""}`}
          onClick={(e) => toggleFavorite(e, user._id)}
          title={isFav ? "Remove from favourites" : "Add to favourites"}
        >
          {isFav ? <StarFilled /> : <StarOutlined />}
        </button>
        {(can("people_edit") || can("people_delete")) && (
          <Dropdown
            trigger={["click"]}
            placement="bottomRight"
            menu={{
              items: [
                ...(can("people_edit") ? [{ key: "edit", label: "Edit" }] : []),
                ...(can("people_delete")
                  ? [{
                      key: "delete",
                      label: (
                        <DeleteConfirm
                          title="Delete this user?"
                          placement="left"
                          onConfirm={async () => {
                            await employeeActionsRef.current?.deleteEmployee(user._id);
                            if (selectedUserId === user._id) setSelectedUserId(null);
                            fetchSidebarUsers();
                          }}
                        >
                          <DeleteConfirm.MenuLabel />
                        </DeleteConfirm>
                      ),
                    }]
                  : []),
              ],
              onClick: ({ key, domEvent }) => {
                domEvent?.stopPropagation?.();
                if (key === "edit") employeeActionsRef.current?.openEditModal(user);
              },
            }}
          >
            <button
              type="button"
              className="sidebar-more-btn"
              title="More"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreOutlined />
            </button>
          </Dropdown>
        )}
      </div>
    );
  };

  /* ── sidebar client item ───────────────────────────────────────── */
  const renderClientItem = (client) => {
    const name = removeTitle(client.full_name || `${client.first_name || ""} ${client.last_name || ""}`);
    const company = client.company_name || "";
    const isActive = selectedClientId === client._id;
    const bg = avatarColor(name);
    return (
      <div
        key={client._id}
        className={`sidebar-user-item ${isActive ? "active" : ""}`}
        onClick={() => {
          setSelectedClientId(client._id);
          if (window.innerWidth <= 900) setSidebarOpen(false);
        }}
      >
        <div className="sidebar-avatar-wrap">
          <Avatar size={34} style={{ background: bg, fontSize: 13, fontWeight: 600 }}>
            <span className="avatar-initials">{initials(name)}</span>
          </Avatar>
          <span className={`sidebar-status-dot ${client.isActivate ? "online" : "offline"}`} />
        </div>
        <div className="sidebar-user-info">
          <span className="sidebar-user-name">{name || "-"}</span>
          {company && <span className="sidebar-user-role">{company}</span>}
        </div>
      </div>
    );
  };

  /* ── render ─────────────────────────────────────────────────────── */
  if (pageLoading) return <UsersPageSkeleton />;

  return (
    <div className="users-page">
      <PageHeader title={sidebarMode === "clients" ? "Clients" : "Users"}>
          <button
            className="sidebar-toggle-btn"
            onClick={() => setSidebarOpen((p) => !p)}
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
          </button>
          {/* Employee header actions */}
          {sidebarMode === "employees" && !selectedUser && (
            <div className="dashboard-header-actions">
              <Tooltip title="Export CSV">
                <Button className="btn-secondary" onClick={exportEmployeesCsv}>
                  <DownloadOutlined /> <span>Export CSV</span>
                </Button>
              </Tooltip>
              {can("people_add") && (
              <Dropdown
                trigger={["click"]}
                menu={{
                  items: [
                    { key: "sample", label: "Sample CSV" },
                    { key: "import", label: "Import CSV" },
                    { key: "history", label: "Import History" },
                  ],
                  onClick: ({ key }) => {
                    if (key === "sample") employeeActionsRef.current?.exportSampleCSV();
                    if (key === "import") employeeActionsRef.current?.triggerImport();
                    if (key === "history") setImportHistoryVisible(true);
                  },
                }}
              >
                <Button className="btn-secondary">
                  <span>Import</span> <DownOutlined />
                </Button>
              </Dropdown>
              )}
              {can("people_add") && (
              <Button type="primary" className="add-btn" onClick={() => employeeActionsRef.current?.openAddModal()}>
                <PlusOutlined /> <span>Employee</span>
              </Button>
              )}
            </div>
          )}

          {/* Employee header actions - when an employee is selected */}
          {sidebarMode === "employees" && selectedUser && (
            <div className="dashboard-header-actions">
              <Button
                className="header-action-btn"
                icon={<ArrowLeftOutlined />}
                onClick={() => setSelectedUserId(null)}
                title="Back to employees overview"
              >
                Overview
              </Button>
            </div>
          )}

          {/* Client header actions - overview */}
          {sidebarMode === "clients" && !selectedClient && (
            <div className="dashboard-header-actions">
              <Tooltip title="Export CSV">
                <Button className="header-action-btn" onClick={exportClientsCsv}>
                  <DownloadOutlined /> <span>Export CSV</span>
                </Button>
              </Tooltip>
              {can("people_add") && (
              <Dropdown
                trigger={["click"]}
                menu={{
                  items: [
                    { key: "sample", label: "Sample CSV" },
                    { key: "import", label: "Import CSV" },
                    { key: "history", label: "Import History" },
                  ],
                  onClick: ({ key }) => {
                    if (key === "sample") clientActionsRef.current?.exportSampleCSV();
                    if (key === "import") clientActionsRef.current?.triggerImport();
                    if (key === "history") setClientImportHistoryVisible(true);
                  },
                }}
              >
                <Button type="primary" className="add-btn header-import-btn">
                  <span>Import</span> <DownOutlined />
                </Button>
              </Dropdown>
              )}
              {can("people_add") && (
              <Button type="primary" className="add-btn" onClick={() => clientActionsRef.current?.openAddModal()}>
                <PlusOutlined /> <span>Client</span>
              </Button>
              )}
            </div>
          )}

          {/* Client header actions - when a client is selected */}
          {sidebarMode === "clients" && selectedClient && can("people_edit") && (
            <div className="dashboard-header-actions">
              <Button
                className="header-action-btn"
                icon={<ArrowLeftOutlined />}
                onClick={() => setSelectedClientId(null)}
                title="Back to clients overview"
              >
                Overview
              </Button>
              <Button
                className="add-btn"
                type="primary"
                icon={<EditActionIcon />}
                onClick={() => clientActionsRef.current?.openEditModal(selectedClient._id)}
              >
                Edit Client
              </Button>
            </div>
          )}
      </PageHeader>
    <div className="users-workspace">
      {exportColumnsModal}

      {/* Only visible (via CSS) once the sidebar becomes an overlay on
          narrow screens, so there's an obvious way to dismiss it. */}
      {sidebarOpen && (
        <div
          className="users-sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ══════════ LEFT SIDEBAR ══════════ */}
      <aside className={`users-sidebar-panel ${sidebarOpen ? "" : "collapsed"}`}>
        <div className="sidebar-panel-header">
          {/* Employees / Clients toggle */}
          <div className="sidebar-mode-toggle">
            <button
              className={`sidebar-mode-btn ${sidebarMode === "employees" ? "active" : ""}`}
              onClick={() => {
                setSidebarMode("employees");
                setSelectedClientId(null);
                setSelectedUserId(null);
                setEmployeeStatusFilter("all");
              }}
            >
              Employees
            </button>
            <button
              className={`sidebar-mode-btn ${sidebarMode === "clients" ? "active" : ""}`}
              onClick={() => {
                setSidebarMode("clients");
                setSelectedUserId(null);
                setSelectedClientId(null);
              }}
            >
              Clients
            </button>
          </div>

          {sidebarMode === "employees" && (
            <div className="sidebar-filter-row">
              <Select
                className="sidebar-status-filter"
                value={employeeStatusFilter}
                onChange={(value) => {
                  setEmployeeStatusFilter(value);
                  setEmployeeInfiniteScroll({ skip: 0, loadedCount: 0, hasMore: true, isLoadingMore: false });
                }}
                options={[
                  { label: "All Status", value: "all" },
                  { label: "Active", value: "active" },
                  { label: "Inactive", value: "inactive" },
                  { label: "Admins", value: "admins" },
                ]}
              />
              <CreatedDateFilter
                value={employeeCreatedRange}
                onApply={(range) => {
                  setEmployeeCreatedRange(range);
                  setEmployeeListPage(1);
                  setEmployeeInfiniteScroll({ skip: 0, loadedCount: 0, hasMore: true, isLoadingMore: false });
                }}
              />
            </div>
          )}

          {sidebarMode === "clients" && (
            <div className="sidebar-filter-row">
              <Select
                className="sidebar-status-filter"
                value={clientStatusFilter}
                onChange={(value) => {
                  setClientStatusFilter(value);
                  setClientInfiniteScroll({ skip: 0, loadedCount: 0, hasMore: true, isLoadingMore: false });
                }}
                options={[
                  { label: "All Status", value: "all" },
                  { label: "Active", value: "active" },
                  { label: "Inactive", value: "inactive" },
                ]}
              />
              <CreatedDateFilter
                value={clientCreatedRange}
                onApply={(range) => {
                  setClientCreatedRange(range);
                  setClientInfiniteScroll({ skip: 0, loadedCount: 0, hasMore: true, isLoadingMore: false });
                }}
              />
            </div>
          )}
        </div>

        <div id="sidebar-user-list" className="sidebar-user-list">
          <Spin spinning={sidebarLoading || clientsLoading} tip="Loading...">
            <div style={{ minHeight: "200px" }}>
              {sidebarMode === "employees" ? (
                <>
                  {/* Search Bar */}
                  <div className="sidebar-search-container" style={{ padding: "8px 16px" }}>
                    <Search
                      placeholder="Search users..."
                      allowClear
                      value={localSearch}
                      onChange={(e) => {
                        setLocalSearch(e.target.value);
                      }}
                      className="sidebar-search-input"
                    />
                  </div>

                  {displayFavoriteUsers.length > 0 && (
                    <>
                      <div className="sidebar-section-label">Favourites</div>
                      {displayFavoriteUsers.map(renderUserItem)}
                    </>
                  )}

                  {regularUsers.length > 0 && (
                    <>
                      {displayFavoriteUsers.length > 0 && (
                        <div className="sidebar-section-label">All Members</div>
                      )}
                      {/* Plain list - scroll is detected by the useEffect listener above */}
                      {paginatedRegularUsers.map(renderUserItem)}
                      {employeeInfiniteScroll.isLoadingMore && (
                        <div style={{ padding: "12px", textAlign: "center" }}>
                          <Spin size="small" />
                        </div>
                      )}
                    </>
                  )}

                  {!sidebarLoading && filteredUsers.length === 0 && displayFavoriteUsers.length === 0 && (
                    <div className="sidebar-empty-wrap">
                      <div className="sidebar-empty-icon">
                        <NoDataFoundIcon />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Search Bar */}
                  <div className="sidebar-search-container" style={{ padding: "8px 16px" }}>
                    <Search
                      placeholder="Search clients..."
                      allowClear
                      value={localSearch}
                      onChange={(e) => {
                        setLocalSearch(e.target.value);
                      }}
                      className="sidebar-search-input"
                    />
                  </div>

                  {/* Plain list - same scroll listener handles clients */}
                  {paginatedClients.map((c) => (
                    renderClientItem(c)
                  ))}
                  {clientInfiniteScroll.isLoadingMore && (
                    <div style={{ padding: "12px", textAlign: "center" }}>
                      <Spin size="small" />
                    </div>
                  )}

                  {!clientsLoading && filteredClients.length === 0 && (
                    <div className="sidebar-empty-wrap">
                      <div className="sidebar-empty-icon">
                        <NoDataFoundIcon />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </Spin>
        </div>
      </aside>

      {/* ══════════ RIGHT DASHBOARD ══════════ */}
      <div className="users-dashboard-area">

        {/* ── Content ── */}

        {/* Employee detail */}
        {sidebarMode === "employees" && selectedUser ? (
          <UserDashboard user={selectedUser} />

          /* Client detail */
        ) : sidebarMode === "clients" && selectedClient ? (
          <div className="dashboard-content">
            <div className="client-detail-card">
              <div className="client-detail-header">
                <Avatar
                  size={64}
                  style={{ background: avatarColor(displayName), fontSize: 24, fontWeight: 700, flexShrink: 0 }}
                >
                  <span className="avatar-initials avatar-initials-lg">{initials(displayName)}</span>
                </Avatar>
                <div>
                  <div className="client-detail-name">{displayName}</div>
                  <div className="client-detail-company">{selectedClient.company_name || "-"}</div>
                  <span className={`client-detail-status ${selectedClient.isActivate ? "active" : "inactive"}`}>
                    {selectedClient.isActivate ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              <div className="client-detail-fields">
                <div className="client-detail-field">
                  <MailOutlined className="client-field-icon" />
                  <div>
                    <div className="client-field-label">Email</div>
                    <div className="client-field-value">{selectedClient.email || "-"}</div>
                  </div>
                </div>
                <div className="client-detail-field">
                  <PhoneOutlined className="client-field-icon" />
                  <div>
                    <div className="client-field-label">Phone</div>
                    <div className="client-field-value">{selectedClient.phone_number || "-"}</div>
                  </div>
                </div>
                <div className="client-detail-field">
                  <BankOutlined className="client-field-icon" />
                  <div>
                    <div className="client-field-label">Company</div>
                    <div className="client-field-value">{selectedClient.company_name || "-"}</div>
                  </div>
                </div>
                {selectedClient.extra_details && (
                  <div className="client-detail-field">
                    <UserOutlined className="client-field-icon" />
                    <div>
                      <div className="client-field-label">Extra Info</div>
                      <div className="client-field-value">{selectedClient.extra_details}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          /* Analytics overview */
        ) : (
          <div className="dashboard-content">

            {sidebarMode === "employees" ? (
              <>
                <div className="analytics-cards-grid">
                  <AnalyticsCard
                    icon={<TeamOutlined />}
                    value={globalStats?.employees?.total ?? permanentAnalytics.total}
                    label="Total Employees"
                    colorClass="blue"
                  />
                  <AnalyticsCard
                    icon={<CheckCircleOutlined />}
                    value={globalStats?.employees?.active ?? permanentAnalytics.active}
                    label="Active"
                    colorClass="blue-active"
                  />
                  <AnalyticsCard
                    icon={<CloseCircleOutlined />}
                    value={globalStats?.employees?.inactive ?? permanentAnalytics.inactive}
                    label="Inactive"
                    colorClass="blue-inactive"
                  />
                  <AnalyticsCard
                    icon={<CrownOutlined />}
                    value={globalStats?.employees?.admins ?? permanentAnalytics.admins}
                    label="Admins"
                    colorClass="blue-admin"
                  />
                </div>

                {/* {globalStats?.tasks && (
                  <>
                    <div className="sidebar-section-label" style={{ marginTop: 24, marginBottom: 12, fontSize: 16 }}>Task Report Overview</div>
                    <div className="analytics-cards-grid">
                      <AnalyticsCard
                        icon={<FileDoneOutlined />}
                        value={(globalStats.tasks?.total ?? 0)}
                        label="Total Tasks"
                        colorClass="blue"
                      />
                      <AnalyticsCard
                        icon={<CheckCircleOutlined />}
                        value={(globalStats.tasks?.completed ?? 0)}
                        label="Completed Tasks"
                        colorClass="blue-active"
                      />
                      <AnalyticsCard
                        icon={<ClockCircleFilled />}
                        value={(globalStats.tasks?.incomplete ?? 0)}
                        label="Incomplete Tasks"
                        colorClass="blue-inactive"
                      />
                    </div>
                  </>
                )} */}

                <div className="analytics-charts-section" style={{ marginTop: 28 }}>
                  {analytics.total > 0 ? (
                    <div className="charts-section">
                      <div className="chart-card">
                        <div className="chart-card-title">Role Distribution</div>
                        {Object.keys(analytics.roleBreakdown || {}).length === 0 ? (
                          <div style={{ height: 440, display: "flex", alignItems: "center", justifyContent: "center" }}><Spin /></div>
                        ) : (
                          <ReactApexChart
                            type="donut"
                            series={userRoleSeries}
                            options={userRoleOptions}
                            height={chartHeight}
                          />
                        )}
                      </div>
                      <div className="chart-card">
                        <div className="chart-card-title">Employee Status</div>
                        {(analytics.statusBreakdown.active === 0 && analytics.statusBreakdown.inactive === 0) ? (
                          <div style={{ height: 440, display: "flex", alignItems: "center", justifyContent: "center" }}><Spin /></div>
                        ) : (
                          <ReactApexChart
                            type="bar"
                            series={userStatusSeries}
                            options={barOptions}
                            height={chartHeight}
                          />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="dashboard-empty-charts">
                      <div className="dashboard-empty-icon">
                        <NoDataFoundIcon />
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="analytics-cards-grid client-grid">
                  <AnalyticsCard icon={<TeamOutlined />} value={clientAnalytics.total} label="Total Clients" colorClass="blue" />
                  <AnalyticsCard icon={<CheckCircleOutlined />} value={clientAnalytics.active} label="Active Clients" colorClass="blue-active" />
                  <AnalyticsCard icon={<CloseCircleOutlined />} value={clientAnalytics.inactive} label="Inactive Clients" colorClass="blue-inactive" />
                </div>

                {filteredClientAnalytics.total > 0 ? (
                  <div className="charts-section">
                    <div className="chart-card">
                      <div className="chart-card-title">Client Distribution</div>
                      {Object.keys(filteredClientAnalytics.companyBreakdown || {}).length === 0 ? (
                        <NoDataFoundIcon />
                      ) : (
                        <ReactApexChart
                          type="donut"
                          series={clientCompanySeries}
                          options={clientCompanyOptions}
                          height={chartHeight}
                        />
                      )}
                    </div>
                    <div className="chart-card">
                      <div className="chart-card-title">Client Status</div>
                      {(filteredClientAnalytics.statusBreakdown.active === 0 && filteredClientAnalytics.statusBreakdown.inactive === 0) ? (
                        <NoDataFoundIcon />
                      ) : (
                        <ReactApexChart
                          type="bar"
                          series={clientStatusSeries}
                          options={clientStatusOptions}
                          height={chartHeight}
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="dashboard-empty-charts">
                    <div className="dashboard-empty-icon">
                      <NoDataFoundIcon />
                    </div>
                  </div>
                )}
              </>
            )}

          </div>
        )}
      </div>

      {/* ── Hidden: keeps child modals & actionsRefs alive ──
          Ant Design modals render via portals to document.body,
          so they appear correctly even with this parent hidden. */}
      <div style={{ position: "fixed", top: "-9999px", left: "-9999px", width: 0, height: 0, overflow: "hidden", pointerEvents: "none" }}>
        <EmployeeListTabUsers
          taskLikeDesign
          actionsRef={employeeActionsRef}
          onMutationSuccess={() => { fetchSidebarUsers(); refreshRoleAnalytics(); }}
          onImportHistoryOpen={(jobId) => { setRecentEmployeeJobId(jobId ?? null); setImportHistoryVisible(true); }}
          onImportUploadStart={(name) => { setUploadingEmployeeFile(name); setImportHistoryVisible(true); }}
          onImportUploadEnd={() => setUploadingEmployeeFile(null)}
        />
        <EmployeeListTabClient
          taskLikeDesign
          actionsRef={clientActionsRef}
          onMutationSuccess={fetchSidebarClients}
          onImportHistoryOpen={(jobId) => { setRecentClientJobId(jobId ?? null); setClientImportHistoryVisible(true); }}
          onImportUploadStart={(name) => { setUploadingClientFile(name); setClientImportHistoryVisible(true); }}
          onImportUploadEnd={() => setUploadingClientFile(null)}
        />
      </div>

      <EmployeeImportHistory
        visible={importHistoryVisible}
        onClose={() => setImportHistoryVisible(false)}
        recentJobId={recentEmployeeJobId}
        uploadingFileName={uploadingEmployeeFile}
        onImportComplete={() => {
          setRecentEmployeeJobId(null);
          fetchSidebarUsers();
          refreshRoleAnalytics();
          employeeActionsRef.current?.refreshEmployees?.();
        }}
      />

      <ClientImportHistory
        visible={clientImportHistoryVisible}
        onClose={() => setClientImportHistoryVisible(false)}
        recentJobId={recentClientJobId}
        uploadingFileName={uploadingClientFile}
        onImportComplete={() => {
          setRecentClientJobId(null);
          fetchSidebarClients();
          clientActionsRef.current?.refreshClients?.();
        }}
      />
    </div>
    </div>
  );
};

export default EmployeeMasterList;
