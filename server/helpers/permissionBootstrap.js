const mongoose = require("mongoose");
const { MODULES, ALL_PERMISSION_NAMES, perm } = require("./permissionCatalog");

const MIGRATION_KEY = "permissions-enforced-2026-10-15";

/** Create any catalogue permission that isn't a resource yet. Returns the new names. */
const ensureResources = async () => {
  const Resource = mongoose.model("resource");
  const Employees = mongoose.model("employees");
  const existing = await Resource.find({ resource_name: { $in: ALL_PERMISSION_NAMES }, isDeleted: false })
    .select("resource_name")
    .lean();
  const have = new Set(existing.map((row) => row.resource_name));
  const missing = ALL_PERMISSION_NAMES.filter((name) => !have.has(name));
  if (!missing.length) return [];

  // createdBy is required — attribute to any existing admin/employee.
  const author = (await Employees.findOne({}).select("_id").lean())?._id || new mongoose.Types.ObjectId();
  await Resource.insertMany(
    missing.map((resource_name) => ({ resource_name, isDefault: true, createdBy: author, updatedBy: author }))
  );
  return missing;
};

/**
 * One-time grant run when write APIs started enforcing permissions, so no
 * role loses anything it could do before (admins can trim afterwards):
 *  - Admin: every permission.
 *  - View on any module the role already holds a permission on (the sidebar
 *    used to show a module for ANY of its permissions; now it needs View).
 *  - Timesheet add/edit/delete wherever View Timesheet is held (logging
 *    hours wasn't gated before).
 *  - People view/add/edit/delete wherever any People permission is held
 *    (the Users page buttons weren't gated before).
 *  - Notes / Discussion / Files view/add/edit/delete for every role (open to
 *    everyone before).
 *  - Project Expense view/add/edit/delete wherever Projects View/Manage is
 *    held (that's what opened the Project Expense page before).
 *  Feedback stays Admin-only (its pages needed Admin/PC/TL + People View).
 */
const migrateExistingCompanies = async () => {
  const db = mongoose.connection.db;
  const migrations = db.collection("app_migrations");
  if (await migrations.findOne({ key: MIGRATION_KEY })) return;

  const Resource = mongoose.model("resource");
  const PMSRoles = mongoose.model("pms_roles");
  const RolePermissions = mongoose.model("role_permissions");
  const Companies = mongoose.model("companies");
  const Employees = mongoose.model("employees");

  const resources = await Resource.find({ isDeleted: false }).select("_id resource_name").lean();
  const idOf = Object.fromEntries(resources.map((row) => [row.resource_name, String(row._id)]));
  const nameOf = Object.fromEntries(resources.map((row) => [String(row._id), row.resource_name]));
  const roles = await PMSRoles.find({ isDeleted: false }).select("_id role_name").lean();
  const companies = await Companies.find({ isDeleted: false }).select("_id").lean();
  const author = (await Employees.findOne({}).select("_id").lean())?._id || new mongoose.Types.ObjectId();

  const moduleNames = (module) => Object.values(MODULES[module]);
  const crud = (module) => ["view", "add", "edit", "delete"].map((action) => perm(module, action));
  const toInsert = [];

  for (const company of companies) {
    const rows = await RolePermissions.find({ companyId: company._id, isDeleted: false })
      .select("pms_role_id resource_id")
      .lean();
    const heldByRole = {};
    rows.forEach((row) => {
      const key = String(row.pms_role_id);
      (heldByRole[key] = heldByRole[key] || new Set()).add(nameOf[String(row.resource_id)]);
    });

    for (const role of roles) {
      const held = heldByRole[String(role._id)] || new Set();
      const grant = new Set();

      if (role.role_name === "Admin") {
        ALL_PERMISSION_NAMES.forEach((name) => grant.add(name));
      } else {
        ["projects", "tasks", "bugs", "timesheet", "people", "settings"].forEach((module) => {
          if (moduleNames(module).some((name) => held.has(name))) grant.add(perm(module, "view"));
        });
        if (held.has(perm("timesheet", "view"))) {
          ["add", "edit", "delete"].forEach((action) => grant.add(perm("timesheet", action)));
        }
        if (moduleNames("people").some((name) => held.has(name))) crud("people").forEach((name) => grant.add(name));
        ["notes", "discussion", "files"].forEach((module) => crud(module).forEach((name) => grant.add(name)));
        if (held.has(perm("projects", "view")) || held.has(perm("projects", "manage")) || grant.has(perm("projects", "view"))) {
          crud("expense").forEach((name) => grant.add(name));
        }
        grant.add(perm("dashboard", "view"));
      }

      grant.forEach((name) => {
        if (held.has(name) || !idOf[name]) return;
        toInsert.push({
          companyId: company._id,
          pms_role_id: role._id,
          resource_id: new mongoose.Types.ObjectId(idOf[name]),
          createdBy: author,
          updatedBy: author,
        });
      });
    }
  }

  if (toInsert.length) await RolePermissions.insertMany(toInsert);
  await migrations.insertOne({ key: MIGRATION_KEY, grants: toInsert.length, ranAt: new Date() });
  console.log(`[permissions] migration ${MIGRATION_KEY}: ${toInsert.length} grants added`);
};

/**
 * Second one-time grant: pages now open on the module's View permission
 * (routes/index.js viewPermission) instead of a fixed role list, so give View
 * to every role that could open those pages before:
 *  - Projects (project list / boards / archived): every role.
 *  - Tasks page: User, PC, AM, TL.
 *  - Feedback (complaints / reviews + their forms): PC, AM, TL (view/add/edit/delete).
 *  - Reports hub (new reports_* permissions): PC, AM, TL. Admin: all.
 */
