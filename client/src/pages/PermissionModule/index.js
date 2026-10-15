import React, { useMemo, useState } from "react";
import ReactDOM from "react-dom";
import { Button, Checkbox, Input, Table, Tooltip } from "antd";
import { ArrowLeftOutlined, DownOutlined, RightOutlined, WarningOutlined } from "@ant-design/icons";
import moment from "moment";
import PermissionModuleController from "./PermissionModuleController";
import { PermissionPageSkeleton } from "../../components/common/SkeletonLoader";
import NoDataFoundIcon from "../../components/common/NoDataFoundIcon";
import PageHeader from "../../components/common/PageHeader";
import { RoleIcon, ActiveUsersIcon, LastUpdatedIcon } from "./Icons";
import getRoleLabel from "../../util/roleLabels";
import "./PermissionModule.css";

/*
 * Permission Management — same layout as WeekMate HRMS:
 *  1. Role list: stat cards (Total Roles / Active Users / Last Updated) and a
 *     Role · Users · Last Updated · Manage Access table.
 *  2. "<Role> Permission List": a collapsible section per module group, each
 *     a Module × Read / Create / Update / Delete / Manage / All checkbox grid.
 */

/* Module groups (collapsible sections) and their modules. `key` is the module
   parsed from the server's permission name (e.g. "task_add" → "tasks"). */
const MODULE_GROUPS = [
  {
    key: "collaboration",
    title: "Collaboration",
    modules: [
      { key: "notes", label: "Notes" },
      { key: "discussion", label: "Discussion" },
      { key: "files", label: "Files" },
    ],
  },
  { key: "dashboard", title: "Dashboard", modules: [{ key: "dashboard", label: "Dashboard" }] },
  { key: "feedback", title: "Feedback", modules: [{ key: "feedback", label: "Complaints & Positive Reviews" }] },
  { key: "finance", title: "Finance", modules: [{ key: "expense", label: "Project Expense" }] },
  { key: "people", title: "People", modules: [{ key: "people", label: "Users & Clients" }] },
  {
    key: "project-management",
    title: "Project Management",
    modules: [
      { key: "projects", label: "Projects" },
      { key: "tasks", label: "Tasks" },
      { key: "bugs", label: "Bugs" },
    ],
  },
  {
    key: "reports",
    title: "Reports & Timesheet",
    modules: [
      { key: "reports", label: "Reports" },
      { key: "timesheet", label: "Timesheet" },
    ],
  },
  { key: "settings", title: "Settings", modules: [{ key: "settings", label: "Settings" }] },
];

/* Grid columns → the action part of the permission name. */
const ACTION_COLUMNS = [
  { key: "view", label: "Read" },
  { key: "add", label: "Create" },
  { key: "edit", label: "Update" },
  { key: "delete", label: "Delete" },
  { key: "manage", label: "Manage" },
];

const KNOWN_ACTIONS = new Set(["view", "add", "edit", "delete", "manage", "update", "create"]);
const MODULE_ALIASES = { task: "tasks", project: "projects", bug: "bugs", setting: "settings", person: "people", user: "people" };
const normalizeModule = (raw) => MODULE_ALIASES[raw] || raw;

/* "task_add" / "Task Add" / "view_timesheet" / "manage_people" → { module, action } */
const parsePermName = (name = "") => {
  const parts = name.toLowerCase().split(/[\s_]+/).filter(Boolean);
  if (parts.length < 2) return { module: normalizeModule(name.toLowerCase()), action: "access" };
  if (KNOWN_ACTIONS.has(parts[0])) return { action: parts[0], module: normalizeModule(parts.slice(1).join("_")) };
  if (KNOWN_ACTIONS.has(parts[parts.length - 1])) {
    return { action: parts[parts.length - 1], module: normalizeModule(parts.slice(0, -1).join("_")) };
  }
  return { module: normalizeModule(name.toLowerCase()), action: "access" };
};

const formatDate = (value) => (value ? moment(value).format("DD MMM YYYY") : "-");

