import React, { useMemo } from "react";
import ReactDOM from "react-dom";
import { Button, Switch, Tooltip } from "antd";
import {
  BugOutlined,
  CalendarOutlined,
  DashboardOutlined,
  FolderOutlined,
  KeyOutlined,
  LockOutlined,
  ProjectOutlined,
  SettingOutlined,
  TeamOutlined,
  UnlockOutlined,
  UserOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import PermissionModuleController from "./PermissionModuleController";
import { PermissionPageSkeleton } from "../../components/common/SkeletonLoader";
import NoDataFoundIcon from "../../components/common/NoDataFoundIcon";
import "./PermissionModule.css";

/* ─── Role avatar colours (deterministic from name) ────────────── */
const ROLE_COLORS = [
  "#2563eb", "#7c3aed", "#db2777", "#dc2626",
  "#d97706", "#16a34a", "#0891b2", "#4f46e5",
];
const roleColor = (name = "") => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return ROLE_COLORS[Math.abs(h) % ROLE_COLORS.length];
};

/* ─── Module metadata (icon, label, description) ────────────────
   Used to enrich the matrix rows with icons/labels.
   The `key` must match the normalised module name parsed from
   the server's resource_name (e.g. "task_add" → key "tasks").
─────────────────────────────────────────────────────────────────── */
const MODULE_META = [
  {
    key: "dashboard",
    label: "Dashboard",
    description: "Overview & analytics",
    icon: <DashboardOutlined />,
    iconBg: "#eff6ff",
    iconColor: "#2563eb",
  },
  {
    key: "tasks",
    label: "Tasks",
    description: "Task creation & management",
    icon: <ProjectOutlined />,
    iconBg: "#f0fdf4",
    iconColor: "#16a34a",
  },
  {
    key: "projects",
    label: "Projects",
    description: "Project lifecycle",
    icon: <FolderOutlined />,
    iconBg: "#faf5ff",
    iconColor: "#7c3aed",
  },
  {
    key: "bugs",
    label: "Bugs",
    description: "Bug tracking & reporting",
    icon: <BugOutlined />,
    iconBg: "#fef2f2",
    iconColor: "#dc2626",
  },
  {
    key: "timesheet",
    label: "Timesheet",
    description: "Time tracking access",
    icon: <CalendarOutlined />,
    iconBg: "#fff7ed",
    iconColor: "#ea580c",
  },
  {
    key: "people",
    label: "People",
    description: "User & team management",
    icon: <TeamOutlined />,
    iconBg: "#ecfdf5",
    iconColor: "#059669",
  },
  {
    key: "settings",
    label: "Settings",
    description: "System configuration",
    icon: <SettingOutlined />,
    iconBg: "#f8fafc",
    iconColor: "#64748b",
  },
];

/* Action columns shown in the matrix header */
const ACTION_COLUMNS = [
  { key: "view",   label: "View" },
  { key: "add",    label: "Add" },
  { key: "edit",   label: "Edit" },
  { key: "delete", label: "Delete" },
  { key: "manage", label: "Manage" },
];

/* ─── Parse a server resource_name into { module, action } ──────
   Handles two naming patterns:
     "Task Add"       / "task_add"       → { module: "tasks",     action: "add" }
     "View Timesheet" / "view_timesheet" → { module: "timesheet", action: "view" }
     "Manage People"  / "manage_people"  → { module: "people",    action: "manage" }
─────────────────────────────────────────────────────────────────── */
const KNOWN_ACTIONS = new Set(["view", "add", "edit", "delete", "manage", "update", "create"]);

/* Singular → plural module name normalisation */
const MODULE_ALIASES = {
  task:    "tasks",
  project: "projects",
  bug:     "bugs",
  setting: "settings",
  people:  "people",
  person:  "people",
  user:    "people",
};

const normalizeModule = (raw) => MODULE_ALIASES[raw] || raw;

const parsePermName = (name = "") => {
  /* Split by space OR underscore — handles both "Task Add" and "task_add" */
  const parts = name.toLowerCase().split(/[\s_]+/).filter(Boolean);
  if (parts.length < 2) return { module: normalizeModule(name.toLowerCase()), action: "access" };

  /* action first: "View Timesheet", "view_timesheet", "Manage People" */
  if (KNOWN_ACTIONS.has(parts[0])) {
    return {
      action: parts[0],
      module: normalizeModule(parts.slice(1).join("_")),
    };
  }

  /* action last: "Task Add", "task_add", "Project Delete" */
  if (KNOWN_ACTIONS.has(parts[parts.length - 1])) {
    return {
      action: parts[parts.length - 1],
      module: normalizeModule(parts.slice(0, -1).join("_")),
    };
  }

  /* Fallback — whole name as module, "access" as action */
  return { module: normalizeModule(name.toLowerCase()), action: "access" };
};

