/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Input, Avatar, Tooltip } from "antd";
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
  EditOutlined,
  MailOutlined,
  PhoneOutlined,
  BankOutlined,
} from "@ant-design/icons";
import ReactApexChart from "react-apexcharts";
import { useLocation } from "react-router-dom/cjs/react-router-dom.min";
import { useDispatch } from "react-redux";
import "./EmployeeMasterList.css";
import EmployeeListTabClient from "./EmployeeListTabClient";
import EmployeeListTabUsers from "./EmployeeListTabUsers";
import UserDashboard from "./UserDashboard";
import Service from "../../service";
import { removeTitle } from "../../util/nameFilter";

/* ─── avatar colour helper ──────────────────────────────────────── */
const AVATAR_COLORS = [
  "#2563eb", "#7c3aed", "#db2777", "#dc2626",
  "#d97706", "#16a34a", "#0891b2", "#4f46e5",
];
const avatarColor = (name = "") => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};
const initials = (name = "") =>
  name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

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
  const dispatch   = useDispatch(); // kept for child components that use it

  const searchParams = new URLSearchParams(search);
  const paramTab     = searchParams.get("tab");

  /* ── sidebar mode ── */
  const [sidebarMode, setSidebarMode] = useState(
    paramTab === "client" ? "clients" : "employees"
  );

  /* ── action refs for hidden child components ── */
  const employeeActionsRef = useRef(null);
  const clientActionsRef   = useRef(null);

  /* ── sidebar ui ── */
  const [sidebarOpen,   setSidebarOpen]   = useState(true);
  const [sidebarSearch, setSidebarSearch] = useState("");

  /* ── employee favorites ── */
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user_sidebar_favorites") || "[]"); }
    catch { return []; }
  });

  /* ── selection ── */
  const [selectedUserId,   setSelectedUserId]   = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(null);

  /* ── employee data ── */
  const [sidebarUsers,   setSidebarUsers]   = useState([]);
  const [sidebarLoading, setSidebarLoading] = useState(false);
  const [analytics, setAnalytics] = useState({
    total: 0, active: 0, inactive: 0, admins: 0,
    roleBreakdown: {}, statusBreakdown: { active: 0, inactive: 0 },
  });

  /* ── client data ── */
  const [sidebarClients,  setSidebarClients]  = useState([]);
  const [clientsLoading,  setClientsLoading]  = useState(false);
  const [clientAnalytics, setClientAnalytics] = useState({ total: 0, active: 0, inactive: 0 });

  /* ── fetch employees ───────────────────────────────────────────── */
  const fetchSidebarUsers = useCallback(async () => {
    setSidebarLoading(true);
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.getUsermaster,
        body: { pageNo: 1, limit: 200, includeDeactivated: true },
      });
      const users = response?.data?.data || [];
      setSidebarUsers(users);
      computeAnalytics(users);
    } catch {
      try {
        const response = await Service.makeAPICall({
          methodName: Service.postMethod,
          api_url: Service.getUsersList,
          body: { page: 1, limit: 200 },
        });
        const users = response?.data?.data || [];
        setSidebarUsers(users);
        computeAnalytics(users);
      } catch { /* silent */ }
    } finally {
      setSidebarLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── fetch clients ─────────────────────────────────────────────── */
  const fetchSidebarClients = useCallback(async () => {
    setClientsLoading(true);
    try {
      const response = await Service.makeAPICall({
        methodName: Service.postMethod,
        api_url: Service.clientlist,
        body: { pageNo: 1, limit: 200 },
      });
      const clients = response?.data?.data || [];
      setSidebarClients(clients);
      const active = clients.filter((c) => c.isActivate).length;
      setClientAnalytics({ total: clients.length, active, inactive: clients.length - active });
    } catch { /* silent */ }
    finally { setClientsLoading(false); }
  }, []);

  useEffect(() => { fetchSidebarUsers();   }, [fetchSidebarUsers]);
  useEffect(() => { fetchSidebarClients(); }, [fetchSidebarClients]);

  /* ── analytics from employee list ─────────────────────────────── */
  const computeAnalytics = (users) => {
    const roleBreakdown = {};
    let active = 0, inactive = 0, admins = 0;
    users.forEach((u) => {
      if (u.isActivate) active++; else inactive++;
      const role = u?.pms_role?.role_name || "N/A";
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
  const filteredUsers = sidebarUsers.filter((u) => {
    const name = (u.full_name || `${u.first_name || ""} ${u.last_name || ""}`).toLowerCase();
    return name.includes(sidebarSearch.toLowerCase());
  });
  const filteredClients = sidebarClients.filter((c) => {
    const name = (c.full_name || `${c.first_name || ""} ${c.last_name || ""}`).toLowerCase();
    return name.includes(sidebarSearch.toLowerCase());
  });

  const favoriteUsers = filteredUsers.filter((u) =>  favorites.includes(u._id));
  const regularUsers  = filteredUsers.filter((u) => !favorites.includes(u._id));

  /* ── selected objects ──────────────────────────────────────────── */
  const selectedUser   = selectedUserId   ? sidebarUsers.find((u) => u._id === selectedUserId)   : null;
  const selectedClient = selectedClientId ? sidebarClients.find((c) => c._id === selectedClientId) : null;

  const displayName = sidebarMode === "employees"
    ? (selectedUser
        ? removeTitle(selectedUser.full_name   || `${selectedUser.first_name   || ""} ${selectedUser.last_name   || ""}`)
        : "All Employees")
    : (selectedClient
        ? removeTitle(selectedClient.full_name || `${selectedClient.first_name || ""} ${selectedClient.last_name || ""}`)
        : "All Clients");

  /* ── chart configs ─────────────────────────────────────────────── */
  const roleLabels  = Object.keys(analytics.roleBreakdown);
  const roleSeries  = Object.values(analytics.roleBreakdown);
  const donutOptions = {
    chart: { type: "donut", fontFamily: "inherit" },
    labels: roleLabels.length ? roleLabels : ["No Data"],
    colors: ["#2563eb", "#7c3aed", "#16a34a", "#f59e0b", "#dc2626", "#0891b2"],
    legend: { position: "bottom", fontSize: "12px" },
    plotOptions: { pie: { donut: { size: "65%" } } },
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    tooltip: { y: { formatter: (v) => `${v} users` } },
  };
  const barOptions = {
    chart: { type: "bar", fontFamily: "inherit", toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 6, horizontal: false, columnWidth: "45%" } },
    colors: ["#16a34a", "#dc2626"],
    xaxis: { categories: ["Active", "Inactive"] },
    yaxis: { labels: { style: { fontSize: "12px" } } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#f1f5f9" },
    tooltip: { y: { formatter: (v) => `${v} users` } },
  };

  /* ── sidebar employee item ─────────────────────────────────────── */
  const SidebarUserItem = ({ user }) => {
    const name     = removeTitle(user.full_name || `${user.first_name || ""} ${user.last_name || ""}`);
    const role     = user?.pms_role?.role_name || "";
    const isActive = selectedUserId === user._id;
    const isFav    = favorites.includes(user._id);
    const bg       = avatarColor(name);
    return (
      <div
        className={`sidebar-user-item ${isActive ? "active" : ""}`}
        onClick={() => setSelectedUserId(isActive ? null : user._id)}
      >
        <div className="sidebar-avatar-wrap">
          <Avatar size={34} style={{ backgroundColor: bg, fontSize: 13, fontWeight: 600 }}>
            {initials(name)}
          </Avatar>
          <span className={`sidebar-status-dot ${user.isActivate ? "online" : "offline"}`} />
        </div>
        <div className="sidebar-user-info">
          <span className="sidebar-user-name">{name || "—"}</span>
          {role && <span className="sidebar-user-role">{role}</span>}
        </div>
        <button
          className={`sidebar-star-btn ${isFav ? "starred" : ""}`}
          onClick={(e) => toggleFavorite(e, user._id)}
          title={isFav ? "Remove from favourites" : "Add to favourites"}
        >
          {isFav ? <StarFilled /> : <StarOutlined />}
        </button>
      </div>
    );
  };

  /* ── sidebar client item ───────────────────────────────────────── */
  const SidebarClientItem = ({ client }) => {
    const name     = removeTitle(client.full_name || `${client.first_name || ""} ${client.last_name || ""}`);
    const company  = client.company_name || "";
    const isActive = selectedClientId === client._id;
    const bg       = avatarColor(name);
    return (
      <div
        className={`sidebar-user-item ${isActive ? "active" : ""}`}
        onClick={() => setSelectedClientId(isActive ? null : client._id)}
      >
        <div className="sidebar-avatar-wrap">
          <Avatar size={34} style={{ backgroundColor: bg, fontSize: 13, fontWeight: 600 }}>
            {initials(name)}
          </Avatar>
          <span className={`sidebar-status-dot ${client.isActivate ? "online" : "offline"}`} />
        </div>
        <div className="sidebar-user-info">
          <span className="sidebar-user-name">{name || "—"}</span>
          {company && <span className="sidebar-user-role">{company}</span>}
        </div>
      </div>
    );
  };

  /* ── render ─────────────────────────────────────────────────────── */
  return (
    <div className="users-workspace">

      {/* ══════════ LEFT SIDEBAR ══════════ */}
      <aside className={`users-sidebar-panel ${sidebarOpen ? "" : "collapsed"}`}>
        <div className="sidebar-panel-header">
          <div className="sidebar-panel-title">Team Members</div>

          {/* Employees / Clients toggle */}
          <div className="sidebar-mode-toggle">
            <button
              className={`sidebar-mode-btn ${sidebarMode === "employees" ? "active" : ""}`}
              onClick={() => {
                setSidebarMode("employees");
                setSelectedClientId(null);
                setSidebarSearch("");
              }}
            >
              Employees
            </button>
            <button
              className={`sidebar-mode-btn ${sidebarMode === "clients" ? "active" : ""}`}
              onClick={() => {
                setSidebarMode("clients");
                setSelectedUserId(null);
                setSidebarSearch("");
              }}
            >
              Clients
            </button>
          </div>

          <Input
            className="sidebar-search-input"
            prefix={<span style={{ color: "#94a3b8", fontSize: 13 }}>⌕</span>}
            placeholder={sidebarMode === "employees" ? "Search employees…" : "Search clients…"}
            value={sidebarSearch}
            onChange={(e) => setSidebarSearch(e.target.value)}
            allowClear
          />
        </div>

        <div className="sidebar-user-list">
          {sidebarMode === "employees" ? (
            <>
              {/* All Employees */}
              <div
                className={`sidebar-all-users-btn ${!selectedUserId ? "active" : ""}`}
                onClick={() => setSelectedUserId(null)}
              >
                <div className="all-users-avatar"><TeamOutlined /></div>
                <span className="sidebar-all-users-label">All Employees</span>
              </div>

              {favoriteUsers.length > 0 && (
                <>
                  <div className="sidebar-section-label">Favourites</div>
                  {favoriteUsers.map((u) => <SidebarUserItem key={u._id} user={u} />)}
                </>
              )}

              {regularUsers.length > 0 && (
                <>
                  {favoriteUsers.length > 0 && (
                    <div className="sidebar-section-label">All Members</div>
                  )}
                  {regularUsers.map((u) => <SidebarUserItem key={u._id} user={u} />)}
                </>
              )}

              {!sidebarLoading && filteredUsers.length === 0 && (
                <div style={{ padding: "20px 10px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                  No employees found
                </div>
              )}
            </>
          ) : (
            <>
              {/* All Clients */}
              <div
                className={`sidebar-all-users-btn ${!selectedClientId ? "active" : ""}`}
                onClick={() => setSelectedClientId(null)}
              >
                <div className="all-users-avatar"><TeamOutlined /></div>
                <span className="sidebar-all-users-label">All Clients</span>
              </div>

              {filteredClients.map((c) => (
                <SidebarClientItem key={c._id} client={c} />
              ))}

              {!clientsLoading && filteredClients.length === 0 && (
                <div style={{ padding: "20px 10px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                  No clients found
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      {/* ══════════ RIGHT DASHBOARD ══════════ */}
      <div className="users-dashboard-area">

        {/* ── Header ── */}
        <div className="dashboard-header">
          <div className="dashboard-header-left">
            <button
              className="sidebar-toggle-btn"
              onClick={() => setSidebarOpen((p) => !p)}
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {sidebarOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
            </button>

            {(selectedUser || selectedClient) ? (
              <Avatar
                size={36}
                style={{ backgroundColor: avatarColor(displayName), fontSize: 14, fontWeight: 600, flexShrink: 0 }}
              >
                {initials(displayName)}
              </Avatar>
            ) : (
              <Avatar size={36} icon={<TeamOutlined />} style={{ background: "#eff6ff", color: "#2563eb" }} />
            )}

            <h1 className="dashboard-header-title">{displayName}</h1>
          </div>

          {/* Employee header actions */}
          {sidebarMode === "employees" && !selectedUser && (
            <div className="dashboard-header-actions">
              <Tooltip title="Export CSV">
                <button className="header-action-btn" onClick={() => employeeActionsRef.current?.exportCSV()}>
                  <DownloadOutlined /> <span>Export CSV</span>
                </button>
              </Tooltip>
              <Tooltip title="Download sample CSV">
                <button className="header-action-btn" onClick={() => employeeActionsRef.current?.exportSampleCSV()}>
                  <DownloadOutlined /> <span>Sample CSV</span>
                </button>
              </Tooltip>
              <Tooltip title="Import users via CSV">
                <button className="header-action-btn" onClick={() => employeeActionsRef.current?.triggerImport()}>
                  <UploadOutlined /> <span>Import CSV</span>
                </button>
              </Tooltip>
              <button className="header-action-btn primary" onClick={() => employeeActionsRef.current?.openAddModal()}>
                <PlusOutlined /> <span>Add Employee</span>
              </button>
            </div>
          )}

          {/* Client header actions — overview */}
          {sidebarMode === "clients" && !selectedClient && (
            <div className="dashboard-header-actions">
              <Tooltip title="Export CSV">
                <button className="header-action-btn" onClick={() => clientActionsRef.current?.exportCSV()}>
                  <DownloadOutlined /> <span>Export CSV</span>
                </button>
              </Tooltip>
              <button className="header-action-btn primary" onClick={() => clientActionsRef.current?.openAddModal()}>
                <PlusOutlined /> <span>Add Client</span>
              </button>
            </div>
          )}

          {/* Client header actions — when a client is selected */}
          {sidebarMode === "clients" && selectedClient && (
            <div className="dashboard-header-actions">
              <button
                className="header-action-btn"
                onClick={() => clientActionsRef.current?.openEditModal(selectedClient._id)}
              >
                <EditOutlined /> <span>Edit Client</span>
              </button>
            </div>
          )}
        </div>

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
                  style={{ backgroundColor: avatarColor(displayName), fontSize: 24, fontWeight: 700, flexShrink: 0 }}
                >
                  {initials(displayName)}
                </Avatar>
                <div>
                  <div className="client-detail-name">{displayName}</div>
                  <div className="client-detail-company">{selectedClient.company_name || "—"}</div>
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
                    <div className="client-field-value">{selectedClient.email || "—"}</div>
                  </div>
                </div>
                <div className="client-detail-field">
                  <PhoneOutlined className="client-field-icon" />
                  <div>
                    <div className="client-field-label">Phone</div>
                    <div className="client-field-value">{selectedClient.phone_number || "—"}</div>
                  </div>
                </div>
                <div className="client-detail-field">
                  <BankOutlined className="client-field-icon" />
                  <div>
                    <div className="client-field-label">Company</div>
                    <div className="client-field-value">{selectedClient.company_name || "—"}</div>
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
                  <AnalyticsCard icon={<TeamOutlined />}        value={analytics.total}    label="Total Employees" colorClass="blue" />
                  <AnalyticsCard icon={<CheckCircleOutlined />} value={analytics.active}   label="Active"          colorClass="green" />
                  <AnalyticsCard icon={<CloseCircleOutlined />} value={analytics.inactive} label="Inactive"        colorClass="red" />
                  <AnalyticsCard icon={<CrownOutlined />}       value={analytics.admins}   label="Admins"          colorClass="purple" />
                </div>

                {analytics.total > 0 && (
                  <div className="charts-section">
                    <div className="chart-card">
                      <div className="chart-card-title">Role Distribution</div>
                      <ReactApexChart
                        type="donut"
                        series={roleSeries.length ? roleSeries : [1]}
                        options={donutOptions}
                        height={240}
                      />
                    </div>
                    <div className="chart-card">
                      <div className="chart-card-title">Employee Status</div>
                      <ReactApexChart
                        type="bar"
                        series={[{
                          name: "Employees",
                          data: [analytics.statusBreakdown.active, analytics.statusBreakdown.inactive],
                        }]}
                        options={barOptions}
                        height={240}
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="analytics-cards-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                <AnalyticsCard icon={<TeamOutlined />}        value={clientAnalytics.total}    label="Total Clients"    colorClass="blue" />
                <AnalyticsCard icon={<CheckCircleOutlined />} value={clientAnalytics.active}   label="Active Clients"   colorClass="green" />
                <AnalyticsCard icon={<CloseCircleOutlined />} value={clientAnalytics.inactive} label="Inactive Clients" colorClass="red" />
              </div>
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
          onDataLoaded={computeAnalytics}
        />
        <EmployeeListTabClient
          taskLikeDesign
          actionsRef={clientActionsRef}
        />
      </div>

    </div>
  );
};

export default EmployeeMasterList;