/* ═════════════════════════ Role list ═════════════════════════ */
const RoleList = ({ roles, onManage }) => {
  const [search, setSearch] = useState("");

  const stats = useMemo(() => {
    const lastUpdated = roles
      .map((role) => role.updated_at)
      .filter(Boolean)
      .sort((a, b) => new Date(b) - new Date(a))[0];
    return {
      totalRoles: roles.length,
      activeUsers: roles.reduce((sum, role) => sum + (Number(role.user_count) || 0), 0),
      lastUpdated: formatDate(lastUpdated),
    };
  }, [roles]);

  const filtered = roles.filter((role) =>
    getRoleLabel(role.role_name).toLowerCase().includes(search.trim().toLowerCase())
  );

  const columns = [
    {
      title: "Role",
      dataIndex: "role_name",
      key: "role_name",
      width: "30%",
      render: (name) => <span className="perm-role-name">{getRoleLabel(name)}</span>,
    },
    { title: "Users", dataIndex: "user_count", key: "user_count", align: "center", render: (count) => count || 0 },
    { title: "Last Updated", dataIndex: "updated_at", key: "updated_at", align: "center", render: formatDate },
    {
      title: "Action",
      key: "action",
      align: "center",
      render: (_, role) => (
        <div className="perm-action-cell">
          <Button className="btn-secondary perm-manage-btn" onClick={() => onManage(role._id)}>
            Manage Access
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Permission Management" />

      <div className="perm-stats-grid">
        <div className="perm-stat-card">
          <div className="perm-stat-icon"><RoleIcon /></div>
          <div>
            <div className="perm-stat-label">Total Roles</div>
            <div className="perm-stat-value">{stats.totalRoles}</div>
          </div>
        </div>
        <div className="perm-stat-card">
          <div className="perm-stat-icon"><ActiveUsersIcon /></div>
          <div>
            <div className="perm-stat-label">Active Users</div>
            <div className="perm-stat-value">{stats.activeUsers}</div>
          </div>
        </div>
        <div className="perm-stat-card">
          <div className="perm-stat-icon"><LastUpdatedIcon /></div>
          <div>
            <div className="perm-stat-label">Last Updated</div>
            <div className="perm-stat-value">{stats.lastUpdated}</div>
          </div>
        </div>
      </div>

      <div className="perm-card">
        <div className="perm-toolbar">
          <Input.Search
            placeholder="Search..."
            allowClear
            onSearch={setSearch}
            onChange={(e) => !e.target.value && setSearch("")}
            style={{ width: 200 }}
          />
        </div>
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={filtered}
          pagination={false}
          locale={{ emptyText: <NoDataFoundIcon /> }}
        />
      </div>
    </>
  );
};

/* ═══════════════════════ Manage access ═══════════════════════ */
const ManageAccess = ({ role, permissions, loading, onToggle, onBack }) => {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState([]);

  const isAdminRole = role?.role_name === "Admin";

  /* { module → { action → perm } } from the server's permission list */
  const matrix = useMemo(() => {
    const result = {};
    permissions.forEach((perm) => {
      const { module, action } = parsePermName(perm.name);
      (result[module] = result[module] || {})[action] = perm;
    });
    return result;
  }, [permissions]);

  /* Groups incl. any module the server has that isn't listed above. */
  const groups = useMemo(() => {
    const known = new Set(MODULE_GROUPS.flatMap((group) => group.modules.map((m) => m.key)));
    const extra = Object.keys(matrix)
      .filter((key) => !known.has(key))
      .map((key) => ({ key, label: key.charAt(0).toUpperCase() + key.slice(1) }));
    const all = extra.length ? [...MODULE_GROUPS, { key: "other", title: "Other", modules: extra }] : MODULE_GROUPS;
    const term = search.trim().toLowerCase();
    if (!term) return all;
    return all
      .map((group) =>
        group.title.toLowerCase().includes(term)
          ? group
          : { ...group, modules: group.modules.filter((m) => m.label.toLowerCase().includes(term)) }
      )
      .filter((group) => group.modules.length > 0);
  }, [matrix, search]);

  // Dashboard access is always on; Admin has everything — both read-only.
  const isLocked = (moduleKey) => isAdminRole || moduleKey === "dashboard";
  const isChecked = (moduleKey, action) =>
    isLocked(moduleKey) ? true : Boolean(matrix[moduleKey]?.[action]?.isAccess);

  const setCell = (moduleKey, action, checked) => {
    if (isLocked(moduleKey)) return;
    const perm = matrix[moduleKey]?.[action];
    onToggle(checked, perm?._id || null, perm?.name || `${moduleKey}_${action}`);
  };

  const setRow = (moduleKey, checked) =>
    ACTION_COLUMNS.forEach((column) => setCell(moduleKey, column.key, checked));

  const rowAllChecked = (moduleKey) => ACTION_COLUMNS.every((column) => isChecked(moduleKey, column.key));
  const groupAllChecked = (group) => group.modules.every((m) => rowAllChecked(m.key));
  const groupLocked = (group) => group.modules.every((m) => isLocked(m.key));

  const toggleGroup = (key) =>
    setExpanded((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  return (
    <>
      <PageHeader title={`${getRoleLabel(role?.role_name)} Permission List`}>
        <Button type="primary" className="add-btn" icon={<ArrowLeftOutlined />} onClick={onBack}>
          Back
        </Button>
      </PageHeader>

      <div className="perm-card">
        <div className="perm-toolbar">
          <Input.Search
            placeholder="Search..."
            allowClear
            onSearch={setSearch}
            onChange={(e) => !e.target.value && setSearch("")}
            style={{ width: 200 }}
          />
          <Button className="btn-secondary" disabled={expanded.length === 0} onClick={() => setExpanded([])}>
            Collapse
          </Button>
        </div>

        {loading ? (
          <div className="perm-loading">
            {[...Array(6)].map((_, i) => <div key={i} className="perm-skeleton-row" />)}
          </div>
        ) : groups.length === 0 ? (
          <div className="perm-empty"><NoDataFoundIcon /></div>
        ) : (
          <div className="perm-groups">
            {groups.map((group) => {
              const open = expanded.includes(group.key) || Boolean(search.trim());
              const allOn = groupAllChecked(group);
              return (
                <div key={group.key} className={`perm-group ${open ? "is-open" : ""}`}>
                  <div
                    className="perm-group-head"
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleGroup(group.key)}
                    onKeyDown={(e) => e.key === "Enter" && toggleGroup(group.key)}
                  >
                    {open ? <DownOutlined /> : <RightOutlined />}
                    <span className="perm-group-title">{group.title}</span>
                    {open && !groupLocked(group) && (
                      <Button
                        className="btn-secondary perm-select-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          group.modules.forEach((m) => setRow(m.key, !allOn));
                        }}
                      >
                        {allOn ? "Deselect All" : "Select All"}
                      </Button>
                    )}
                  </div>

                  {open && (
                    <div className="perm-group-body">
                      <table className="perm-grid">
                        <thead>
                          <tr>
                            <th>Module</th>
                            {ACTION_COLUMNS.map((column) => <th key={column.key}>{column.label}</th>)}
                            <th>All</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.modules.map((module) => {
                            const locked = isLocked(module.key);
                            const lockHint = isAdminRole
                              ? "Admin has all permissions by default"
                              : "Dashboard access is always enabled";
                            const cell = (content) =>
                              locked ? <Tooltip title={lockHint}>{content}</Tooltip> : content;
                            return (
                              <tr key={module.key}>
                                <td className="perm-module-name">{module.label}</td>
                                {ACTION_COLUMNS.map((column) => (
                                  <td key={column.key}>
                                    {cell(
                                      <Checkbox
                                        checked={isChecked(module.key, column.key)}
                                        disabled={locked}
                                        onChange={(e) => setCell(module.key, column.key, e.target.checked)}
                                      />
                                    )}
                                  </td>
                                ))}
                                <td>
                                  {cell(
                                    <Checkbox
                                      checked={rowAllChecked(module.key)}
                                      disabled={locked}
                                      onChange={(e) => setRow(module.key, e.target.checked)}
                                    />
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

/* ════════════════════════════ Page ════════════════════════════ */
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
    backToList,
    onPermissionChange,
    savePermissions,
    discardChanges,
  } = PermissionModuleController();

  const selectedRole = useMemo(
    () => roleListData.find((role) => role._id === selectedRoleId) || null,
    [roleListData, selectedRoleId]
  );

  if (pageLoading) return <PermissionPageSkeleton />;

  return (
    <div className="perm-page">
      {selectedRoleId ? (
        <ManageAccess
          role={selectedRole}
          permissions={localPermissions}
          loading={permLoading}
          onToggle={onPermissionChange}
          onBack={backToList}
        />
      ) : (
        <RoleList roles={roleListData} onManage={selectRole} />
      )}

      {/* Sticky save bar — portal so parent overflow/transform can't clip it */}
      {isDirty && selectedRoleId && ReactDOM.createPortal(
        <div className="rpm-save-bar">
          <div className="rpm-save-bar-text">
            <WarningOutlined />
            You have unsaved permission changes for <strong>{getRoleLabel(selectedRole?.role_name)}</strong>
          </div>
          <div className="rpm-save-bar-actions">
            <Button className="secondary-btn" onClick={discardChanges} disabled={saving}>
              Discard
            </Button>
            <Button type="primary" className="add-btn" onClick={savePermissions} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default React.memo(PermissionModule);