const MIGRATION_KEY_2 = "permissions-page-access-2026-10-15";

const migratePageAccess = async () => {
  const db = mongoose.connection.db;
  const migrations = db.collection("app_migrations");
  if (await migrations.findOne({ key: MIGRATION_KEY_2 })) return;

  const Resource = mongoose.model("resource");
  const PMSRoles = mongoose.model("pms_roles");
  const RolePermissions = mongoose.model("role_permissions");
  const Companies = mongoose.model("companies");
  const Employees = mongoose.model("employees");

  const resources = await Resource.find({ isDeleted: false }).select("_id resource_name").lean();
  const idOf = Object.fromEntries(resources.map((row) => [row.resource_name, String(row._id)]));
  const roles = await PMSRoles.find({ isDeleted: false }).select("_id role_name").lean();
  const companies = await Companies.find({ isDeleted: false }).select("_id").lean();
  const author = (await Employees.findOne({}).select("_id").lean())?._id || new mongoose.Types.ObjectId();

  const grantsFor = (roleName) => {
    if (roleName === "Admin") return ALL_PERMISSION_NAMES;
    const names = [perm("projects", "view")];
    if (["User", "PC", "AM", "TL"].includes(roleName)) names.push(perm("tasks", "view"));
    if (["PC", "AM", "TL"].includes(roleName)) {
      ["view", "add", "edit", "delete"].forEach((action) => names.push(perm("feedback", action)));
      names.push(perm("reports", "view"));
    }
    return names;
  };

  const toInsert = [];
  for (const company of companies) {
    const rows = await RolePermissions.find({ companyId: company._id, isDeleted: false })
      .select("pms_role_id resource_id")
      .lean();
    const held = new Set(rows.map((row) => `${row.pms_role_id}:${row.resource_id}`));
    roles.forEach((role) => {
      grantsFor(role.role_name).forEach((name) => {
        const id = idOf[name];
        if (!id || held.has(`${role._id}:${id}`)) return;
        held.add(`${role._id}:${id}`);
        toInsert.push({
          companyId: company._id,
          pms_role_id: role._id,
          resource_id: new mongoose.Types.ObjectId(id),
          createdBy: author,
          updatedBy: author,
        });
      });
    });
  }

  if (toInsert.length) await RolePermissions.insertMany(toInsert);
  await migrations.insertOne({ key: MIGRATION_KEY_2, grants: toInsert.length, ranAt: new Date() });
  console.log(`[permissions] migration ${MIGRATION_KEY_2}: ${toInsert.length} grants added`);
};

/**
 * Third one-time grant: logging / editing / deleting hours was open to every
 * role (task modal had no check), but the first grant only gave Timesheet
 * add/edit/delete where View Timesheet was held — and View only ever decided
 * whether the timesheet pages showed. Give add/edit/delete to every role;
 * View is left as each company set it.
 */
const MIGRATION_KEY_3 = "permissions-timesheet-logging-2026-10-15";

const migrateTimesheetLogging = async () => {
  const db = mongoose.connection.db;
  const migrations = db.collection("app_migrations");
  if (await migrations.findOne({ key: MIGRATION_KEY_3 })) return;

  const Resource = mongoose.model("resource");
  const PMSRoles = mongoose.model("pms_roles");
  const RolePermissions = mongoose.model("role_permissions");
  const Companies = mongoose.model("companies");
  const Employees = mongoose.model("employees");

  const names = ["add", "edit", "delete"].map((action) => perm("timesheet", action));
  const resources = await Resource.find({ resource_name: { $in: names }, isDeleted: false }).select("_id").lean();
  const roles = await PMSRoles.find({ isDeleted: false }).select("_id").lean();
  const companies = await Companies.find({ isDeleted: false }).select("_id").lean();
  const author = (await Employees.findOne({}).select("_id").lean())?._id || new mongoose.Types.ObjectId();

  const toInsert = [];
  for (const company of companies) {
    const rows = await RolePermissions.find({
      companyId: company._id,
      isDeleted: false,
      resource_id: { $in: resources.map((row) => row._id) },
    })
      .select("pms_role_id resource_id")
      .lean();
    const held = new Set(rows.map((row) => `${row.pms_role_id}:${row.resource_id}`));
    roles.forEach((role) => {
      resources.forEach((resource) => {
        if (held.has(`${role._id}:${resource._id}`)) return;
        toInsert.push({
          companyId: company._id,
          pms_role_id: role._id,
          resource_id: resource._id,
          createdBy: author,
          updatedBy: author,
        });
      });
    });
  }

  if (toInsert.length) await RolePermissions.insertMany(toInsert);
  await migrations.insertOne({ key: MIGRATION_KEY_3, grants: toInsert.length, ranAt: new Date() });
  console.log(`[permissions] migration ${MIGRATION_KEY_3}: ${toInsert.length} grants added`);
};

/** Startup: make sure every catalogue permission exists, then run the one-time grants. */
const bootstrapPermissions = async () => {
  try {
    const created = await ensureResources();
    if (created.length) console.log(`[permissions] created resources: ${created.join(", ")}`);
    await migrateExistingCompanies();
    await migratePageAccess();
    await migrateTimesheetLogging();
  } catch (error) {
    console.log("[permissions] bootstrap failed:", error.message);
  }
};

module.exports = { bootstrapPermissions };
