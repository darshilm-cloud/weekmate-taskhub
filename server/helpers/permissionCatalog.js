/**
 * Permission catalogue - every module the Permission Management page shows,
 * with the permission (resource) name for each action. Existing names are
 * kept as they are in the DB (task_add, view_timesheet, manage_people …).
 *
 *   view   → module shows in the sidebar / its pages open
 *   add    → create
 *   edit   → update
 *   delete → delete
 *   manage → module administration (approvals, configuration)
 */
const MODULES = {
  dashboard: { view: "dashboard_view", add: "dashboard_add", edit: "dashboard_edit", delete: "dashboard_delete", manage: "dashboard_manage" },
  projects: { view: "projects_view", add: "project_add", edit: "project_edit", delete: "project_delete", manage: "projects_manage" },
  tasks: { view: "tasks_view", add: "task_add", edit: "task_edit", delete: "task_delete", manage: "tasks_manage" },
  bugs: { view: "bugs_view", add: "bug_add", edit: "bug_edit", delete: "bug_delete", manage: "bugs_manage" },
  timesheet: { view: "view_timesheet", add: "timesheet_add", edit: "timesheet_edit", delete: "timesheet_delete", manage: "timesheet_manage" },
  people: { view: "people_view", add: "people_add", edit: "people_edit", delete: "people_delete", manage: "manage_people" },
  settings: { view: "settings_view", add: "settings_add", edit: "settings_edit", delete: "settings_delete", manage: "settings_manage" },
  // Added 2026-10 - modules that had no permissions of their own.
  notes: { view: "notes_view", add: "notes_add", edit: "notes_edit", delete: "notes_delete", manage: "notes_manage" },
  discussion: { view: "discussion_view", add: "discussion_add", edit: "discussion_edit", delete: "discussion_delete", manage: "discussion_manage" },
  files: { view: "files_view", add: "files_add", edit: "files_edit", delete: "files_delete", manage: "files_manage" },
  feedback: { view: "feedback_view", add: "feedback_add", edit: "feedback_edit", delete: "feedback_delete", manage: "feedback_manage" },
  expense: { view: "expense_view", add: "expense_add", edit: "expense_edit", delete: "expense_delete", manage: "expense_manage" },
  // Reports hub - separate from Timesheet (logging hours), which every role has.
  reports: { view: "reports_view", add: "reports_add", edit: "reports_edit", delete: "reports_delete", manage: "reports_manage" },
};

const NEW_MODULES = ["notes", "discussion", "files", "feedback", "expense", "reports"];

const ALL_PERMISSION_NAMES = Object.values(MODULES).flatMap((actions) => Object.values(actions));

const perm = (module, action) => MODULES[module][action];

/**
 * Non-admin defaults for a NEW company - matches what every role could
 * already do before these modules were permission-controlled (log hours,
 * notes, discussions, project files). Admins get everything.
 */
const NON_ADMIN_DEFAULTS = [
  perm("dashboard", "view"),
  perm("timesheet", "view"),
  perm("timesheet", "add"),
  perm("timesheet", "edit"),
  perm("timesheet", "delete"),
  ...["notes", "discussion", "files"].flatMap((module) =>
    ["view", "add", "edit", "delete"].map((action) => perm(module, action))
  ),
];

/** Defaults for one role of a NEW company (same access the pages gave before). */
const defaultsForRole = (roleName) => {
  if (roleName === "Admin") return ALL_PERMISSION_NAMES;
  const names = [...NON_ADMIN_DEFAULTS, perm("projects", "view")];
  if (["User", "PC", "AM", "TL"].includes(roleName)) names.push(perm("tasks", "view"));
  if (["PC", "AM", "TL"].includes(roleName)) {
    ["view", "add", "edit", "delete"].forEach((action) => names.push(perm("feedback", action)));
    names.push(perm("reports", "view"));
  }
  return names;
};

module.exports = { MODULES, NEW_MODULES, ALL_PERMISSION_NAMES, NON_ADMIN_DEFAULTS, perm, defaultsForRole };