/* ─── Module metadata lookup ─────────────────────────────────── */
const getModuleMeta = (key) =>
  MODULE_META.find((m) => m.key === key) || {
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    description: "",
    icon: <KeyOutlined />,
    iconBg: "#f8fafc",
    iconColor: "#94a3b8",
  };

/* ─── Stat Card ─────────────────────────────────────────────────── */
const StatCard = ({ icon, label, value, color }) => (
  <div className={`rpm-stat-card ${color}`}>
    <div className={`rpm-stat-icon ${color}`}>{icon}</div>
    <div className="rpm-stat-body">
      <div className="rpm-stat-label">{label}</div>
      <div className="rpm-stat-value">{value}</div>
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
const PermissionModule = () => {
  const {
    roleListData,
    localPermissions,
    selectedRoleId,
    isDirty,
    permLoading,
    saving,
    pageLoading,
    selectRole,
    onPermissionChange,
    savePermissions,
    discardChanges,
  } = PermissionModuleController();

  /* ── selected role object ── */
  const selectedRole = useMemo(
    () => roleListData.find((r) => r._id === selectedRoleId) || null,
    [roleListData, selectedRoleId]
  );

  /* ── stats ── */
  const stats = useMemo(() => {
    const total       = roleListData.length;
    const isAdminRole = selectedRole?.role_name === "Admin";
    const enabled     = isAdminRole
      ? localPermissions.length
      : localPermissions.filter((p) => {
          const { module } = parsePermName(p.name);
          return module === "dashboard" ? true : p.isAccess;
        }).length;
    const disabled = localPermissions.length - enabled;
    const totalP   = localPermissions.length;
    return { total, enabled, disabled, totalP };
  }, [roleListData, localPermissions, selectedRole]);

  /* ── dynamic permission matrix ───────────────────────────────
     Build:  { moduleKey → { actionKey → permObj } }
     from the raw list returned by the server.
     Every permission that comes back from the server is placed
     into the right cell — no hard-coded name mapping needed.
  ────────────────────────────────────────────────────────────── */
  const dynamicMatrix = useMemo(() => {
    const result = {};
    localPermissions.forEach((perm) => {
      const { module, action } = parsePermName(perm.name);
      if (!result[module]) result[module] = {};
      result[module][action] = perm;
    });
    return result;
  }, [localPermissions]);

  /* ── ordered module keys (known first, then unknowns) ── */
  const matrixRows = useMemo(() => {
    const knownKeys = MODULE_META.map((m) => m.key);
    /* Always show all known modules + any extra modules from the server */
    const allKeys   = new Set([...knownKeys, ...Object.keys(dynamicMatrix)]);
    return [...allKeys].sort((a, b) => {
      const ai = knownKeys.indexOf(a);
      const bi = knownKeys.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [dynamicMatrix]);

  if (pageLoading) return <PermissionPageSkeleton />;

  /* ── render ─────────────────────────────────────────────────── */
  return (
    <div className="rpm-page">

      {/* ══ Header ══ */}
      <div className="rpm-header">
        <h1 className="rpm-title">Role &amp; Permissions</h1>
      </div>

      {/* ══ Stats Cards ══ */}
      <div className="rpm-stats-grid">
        <StatCard
          icon={<UserOutlined />}
          label="Total Roles"
          value={stats.total}
          color="blue"
        />
        <StatCard
          icon={<UnlockOutlined />}
          label="Permissions Enabled"
          value={selectedRole ? stats.enabled : "—"}
          color="green"
        />
        <StatCard
          icon={<LockOutlined />}
          label="Permissions Disabled"
          value={selectedRole ? stats.disabled : "—"}
          color="orange"
        />
        <StatCard
          icon={<KeyOutlined />}
          label="Total Permissions"
          value={selectedRole ? stats.totalP : "—"}
          color="purple"
        />
      </div>

      {/* ══ Workspace (Sidebar + Panel) ══ */}
      <div className="rpm-workspace">

        {/* ── Role Sidebar ── */}
        <aside className="rpm-role-sidebar">
          <div className="rpm-sidebar-title">Roles</div>
          {roleListData.map((role) => {
            const bg      = roleColor(role.role_name);
            const initial = (role.role_name || "?")[0].toUpperCase();
            const active  = role._id === selectedRoleId;
            return (
              <div
                key={role._id}
                className={`rpm-role-item ${active ? "active" : ""}`}
                onClick={() => selectRole(role._id)}
              >
                <div className="rpm-role-avatar" style={{ background: bg }}>
                  {initial}
                </div>
                <span className="rpm-role-name">{role.role_name}</span>
              </div>
            );
          })}
        </aside>

        {/* ── Permission Panel ── */}
        <section className="rpm-permission-panel">
          <div className="rpm-panel-header">
            <div>
              <div className="rpm-panel-title">
                {selectedRole
                  ? `${selectedRole.role_name} — Permission Matrix`
                  : "Select a role"}
              </div>
              <div className="rpm-panel-sub">
                {selectedRole
                  ? "Toggle module permissions for this role"
                  : "Click any role on the left to view its permissions"}
              </div>
            </div>
            {isDirty && (
              <div className="rpm-dirty-badge">
                <WarningOutlined />
                Unsaved changes
              </div>
            )}
          </div>

          {/* Empty state */}
          {!selectedRole && !permLoading && (
            <div className="rpm-empty-state">
              <KeyOutlined className="rpm-empty-icon" />
              <div className="rpm-empty-text">No role selected</div>
              <div className="rpm-empty-hint">
                Choose a role from the sidebar to manage its permissions
              </div>
            </div>
          )}

          {/* Loading skeleton */}
          {permLoading && (
            <div className="rpm-loading-rows">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rpm-skeleton-row" />
              ))}
            </div>
          )}

          {/* Permission Matrix — fully dynamic from server data */}
          {selectedRole && !permLoading && (
            <div className="rpm-matrix-wrap">
              <table className="rpm-matrix">
                <colgroup>
                  <col className="rpm-col-module" />
                  {ACTION_COLUMNS.map((c) => (
                    <col key={c.key} className="rpm-col-action" />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    <th>Module</th>
                    {ACTION_COLUMNS.map((c) => (
                      <th key={c.key}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixRows.length === 0 ? (
                    <tr>
                      <td colSpan={ACTION_COLUMNS.length + 1} style={{ textAlign: "center", padding: "40px" }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <NoDataFoundIcon  />
                          <span style={{ marginTop: 12, color: "#94a3b8", fontSize: 14 }}>No permissions found for this role</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    matrixRows.map((moduleKey) => {
                      const mod         = getModuleMeta(moduleKey);
                      const modulePerms = dynamicMatrix[moduleKey] || {};

                      return (
                        <tr key={moduleKey}>
                          {/* Module cell */}
                          <td>
                            <div className="rpm-module-cell">
                              <div
                                className="rpm-module-icon"
                                style={{
                                  background: mod.iconBg,
                                  color:      mod.iconColor,
                                }}
                              >
                                {mod.icon}
                              </div>
                              <div>
                                <div className="rpm-module-label">{mod.label}</div>
                                <div className="rpm-module-sub">{mod.description}</div>
                              </div>
                            </div>
                          </td>

                          {/* Action toggle cells — always show a switch */}
                          {ACTION_COLUMNS.map((col) => {
                            const perm = modulePerms[col.key];
                            const isDashboard = moduleKey === "dashboard";
                            const isAdminRole = selectedRole?.role_name === "Admin";
                            const isLocked = isDashboard || isAdminRole;
                            const isOn = isLocked ? true : (perm?.isAccess || false);
                            const tooltip = isAdminRole
                              ? "Admin has all permissions by default"
                              : isDashboard
                              ? "Dashboard access is always enabled"
                              : `${isOn ? "Revoke" : "Grant"} ${mod.label} ${col.label}`;

                            return (
                              <td key={col.key}>
                                <div className="rpm-toggle-cell">
                                  <Tooltip title={tooltip}>
                                    <Switch
                                      checked={isOn}
                                      disabled={isLocked}
                                      onChange={(checked) =>
                                        onPermissionChange(
                                          checked,
                                          perm?._id || null,
                                          perm?.name || `${moduleKey}_${col.key}`
                                        )
                                      }
                                      size="small"
                                      className={isOn ? "rpm-switch-on" : "rpm-switch-off"}
                                    />
                                  </Tooltip>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Sticky Save Bar — rendered via portal to bypass parent overflow/transform ── */}
          {isDirty && ReactDOM.createPortal(
            <div className="rpm-save-bar">
              <div className="rpm-save-bar-text">
                <WarningOutlined />
                You have unsaved permission changes for{" "}
                <strong>
                  {selectedRole?.role_name}
                </strong>
              </div>
              <div className="rpm-save-bar-actions">
                <Button
                  className="secondary-btn"
                  onClick={discardChanges}
                  disabled={saving}
                >
                  Discard
                </Button>
                <Button
                  type="primary"
                  
                  className="add-btn"
                  onClick={savePermissions}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save "}
                </Button>
              </div>
            </div>,
            document.body
          )}
        </section>
      </div>

    </div>
  );
};

export default React.memo(PermissionModule);
