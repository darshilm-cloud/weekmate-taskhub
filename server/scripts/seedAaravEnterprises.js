/**
 * Aarav Enterprises - Taskhub demo seed (docs/aarav/STORYLINE.md, CONTRACTS.md in weekmate_pms).
 *
 * Builds on scripts/createCompany.js (company + admin + default role permissions / project statuses /
 * Standard workflow) and seeders/demoDataSeeder.js + projectDataSeeder.js (same document shapes for
 * tasks, notes, discussions, files, hours, complaints ...), but with a FIXED tenant id and the
 * Aarav storyline instead of random data.
 *
 *   node scripts/seedAaravEnterprises.js            # seed (no-op when already seeded)
 *   node scripts/seedAaravEnterprises.js --reset    # wipe ONLY the Aarav tenant, then reseed
 *   node scripts/seedAaravEnterprises.js --dryRun   # connect, print the plan, write nothing
 *   node scripts/seedAaravEnterprises.js --force    # allow a non-localhost DB_URL
 *   node scripts/seedAaravEnterprises.js --matrixReset  # drop + recreate ONLY the Resource Matrix plan tasks (seedTag matrix-plan-v1)
 *                                                       # (a plain run on an already seeded tenant adds the plan once, additively)
 *   npm run seed:aarav [-- --reset]
 *
 * DB_URL comes from the environment, else env/.env.dev. Without --force the script refuses to run
 * unless the Mongo host is localhost / 127.0.0.1 / ::1 (DB_URL=mongodb://127.0.0.1:27017/aarav_taskhub).
 * Dates are relative to the run day; the RNG is seeded (20261103) so repeated runs match.
 */
"use strict";

const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

global.moment = require("moment");
global.chalk = require("chalk");
// helpers/common.js verifies an SMTP transport on load; a seed must never touch a real mail server.
process.env.SMTP_HOST = process.env.SMTP_HOST || "127.0.0.1";
process.env.SMTP_PORT = process.env.SMTP_PORT || "1";
process.env.SMTP_USER = process.env.SMTP_USER || "seed";
process.env.SMTP_PASS = process.env.SMTP_PASS || "seed";
dotenv.config({ path: path.resolve(__dirname, "../env/.env.dev") }); // never overrides variables already set

const D = require("./aaravStoryData");

const ARGV = process.argv.slice(2);
const FLAG = (n) => ARGV.includes(`--${n}`);
const RESET = FLAG("reset");
const FORCE = FLAG("force");
const DRY = FLAG("dryRun");
const MATRIX_RESET = FLAG("matrixReset"); // rebuild only the Resource Matrix plan (tagged tasks), relative to today

// ─── Safety: localhost only ──────────────────────────────────────────────────
function assertLocalDb(url) {
  if (!url) throw new Error("DB_URL is not set (export DB_URL=mongodb://127.0.0.1:27017/aarav_taskhub)");
  const m = url.match(/^mongodb(?:\+srv)?:\/\/(?:[^@/]*@)?([^/?]+)/i);
  const hosts = (m ? m[1] : "").split(",").map((h) => h.replace(/:\d+$/, "").replace(/^\[|\]$/g, "").toLowerCase());
  const local = hosts.length > 0 && hosts.every((h) => ["localhost", "127.0.0.1", "::1"].includes(h));
  if (!local && !FORCE) {
    throw new Error(
      `Refusing to seed a non-local database (${hosts.join(",") || "unknown host"}). ` +
        "Point DB_URL at a local mongod, or pass --force if you really mean it."
    );
  }
  return local;
}

// ─── Deterministic helpers ───────────────────────────────────────────────────
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20261103);
const rint = (a, b, r = rng) => Math.floor(r() * (b - a + 1)) + a;
const pick = (arr, r = rng) => arr[Math.floor(r() * arr.length)];
const chance = (p, r = rng) => r() < p;
const hashStr = (s) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);
const pad2 = (n) => String(n).padStart(2, "0");

const oid = (kind, n) =>
  new mongoose.Types.ObjectId("6730a4a4a4a4a4a4" + kind.toString(16).padStart(2, "0") + n.toString(16).padStart(6, "0"));
const OID = { employee: 1, client: 2, project: 3, milestone: 4 };

const now = new Date();
const TODAY = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
const day = (n, hour = 0, min = 0) => new Date(TODAY.getTime() + n * 86400000 + hour * 3600000 + min * 60000);
const ymd = (d) => d.toISOString().slice(0, 10);
const isWeekend = (d) => d.getUTCDay() === 0 || d.getUTCDay() === 6;

// India 2026 public holidays (approximate dates; same list is meant for all products)
const HOLIDAYS_2026 = [
  ["New Year's Day", "2026-01-01"], ["Makar Sankranti / Uttarayan", "2026-01-14"], ["Republic Day", "2026-01-26"], ["Holi", "2026-03-04"],
  ["Gudi Padwa / Ugadi", "2026-03-19"], ["Eid-ul-Fitr", "2026-03-21"], ["Ram Navami", "2026-03-26"], ["Good Friday", "2026-04-03"],
  ["Dr. Ambedkar Jayanti", "2026-04-14"], ["Maharashtra Day / Gujarat Day", "2026-05-01"], ["Bakrid", "2026-05-28"],
  ["Independence Day", "2026-08-15"], ["Ganesh Chaturthi", "2026-09-14"], ["Gandhi Jayanti", "2026-10-02"], ["Dussehra", "2026-10-20"],
  ["Diwali", "2026-11-08"], ["Gujarati New Year (Bestu Varas)", "2026-11-10"], ["Guru Nanak Jayanti", "2026-11-24"], ["Christmas", "2026-12-25"],
];
const HOLIDAY_SET = new Set(HOLIDAYS_2026.map((h) => h[1]));

const log = (...a) => console.log(...a);
const step = (t) => log(global.chalk.cyan(`\n${t}`));

// ─── Models ──────────────────────────────────────────────────────────────────
let M = {};
function loadModels() {
  require("../models");
  require("../models/projectexpanses");
  require("../models/holidays");
  require("../models/notifications");
  const g = (n) => mongoose.model(n);
  M = {
    Company: g("companies"), Employee: g("employees"), Client: g("pmsclients"), Role: g("pms_roles"), Resource: g("resource"),
    RolePermission: g("role_permissions"), ProjectTab: g("project_tabs"), ProjectTabSetting: g("project_tabs_settings"),
    ProjectStatus: g("projectstatus"), Workflow: g("projectworkflows"), WfStatus: g("workflowstatus"), BugWf: g("bugsworkflowstatus"),
    ProjectType: g("projecttypes"), ProjectTech: g("projecttechs"), Label: g("tasklabels"), Project: g("projects"),
    Folder: g("filefolders"), TimeSheet: g("projecttimesheets"), Milestone: g("projectmilestones"), Submission: g("projecttimesheetsubmissions"),
    MainTask: g("projectmaintasks"), Task: g("projecttasks"), SubTask: g("projectsubtasks"), Comment: g("Comments"),
    HourLog: g("projecttaskhourlogs"), TotalHours: g("projecttotaltaskhourlogs"), ApprovedHours: g("approvedHours"),
    LogComment: g("loghoursComments"), Bug: g("projecttaskbugs"), BugComment: g("bugscomments"), File: g("fileuploads"),
    NoteBook: g("notebook"), Note: g("notes_pms"), NoteComment: g("NotesComments"), Discussion: g("discussionstopics"),
    TopicDetail: g("discussionstopicsdetails"), Expense: g("projectexpanses"), Complaint: g("complaints"),
    ComplaintStatus: g("complaints_status"), ComplaintComment: g("complaints_comments"), Feedback: g("consumer_feedback_forms"),
    Review: g("reviews"), Notification: g("notifications"), ActivityLog: g("activitylogs"), Holiday: g("holidays"),
    Dept: g("empdepartments"), Desig: g("empdesignations"), InOut: g("employeeInOutTimes"), Star: g("star_project"),
    Recent: g("recent_visited_data"), Timer: g("tasktimers"), History: g("taskupdatehistory"),
  };
}

const audit = (by, at = new Date()) => ({
  createdBy: by, updatedBy: by, createdByModel: "employees", updatedByModel: "employees", createdAt: at, updatedAt: at,
});
const auditPlain = (by, at = new Date()) => ({ createdBy: by, updatedBy: by, createdAt: at, updatedAt: at });

// ─── Global reference rows (only created when missing; they exist in a real Taskhub DB) ─────────
async function ensureGlobals(authorId) {
  const roleIds = require("../settings/role.json");
  const rolesCfg = require("../settings/config.json").PMS_ROLES;
  for (const name of Object.values(rolesCfg).filter((n) => n !== "Super Admin")) {
    if (!(await M.Role.exists({ role_name: name }))) {
      const _id = roleIds[name] ? new mongoose.Types.ObjectId(roleIds[name]) : new mongoose.Types.ObjectId();
      await M.Role.create({ _id, role_name: name, createdBy: authorId, updatedBy: authorId });
      log(`   + global role ${name}`);
    }
  }
  const { ALL_PERMISSION_NAMES } = require("../helpers/permissionCatalog");
  const have = new Set((await M.Resource.find({ isDeleted: false }).select("resource_name").lean()).map((r) => r.resource_name));
  const missing = ALL_PERMISSION_NAMES.filter((n) => !have.has(n));
  if (missing.length) {
    await M.Resource.insertMany(missing.map((resource_name) => ({ resource_name, isDefault: true, createdBy: authorId, updatedBy: authorId })));
    log(`   + ${missing.length} global permission resources`);
  }
  const { DEFAULT_DATA } = require("../helpers/constant");
  for (const name of Object.values(DEFAULT_DATA.PROJECT_TABS)) {
    if (!(await M.ProjectTab.exists({ name, isDeleted: false }))) await M.ProjectTab.create({ name, createdBy: authorId, updatedBy: authorId });
  }
}

// ─── Tenant wipe (only rows that belong to the Aarav company) ───────────────────────────────
async function wipeTenant(companyId) {
  const ids = async (Model, where) => (await Model.find(where).select("_id").lean()).map((d) => d._id);
  const projectIds = await ids(M.Project, { companyId });
  const empIds = await ids(M.Employee, { companyId });
  const clientIds = await ids(M.Client, { companyId });
  const complaintIds = await ids(M.Complaint, { companyId });
  const taskIds = projectIds.length ? await ids(M.Task, { project_id: { $in: projectIds } }) : [];
  const bugIds = projectIds.length ? await ids(M.Bug, { project_id: { $in: projectIds } }) : [];
  const noteIds = projectIds.length ? await ids(M.Note, { project_id: { $in: projectIds } }) : [];
  const logIds = projectIds.length ? await ids(M.HourLog, { project_id: { $in: projectIds } }) : [];
  const wfIds = await ids(M.Workflow, { companyId });
  const counts = {};
  const del = async (name, Model, where) => {
    const r = await Model.deleteMany(where);
    if (r.deletedCount) counts[name] = r.deletedCount;
  };
  if (projectIds.length) {
    const byProject = { project_id: { $in: projectIds } };
    for (const [n, Mdl] of [
      ["milestones", M.Milestone], ["main tasks", M.MainTask], ["tasks", M.Task], ["subtasks", M.SubTask], ["hour logs", M.HourLog],
      ["project timesheets", M.TimeSheet], ["folders", M.Folder], ["bugs", M.Bug], ["notebooks", M.NoteBook], ["notes", M.Note],
      ["discussions", M.Discussion], ["discussion details", M.TopicDetail], ["history", M.History], ["notifications", M.Notification],
      ["reviews", M.Review], ["stars", M.Star], ["recent visits", M.Recent], ["tab settings", M.ProjectTabSetting],
      ["expenses", M.Expense], ["files", M.File], ["timesheet submissions", M.Submission],
    ]) await del(n, Mdl, byProject);
  }
  if (bugIds.length) await del("bug comments", M.BugComment, { bug_id: { $in: bugIds } });
  if (taskIds.length) {
    await del("task comments", M.Comment, { task_id: { $in: taskIds } });
    await del("timers", M.Timer, { task_id: { $in: taskIds } });
  }
  if (logIds.length) await del("hour comments", M.LogComment, { logged_hour_id: { $in: logIds } });
  if (noteIds.length) await del("note comments", M.NoteComment, { note_id: { $in: noteIds } });
  if (complaintIds.length) {
    await del("complaint status", M.ComplaintStatus, { complaint_id: { $in: complaintIds } });
    await del("complaint comments", M.ComplaintComment, { complaint_id: { $in: complaintIds } });
    await del("feedback forms", M.Feedback, { complaint_id: { $in: complaintIds } });
  }
  if (empIds.length) {
    await del("approved hours", M.ApprovedHours, { employee_id: { $in: empIds } });
    await del("hour totals", M.TotalHours, { employee_id: { $in: empIds } });
    await del("in/out", M.InOut, { employee_id: { $in: empIds } });
    await del("holidays", M.Holiday, { createdBy: { $in: empIds } });
    await del("timesheet submissions (emp)", M.Submission, { employee_id: { $in: empIds } });
  }
  await del("submissions", M.Submission, { companyId });
  if (wfIds.length) await del("workflow stages", M.WfStatus, { workflow_id: { $in: wfIds } });
  for (const [n, Mdl] of [
    ["projects", M.Project], ["complaints", M.Complaint], ["workflows", M.Workflow], ["project statuses", M.ProjectStatus],
    ["bug stages", M.BugWf], ["project types", M.ProjectType], ["project techs", M.ProjectTech], ["labels", M.Label],
    ["departments", M.Dept], ["designations", M.Desig], ["role permissions", M.RolePermission], ["activity logs", M.ActivityLog],
    ["clients", M.Client], ["employees", M.Employee],
  ]) await del(n, Mdl, { companyId });
  void clientIds;
  await del("company", M.Company, { _id: companyId });
  // physical placeholder files written by this seed
  for (const dir of ["folderWise", "projectTask", "comments"]) {
    const p = path.resolve(__dirname, "../public", dir);
    if (fs.existsSync(p)) fs.readdirSync(p).filter((f) => f.startsWith("aarav_")).forEach((f) => fs.unlinkSync(path.join(p, f)));
  }
  return counts;
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const isLocal = assertLocalDb(process.env.DB_URL);
  log(`Aarav Enterprises seed | db=${isLocal ? "local" : "REMOTE (--force)"} | reset=${RESET} | dryRun=${DRY} | today=${ymd(TODAY)}`);
  await mongoose.connect(process.env.DB_URL, { serverSelectionTimeoutMS: 8000 });
  loadModels();
  const db = mongoose.connection.db;
  const companyId = new mongoose.Types.ObjectId(D.COMPANY.id);
  const markerKey = `aarav-seed:${D.COMPANY.id}`;
  const migrations = db.collection("app_migrations");

  const clash = await M.Company.findOne({ companyDomain: D.COMPANY.domain, _id: { $ne: companyId } }).lean();
  if (clash) throw new Error(`companyDomain "${D.COMPANY.domain}" is used by another company (${clash._id}); refusing to continue`);

  const already = await migrations.findOne({ key: markerKey });
  if (already && !RESET) {
    log(`Already seeded on ${already.ranAt.toISOString()} (idempotent no-op). Use --reset to rebuild the Aarav tenant.`);
    if (!DRY) {
      step("Resource Matrix plan (additive, tagged)");
      await require("./lib/matrixPlan").seedMatrixPlan({ mongoose, companyId, today: TODAY, log, reset: MATRIX_RESET, syntheticLeave: true, adminId: oid(OID.employee, 1) });
    }
    return;
  }
  if (DRY) {
    log("Dry run: would (re)create company, 56 employees, 6 clients, 4 projects x 7 milestones, tasks, hours, timesheets ...");
    return;
  }

  const hadTenant = await M.Company.exists({ _id: companyId });
  if (hadTenant || already) {
    step(RESET ? "Reset: removing the Aarav tenant" : "Found a partial earlier run: cleaning the Aarav tenant first");
    log("   removed:", JSON.stringify(await wipeTenant(companyId)));
    await migrations.deleteOne({ key: markerKey });
  }

  // ── Company + admin (createCompany.js flow with a fixed id) ──────────────
  step("Company, global reference data");
  const adminId = oid(OID.employee, 1);
  await ensureGlobals(adminId);
  const roleByName = Object.fromEntries((await M.Role.find({ isDeleted: false }).lean()).map((r) => [r.role_name, r]));
  for (const r of ["Admin", "User", "TL", "PC", "AM", "Client"]) if (!roleByName[r]) throw new Error(`PMS role ${r} missing`);

  await M.Company.create({ _id: companyId, companyName: D.COMPANY.name, companyDomain: D.COMPANY.domain, plan: "enterprise", maxUsers: 200, currency: "INR", isActive: true });
  log(`   company ${D.COMPANY.name} (${companyId})`);

  // ── People ────────────────────────────────────────────────────────────────
  step("Employees (56)");
  const people = buildPeople();
  const emailOf = (p) => p.email;
  for (const p of people) {
    p._id = oid(OID.employee, Number(p.code.slice(2)));
    await new M.Employee({
      _id: p._id, companyId, first_name: p.first, last_name: p.last, full_name: p.name, email: emailOf(p),
      phone_number: p.phone, password: D.COMPANY.password, pms_role_id: roleByName[p.role]._id,
      isActivate: true, isAdmin: p.role === "Admin", createdBy: adminId, updatedBy: adminId,
      createdAt: day(p.joinOffset), updatedAt: day(p.joinOffset),
    }).save(); // md5 via pre-save hook
  }
  const byCode = Object.fromEntries(people.map((p) => [p.code, p]));
  const adminP = byCode.AA001;

  // Departments / designations (org_id = company id), extra HR-style fields written raw (not in the Mongoose schema)
  const deptNames = ["Management", "HR", "Sales", "Delivery", "Engineering", "QA", "Design", "DevOps", "Finance"];
  const depts = await M.Dept.insertMany(deptNames.map((department_name) => ({ companyId, org_id: companyId, department_name, ...auditPlain(adminId) })));
  const deptId = Object.fromEntries(depts.map((d) => [d.department_name, d._id]));
  const desigNames = [...new Set(people.map((p) => p.title))];
  const desigs = await M.Desig.insertMany(desigNames.map((designation_name) => ({ companyId, org_id: companyId, designation_name, ...auditPlain(adminId) })));
  const desigId = Object.fromEntries(desigs.map((d) => [d.designation_name, d._id]));
  await M.Employee.collection.bulkWrite(
    people.map((p) => ({
      updateOne: {
        filter: { _id: p._id },
        update: { $set: {
          emp_code: p.code, joining_date: day(p.joinOffset), department_id: deptId[p.dept], designation_id: desigId[p.title],
          reporting_manager: p.manager ? byCode[p.manager]._id : null, branch: p.branch, monthly_ctc: p.ctc,
          skills: p.skills, employment_details: { total_experience_before_elsner: p.expBefore },
        } },
      },
    }))
  );
  log(`   ${people.length} employees, ${depts.length} departments, ${desigs.length} designations`);

  // ── Permissions for the new company (registration flow) ───────────────────
  const commonHelpers = require("../helpers/common");
  await commonHelpers.addDefaultPermission(companyId, adminId);
  await commonHelpers.addDefaultProjectStatus(companyId, adminId);
  await commonHelpers.addDefaultWorkflowandStages(companyId, adminId);
  await grantDemoPermissions(companyId, adminId, roleByName);
  log("   default role permissions, project statuses, Standard workflow + demo role grants");

  // ── Clients, types, techs, labels, bug stages ─────────────────────────────
  step("Clients, project types / technologies / labels / bug stages");
  const clientByCode = {};
  let ci = 0;
  for (const c of D.CUSTOMERS) {
    ci++;
    const [fn, ln] = c.contact;
    const cl = await new M.Client({
      _id: oid(OID.client, ci), companyId, first_name: fn, last_name: ln, full_name: `${fn} ${ln}`, company_name: c.name,
      email: `${fn.toLowerCase().replace(/[^a-z]/g, "")}.${ln.toLowerCase()}@${c.domain}`, phone_number: `+91 9${rint(100000000, 999999999)}`,
      password: D.COMPANY.clientPassword, plain_password: D.COMPANY.clientPassword, pms_role_id: roleByName.Client._id,
      address: { city: c.city, country: "India" }, isActivate: true, createdBy: adminId, updatedBy: adminId,
      createdAt: day(-300 + ci * 5), updatedAt: day(-300 + ci * 5),
    }).save();
    clientByCode[c.code] = cl;
  }
  const typeNames = [...new Set(D.PROJECTS.flatMap((p) => p.types))];
  const techNames = [...new Set(D.PROJECTS.flatMap((p) => p.tech))];
  const types = await Promise.all(typeNames.map((project_type) => new M.ProjectType({ companyId, project_type, ...auditPlain(adminId) }).save()));
  const techs = await M.ProjectTech.insertMany(techNames.map((project_tech) => ({ companyId, project_tech, ...auditPlain(adminId) })));
  const typeId = Object.fromEntries(types.map((t) => [t.project_type, t._id]));
  const techId = Object.fromEntries(techs.map((t) => [t.project_tech, t._id]));
  const labels = await M.Label.insertMany(D.LABELS.map((l) => ({ companyId, ...l, project_id: null, ...auditPlain(adminId) })));
  const labelId = Object.fromEntries(labels.map((l) => [l.title, l._id]));
  const bugStages = await M.BugWf.insertMany(
    [["To-Do", "#64748b", true], ["In Progress", "#3b82f6"], ["To be Tested", "#f59e0b"], ["On Hold", "#f97316"], ["Closed", "#22c55e"]].map(([title, color, isDefault], i) => ({
      companyId, title, color, sequence: i + 1, isDefault: !!isDefault, createdBy: adminId, updatedBy: adminId,
    }))
  );
  const bugStage = Object.fromEntries(bugStages.map((s) => [s.title, s._id]));
  const workflow = await M.Workflow.findOne({ companyId, project_workflow: "Standard" }).lean();
  const stages = Object.fromEntries((await M.WfStatus.find({ workflow_id: workflow._id }).lean()).map((s) => [s.title, s._id]));
  const projStatus = Object.fromEntries((await M.ProjectStatus.find({ companyId }).lean()).map((s) => [s.title, s._id]));
  const tabs = await M.ProjectTab.find({ isDeleted: false }).lean();

  // ── Projects, milestones, task lists, tasks ───────────────────────────────
  step("Projects, milestones, task lists, tasks, subtasks, comments, files");
  const ctx = {
    companyId, adminId, byCode, people, clientByCode, typeId, techId, labelId, bugStage, stages, workflow, projStatus, tabs,
    placeholders: [], notifications: [], counters: { task: 0, sub: 0, bug: 0 },
  };
  const built = [];
  let pi = 0;
  for (const spec of D.PROJECTS) {
    pi++;
    built.push(await buildProject(ctx, spec, pi));
  }

  // ── Hours, timesheets ─────────────────────────────────────────────────────
  step("Project-wise hour logs, monthly rollups, timesheet approvals");
  const hoursSummary = await buildHours(ctx, built);
  await scalePlannedHours(ctx, built, hoursSummary);

  // ── Everything else a client screen touches ───────────────────────────────
  step("Bugs, notes, discussions, expenses, complaints, reviews");
  await buildCollaboration(ctx, built);
  step("Notifications, activity logs, holidays, attendance, stars, recent visits, timers, trash");
  await buildMisc(ctx, built, hoursSummary);

  await migrations.insertOne({ key: markerKey, ranAt: new Date(), companyId });
  step("Resource Matrix plan (additive, tagged)");
  await require("./lib/matrixPlan").seedMatrixPlan({ mongoose, companyId, today: TODAY, log, reset: true, syntheticLeave: true, adminId });
  await printSummary(companyId, built, hoursSummary);
}

// ─── People ──────────────────────────────────────────────────────────────────
function buildPeople() {
  // People master = scripts/data/aaravRoster.json (generated from the HRMS seed; identical in every product).
  const ROSTER = require("./data/aaravRoster.json");
  const prng = mulberry32(20261103 ^ 0xa11ce); // only phone + prior experience (not pinned by the roster)
  const coreByCode = Object.fromEntries(D.CORE_PEOPLE.map((p) => [p.code, p]));
  const people = ROSTER.map((r, i) => {
    const core = coreByCode[r.empCode];
    const phone = `+91 9${rint(100000000, 999999999, prng)}`;
    const expBefore = rint(0, 9, prng);
    return {
      code: r.empCode, name: r.fullName, first: r.firstName, last: r.lastName, email: r.email,
      role: core ? core.role : "User", title: r.title, dept: r.department, group: core ? core.group : r.skillGroup,
      skills: r.skills.map((s) => s.name), ctc: r.monthlyCtc, branch: r.branch, phone,
      joinOffset: r.joiningDateOffsetDays, expBefore, manager: r.managerCode,
      hourly: r.monthlyCtc / (22 * 8),
    };
  });
  people.forEach((p) => {
    if (p.code === "AA004" || p.code === "AA003") p.group = "pm";
  });
  return people.sort((a, b) => a.code.localeCompare(b.code));
}

// Extra permissions per role so every screen / action in the story is reachable.
async function grantDemoPermissions(companyId, adminId, roleByName) {
  const { MODULES } = require("../helpers/permissionCatalog");
  const all = (m) => Object.values(MODULES[m]);
  const crud = (m) => ["view", "add", "edit", "delete"].map((a) => MODULES[m][a]);
  const grants = {
    PC: [...all("projects"), ...all("tasks"), ...all("bugs"), ...all("timesheet"), ...crud("expense"), ...crud("feedback"), "reports_view", "people_view"],
    AM: [...crud("projects").slice(0, 3), "tasks_view", "bugs_view", ...crud("expense"), ...crud("feedback"), "reports_view", "people_view"],
    TL: ["projects_view", "tasks_view", "task_add", "task_edit", "task_delete", "tasks_manage", ...crud("bugs"), "reports_view", ...crud("feedback")],
    User: ["tasks_view", "task_add", "task_edit", "bugs_view", "bug_add", "bug_edit"],
  };
  const resources = await M.Resource.find({ isDeleted: false }).select("_id resource_name").lean();
  const idOf = Object.fromEntries(resources.map((r) => [r.resource_name, r._id]));
  for (const [role, names] of Object.entries(grants)) {
    const have = new Set((await M.RolePermission.find({ companyId, pms_role_id: roleByName[role]._id }).select("resource_id").lean()).map((r) => String(r.resource_id)));
    const rows = [...new Set(names)].filter((n) => idOf[n] && !have.has(String(idOf[n]))).map((n) => ({
      companyId, pms_role_id: roleByName[role]._id, resource_id: idOf[n], createdBy: adminId, updatedBy: adminId,
    }));
    if (rows.length) await M.RolePermission.insertMany(rows);
  }
}

// ─── Projects ────────────────────────────────────────────────────────────────
async function buildProject(ctx, spec, pi) {
  const { companyId, adminId, byCode, stages } = ctx;
  const P = (code) => byCode[code];
  const customer = D.CUSTOMERS.find((c) => c.code === spec.customer);
  const client = ctx.clientByCode[spec.customer];
  const manager = P(spec.manager);
  const kavita = P("AA006");
  const teamMembers = spec.team.map(([code, pct, segments]) => ({ person: P(code), pct, segments: segments || null }));
  const created = day(spec.start - 15);
  const closed = spec.status === "Closed";

  const proj = await M.Project.create({
    _id: oid(OID.project, pi), companyId, title: spec.title, projectId: `#${100000 + pi * 7919 % 899999}`, color: spec.color,
    descriptions: spec.descriptions, technology: spec.tech.map((t) => ctx.techId[t]), project_type: ctx.typeId[spec.types[0]],
    project_status: ctx.projStatus[closed ? "Closed" : "Active"], manager: manager._id, acc_manager: kavita._id,
    // Team Manager (submits milestones; the Project Manager approves): the allocated Team Manager (AA009, Sneha Iyer) when she is on the team.
    team_manager: teamMembers.some((t) => t.person.code === "AA009") ? P("AA009")._id : undefined,
    assignees: [...new Map([...teamMembers.map((t) => t.person._id), manager._id, kavita._id].map((id) => [String(id), id])).values()],
    pms_clients: [client._id], workFlow: ctx.workflow._id, estimatedHours: String(spec.estimatedHours), isBillable: true, isBugsEnabled: !!spec.bugs,
    start_date: day(spec.start), end_date: day(spec.end), recurringType: "", externalRef: spec.code, projectValue: spec.value,
    custom_fields: { aaravSeed: true, billingModel: "Milestone", customer: customer.name },
    ...audit(manager._id, created),
  });
  // Default folder + timesheet (projects.addProjectDefaultData) and extra folders
  const folders = await M.Folder.insertMany(
    [[spec.title, true], ["Requirements", false], ["Design", false], ["Deliverables", false]].map(([name, isDefault]) => ({
      name, isDefault, project_id: proj._id, ...auditPlain(manager._id, created),
    }))
  );
  const timesheet = await M.TimeSheet.create({ title: `${spec.title} - Timesheet`, isDefault: true, project_id: proj._id, ...auditPlain(manager._id, created) });
  await M.ProjectTabSetting.insertMany(
    ctx.tabs.map((t) => ({ project_id: proj._id, tab_id: t._id, isEnable: true, isDefault: t.name === "Tasks", ...auditPlain(manager._id, created) }))
  );

  // Milestones
  const milestones = [];
  for (let i = 0; i < D.MILESTONES.length; i++) {
    const def = D.MILESTONES[i];
    const s = spec.ms[i];
    const approved = s.status === "Approved";
    const evidence = [];
    const evCount = s.evidence ?? (approved ? 1 + (i % 2) : 0);
    for (let e = 0; e < evCount; e++) {
      const nm = `${def.key}_${["Deliverable_Summary", "Test_Report", "Demo_Recording", "Figma_Link"][e % 4]}`;
      evidence.push({ name: `${nm}${e % 4 === 3 ? "" : ".pdf"}`, url: e % 4 === 3 ? `https://www.figma.com/file/aarav-${spec.code.toLowerCase()}-${def.key.toLowerCase()}` : `/public/folderWise/aarav_${spec.code}_${nm}.pdf`, type: e % 4 === 3 ? "link" : "file", addedAt: day(s.submitted ?? s.approved ?? s.due) });
    }
    const submittedAt = s.submitted != null ? day(s.submitted, 11) : approved ? day(s.approved - 2, 11) : null;
    const approvedAt = approved ? day(s.approved, 15, 30) : null;
    const history = [{ action: "created", status: "Not Started", by: manager._id, at: created }];
    if (submittedAt) history.push({ action: "submitted", status: "Submitted", by: P(spec.teamManager)._id, at: submittedAt, note: s.note || "Deliverables ready for review." });
    if (s.rework && !s.returned) history.push({ action: "returned", status: "Rework Required", by: manager._id, at: new Date(submittedAt.getTime() + 86400000), note: "Minor changes requested; reworked and resubmitted." });
    if (s.returned != null) history.push({ action: "returned", status: "Rework Required", by: manager._id, at: day(s.returned, 10), note: s.reviewNote });
    if (approved) history.push({ action: "approved", status: "Approved", by: manager._id, at: approvedAt });
    milestones.push({
      _id: oid(OID.milestone, pi * 10 + i + 1), companyId, project_id: proj._id, key: def.key, title: def.title, sequence: i + 1,
      description: `${def.key}: ${def.title} (${def.weight}% of project value${def.billingPercent ? `, ${def.billingPercent}% billing trigger` : ""}).`,
      weight: def.weight, billingPercent: def.billingPercent, dueDate: day(s.due), status: s.status, evidence,
      submitNote: s.note || (submittedAt ? "Deliverables ready for review." : ""), submittedBy: submittedAt ? P(spec.teamManager)._id : null, submittedAt,
      reviewNote: s.reviewNote || "", reviewedBy: approved || s.returned != null ? manager._id : null,
      reviewedAt: approved ? approvedAt : s.returned != null ? day(s.returned, 10) : null, reworkCount: s.rework || 0,
      approvedBy: approved ? manager._id : null, approvedAt,
      crmSyncStatus: approved ? "synced" : "none", crmSyncedAt: approved ? new Date(approvedAt.getTime() + 60000) : null, crmSyncAttempts: approved ? 1 : 0, crmSyncError: "",
      history, ...audit(manager._id, created),
    });
  }
  await M.Milestone.insertMany(milestones);

  // Task lists / tasks per milestone
  const tm = P(spec.teamManager);
  const pool = (group) => teamMembers.filter((t) => t.person.group === group).map((t) => t.person);
  const devs = teamMembers.filter((t) => ["magento", "php", "mobile", "react"].includes(t.person.group)).map((t) => t.person);
  const roleFor = (disc, key, i) => {
    if (disc === "pm") return manager;
    if (disc === "design") return pool("design")[0] || tm;
    if (disc === "qa") return pool("qa")[0] || devs[i % devs.length];
    if (disc === "devops") return pool("devops")[0] || devs[0];
    // dev: backend-ish milestones prefer magento/php/react, frontend-ish prefer mobile/react/magento
    const pref = key === "M4" ? ["mobile", "react", "magento", "php"] : ["magento", "php", "react", "mobile"];
    const ranked = devs.slice().sort((a, b) => pref.indexOf(a.group) - pref.indexOf(b.group));
    const top = ranked.filter((d) => pref.indexOf(d.group) <= pref.indexOf(ranked[0].group) + 1);
    return top[i % top.length];
  };
  const tasks = [];
  const taskDocs = [];
  const subDocs = [];
  const commentDocs = [];
  const historyDocs = [];
  const fileDocs = [];
  let prevDue = spec.start;
  for (let mi = 0; mi < D.MILESTONES.length; mi++) {
    const def = D.MILESTONES[mi];
    const s = spec.ms[mi];
    const winStart = prevDue;
    const winEnd = s.due;
    prevDue = s.due;
    const listStatus = s.status === "Approved" ? "Done" : s.status === "Not Started" ? "To-Do" : "In Progress";
    const main = await M.MainTask.create({
      title: `${def.key} - ${def.title}`, project_id: proj._id, subscribers: [manager._id, tm._id], task_status: stages[listStatus],
      task_status_history: [{ task_status: stages[listStatus], updatedBy: manager._id, updatedAt: day(winStart) }],
      ...audit(manager._id, day(winStart - 2)),
    });
    const defs = D.TASKS_BY_MILESTONE[def.key];
    defs.forEach(([title, disc], ti) => {
      const assignee = roleFor(disc, def.key, ti + mi);
      const span = Math.max(3, winEnd - winStart);
      const tStart = winStart + Math.floor((span * ti) / defs.length);
      const tDue = Math.min(winEnd, tStart + Math.max(2, Math.floor(span / defs.length) + 2));
      const frac = ti / defs.length;
      let st;
      if (s.status === "Approved") st = "Done";
      else if (s.status === "Submitted") st = ti === defs.length - 1 ? "Ready for Review" : "Done";
      else if (s.status === "Rework Required") st = ti < defs.length - 3 ? "Done" : ti === defs.length - 3 ? "In Progress" : ti === defs.length - 2 ? "Ready for Review" : "To-Do";
      else if (s.status === "In Progress") st = frac < 0.4 ? "Done" : frac < 0.7 ? "In Progress" : "To-Do";
      else st = "To-Do";
      const est = pick([4, 6, 8, 12, 16, 24, 32]);
      ctx.counters.task++;
      const id = new mongoose.Types.ObjectId();
      const createdAt = day(Math.min(tStart, 0) - 2);
      const doc = {
        _id: id, title, project_id: proj._id, main_task_id: main._id, taskId: `#${200000 + ctx.counters.task * 13}`,
        priority: pick(["Low", "Medium", "Medium", "High"]), descriptions: `<p>${title} for <strong>${customer.name}</strong> (${def.key}: ${def.title}).</p>`,
        task_labels: [ctx.labelId[{ pm: "Documentation", design: "Design", qa: "QA", devops: "DevOps", dev: def.key === "M4" && spec.types[0] === "Mobile App" ? "Mobile" : def.key === "M4" ? "Frontend" : "Backend" }[disc]]],
        start_date: day(tStart), due_date: day(tDue), end_date: st === "Done" ? day(tDue) : null, assignees: [assignee._id],
        estimated_hours: String(est), estimated_minutes: "00", task_progress: st === "Done" ? "100" : st === "Ready for Review" ? "90" : st === "In Progress" ? String(rint(30, 70)) : "0",
        task_status: stages[st], task_status_history: [{ task_status: stages["To-Do"], updatedBy: manager._id, updatedAt: createdAt }, ...(st !== "To-Do" ? [{ task_status: stages[st], updatedBy: assignee._id, updatedAt: day(tDue) }] : [])],
        recurringType: "", custom_fields: {}, ...audit(manager._id, createdAt),
      };
      taskDocs.push(doc);
      tasks.push({ ...doc, mi, disc, assignee, tStart, tDue, st });
      historyDocs.push({ project_id: proj._id, main_task_id: main._id, task_id: id, updated_key: "createdAt", ...audit(manager._id, createdAt) });
      const started = st !== "To-Do";
      if (started && chance(0.55)) {
        for (let s2 = 0; s2 < rint(1, 3); s2++) {
          ctx.counters.sub++;
          subDocs.push({
            title: pick(D.SUBTASK_TITLES), project_id: proj._id, main_task_id: main._id, task_id: id, subTaskId: `#${300000 + ctx.counters.sub * 11}`,
            assignees: [assignee._id], start_date: day(tStart), due_date: day(tDue), estimated_hours: String(rint(1, 6)), estimated_minutes: "00",
            task_status: st === "Done" ? stages.Done : stages["In Progress"], task_progress: st === "Done" ? "100" : "40",
            ...auditPlain(assignee._id, day(tStart)),
          });
        }
      }
      if (started) {
        const n = rint(0, 3);
        for (let c = 0; c < n; c++) {
          const by = chance(0.6) ? assignee : chance(0.5) ? manager : tm;
          const at = day(Math.min(-1, tStart + c + 1), 10 + c);
          commentDocs.push({
            comment: `<p>${pick(D.COMMENTS)}</p>`, task_id: id, employee_id: by._id, taggedUsers: by._id === manager._id ? [assignee._id] : [manager._id],
            ...audit(by._id, at),
          });
        }
      }
      if (started && chance(0.18)) {
        const [fname, ext] = pick(D.FILE_NAMES);
        const stored = `aarav_${spec.code}_${fname}_t${ctx.counters.task}${ext}`;
        ctx.placeholders.push(["projectTask", stored, `${fname}${ext} for ${title}`]);
        fileDocs.push({
          name: `${fname}${ext}`, file_type: ext, path: `public/projectTask/${stored}`, file_section: "Tasks", project_id: proj._id, companyId, folder_id: null,
          task_id: id, subscribers: [assignee._id], pms_clients: [], file_size: rint(40, 900) * 1024, ...audit(assignee._id, day(Math.min(-1, tStart + 1), 12)),
        });
      }
    });
  }
  // Recurring governance list (monthly recurring tasks)
  const gov = await M.MainTask.create({
    title: "Recurring - Project Governance", project_id: proj._id, subscribers: [manager._id], task_status: stages["In Progress"], ...audit(manager._id, created),
  });
  if (!closed) {
    ["Monthly status report to client", "Monthly timesheet review and approval", "Monthly risk and budget review"].forEach((title, k) => {
      ctx.counters.task++;
      const id = new mongoose.Types.ObjectId();
      const owner = k === 1 ? manager : k === 0 ? manager : tm;
      taskDocs.push({
        _id: id, title, project_id: proj._id, main_task_id: gov._id, taskId: `#${200000 + ctx.counters.task * 13}`, priority: "Medium", descriptions: `<p>${title}.</p>`,
        task_labels: [ctx.labelId.Documentation], start_date: day(-5), due_date: day(10), assignees: [owner._id], estimated_hours: "4", estimated_minutes: "00",
        task_progress: "50", task_status: stages["In Progress"], task_status_history: [{ task_status: stages["In Progress"], updatedBy: owner._id, updatedAt: day(-5) }],
        recurringType: "monthly", ...audit(manager._id, day(-30)),
      });
    });
  }

  await M.Task.insertMany(taskDocs);
  if (subDocs.length) await M.SubTask.insertMany(subDocs);
  if (commentDocs.length) await M.Comment.insertMany(commentDocs);
  if (historyDocs.length) await M.History.insertMany(historyDocs);

  // Project files (Files tab) incl. milestone evidence files
  const evFiles = milestones.flatMap((m) => m.evidence.filter((e) => e.type === "file").map((e) => ({ m, e })));
  evFiles.forEach(({ m, e }) => {
    const stored = e.url.split("/").pop();
    ctx.placeholders.push(["folderWise", stored, `Evidence ${e.name} (${spec.code} ${m.key})`]);
    fileDocs.push({
      name: e.name, file_type: ".pdf", path: e.url.replace(/^\//, ""), file_section: "Files", project_id: proj._id, companyId, folder_id: folders[3]._id,
      subscribers: [manager._id], file_size: rint(80, 700) * 1024, ...audit(m.submittedBy || manager._id, m.submittedAt || day(spec.start + 10)),
    });
  });
  D.FILE_NAMES.slice(0, closed ? 9 : 8).forEach(([fname, ext], k) => {
    const stored = `aarav_${spec.code}_${fname}${ext}`;
    ctx.placeholders.push(["folderWise", stored, `${fname} - ${spec.title}`]);
    const author = k % 3 === 0 ? manager : k % 3 === 1 ? tm : pick(teamMembers).person;
    fileDocs.push({
      name: `${fname}${ext}`, file_type: ext, path: `public/folderWise/${stored}`, file_section: "Files", project_id: proj._id, companyId,
      folder_id: [folders[0], folders[1], folders[2], folders[3]][k % 4]._id, subscribers: [manager._id, tm._id], pms_clients: [], file_size: rint(60, 1500) * 1024,
      isBookmark: k === 0, ...audit(author._id, day(spec.start + 5 + k * 7 > -1 ? -3 : spec.start + 5 + k * 7, 11)),
    });
  });
  await M.File.insertMany(fileDocs);

  // Milestone notifications for the PM (kept inside the 10-day TTL)
  const recentMs = milestones.filter((m) => m.submittedAt && m.status !== "Not Started").slice(-1);
  recentMs.forEach((m) => {
    ctx.notifications.push({ type: "taskAssign", message: `Milestone ${m.key} "${m.title}" was ${m.status === "Submitted" ? "submitted for your review" : m.status === "Approved" ? "approved" : "returned for rework"} on ${spec.title}`, project_id: proj._id, sender: tm, receivers: [manager], daysAgo: m.status === "Submitted" ? 1 : 4 });
  });

  log(`   ${spec.code}: ${taskDocs.length} tasks, ${subDocs.length} subtasks, ${commentDocs.length} comments, ${fileDocs.length} files, 7 milestones`);
  return { spec, proj, milestones, tasks, teamMembers, manager, tm, folders, timesheet, client, customer, mainCount: 8 };
}

// ─── Hours ───────────────────────────────────────────────────────────────────
const DESCS = ["Worked on", "Implemented", "Reviewed and tested", "Fixed issues in", "Client discussion and changes for", "Documented"];

function leaveSet(code, from, to) {
  const r = mulberry32(hashStr(code));
  const set = new Set();
  for (let d = from; d <= to; d++) if (chance(0.045, r)) set.add(d);
  return set;
}

async function buildHours(ctx, built) {
  const { adminId } = ctx;
  const all = [];
  for (const b of built) {
    const { spec, proj, teamMembers, tasks, timesheet } = b;
    const lastDay = Math.min(-1, spec.end);
    const days = [];
    for (let d = spec.start; d <= lastDay; d++) {
      const dt = day(d);
      if (!isWeekend(dt) && !HOLIDAY_SET.has(ymd(dt))) days.push(d);
    }
    // person-days
    const rows = [];
    for (const t of teamMembers) {
      const leaves = leaveSet(t.person.code, spec.start, lastDay);
      for (const d of days) {
        if (leaves.has(d)) continue;
        const seg = t.segments && t.segments.find((s) => d >= s.from && d <= s.to);
        const pct = seg ? seg.pct : t.pct;
        rows.push({ t, d, pct });
      }
    }
    // Calibrate the per-day hours (bisection on a scale factor, on the FINAL clamped minutes) so the project lands on its
    // pinned target at TRUE roster CTC (hourly = monthlyCtc / 176): total logged hours, approved (past-month) hours, or cost.
    rows.forEach((r) => {
      r.noise = (rng() - 0.5) * 2 * 60 * (r.pct / 100); // +-1h scaled by allocation
      const dt = day(r.d);
      r.cur = dt.getUTCFullYear() === TODAY.getUTCFullYear() && dt.getUTCMonth() === TODAY.getUTCMonth();
    });
    const minsAt = (r, f) => Math.max(30, Math.min(600, Math.round((480 * (r.pct / 100) * f + r.noise) / 5) * 5));
    const measure = (f) => {
      let hrs = 0; let appr = 0; let cost = 0;
      rows.forEach((r) => {
        const h = minsAt(r, f) / 60;
        hrs += h; if (!r.cur) appr += h; cost += h * r.t.person.hourly;
      });
      return { hrs, appr, cost };
    };
    let f = 1;
    const metric = spec.costTarget ? ["cost", spec.costTarget] : spec.approvedHoursTarget ? ["appr", spec.approvedHoursTarget] : spec.hoursTarget ? ["hrs", spec.hoursTarget] : null;
    if (metric) {
      let lo = 0.01; let hi = 3;
      for (let it = 0; it < 60; it++) {
        f = (lo + hi) / 2;
        if (measure(f)[metric[0]] < metric[1]) lo = f; else hi = f;
      }
    }
    b.factor = f;
    const perPersonTasks = {};
    tasks.forEach((tk) => { (perPersonTasks[String(tk.assignee._id)] = perPersonTasks[String(tk.assignee._id)] || []).push(tk); });
    for (const r of rows) {
      const mins = minsAt(r, f);
      const mine = perPersonTasks[String(r.t.person._id)] || [];
      const open = mine.filter((tk) => r.d >= tk.tStart - 1 && r.d <= tk.tDue + 7);
      const candidates = open.length ? open : mine.filter((tk) => tk.tStart <= r.d).slice(-3);
      const tk = candidates.length ? pick(candidates) : pick(tasks);
      all.push({
        employee_id: r.t.person._id, project_id: proj._id, task_id: tk._id, timesheet_id: timesheet._id,
        descriptions: `${pick(DESCS)} ${tk.title.charAt(0).toLowerCase()}${tk.title.slice(1)}`, logged_hours: pad2(Math.floor(mins / 60)),
        logged_minutes: pad2(mins % 60), logged_seconds: "00", logged_date: day(r.d, 12), isManuallyAdded: true, logged_status: "Billable",
        ...audit(r.t.person._id, day(r.d, 18)), _mins: mins, _d: r.d, _code: spec.code, _emp: r.t.person,
      });
    }
  }
  const docs = all.map(({ _mins, _d, _code, _emp, ...doc }) => doc);
  const inserted = [];
  for (let i = 0; i < docs.length; i += 1000) inserted.push(...(await M.HourLog.insertMany(docs.slice(i, i + 1000))));
  inserted.forEach((doc, i) => { all[i]._id = doc._id; });

  // Monthly rollups per employee (all projects), approvedHours for past months
  const monthly = {};
  all.forEach((l) => {
    const dt = day(l._d);
    const key = `${l._emp._id}|${dt.getUTCFullYear()}|${pad2(dt.getUTCMonth() + 1)}`;
    monthly[key] = (monthly[key] || 0) + l._mins;
  });
  const curMonth = `${TODAY.getUTCFullYear()}|${pad2(TODAY.getUTCMonth() + 1)}`;
  const totals = [];
  const approved = [];
  const neha = ctx.byCode.AA004;
  Object.entries(monthly).forEach(([key, mins]) => {
    const [emp, year, month] = key.split("|");
    const hh = Math.floor(mins / 60);
    totals.push({ employee_id: emp, month, year, total_time: `${pad2(hh)}:${pad2(mins % 60)}`, ...audit(new mongoose.Types.ObjectId(emp), new Date(Date.UTC(+year, +month - 1, 1, 9))) });
    if (`${year}|${month}` !== curMonth) {
      approved.push({
        employee_id: emp, approved_by: neha._id, notes: "Approved after timesheet review", approved_hours: String(hh), approved_minutes: String(mins % 60), hours: String(hh), minutes: String(mins % 60),
        month, year, ...audit(neha._id, new Date(Date.UTC(+year, +month, 2, 10))),
      });
    }
  });
  await M.TotalHours.insertMany(totals);
  await M.ApprovedHours.insertMany(approved);

  // Hour-log comments (a few)
  const lc = [];
  for (let i = 0; i < 12; i++) {
    const l = pick(all);
    lc.push({ comment: `<p>${pick(["Please add more detail on the work done.", "Approved, thanks.", "Includes the client call time.", "Billable as per the SOW."])}</p>`, logged_hour_id: l._id, taggedUsers: [], ...audit(ctx.byCode.AA004._id, day(l._d + 1, 10)) });
  }
  await M.LogComment.insertMany(lc);

  // Timesheet approvals (project-wise, per calendar month)
  const groups = {};
  all.forEach((l) => {
    const dt = day(l._d);
    const key = `${l._emp._id}|${l.project_id}|${dt.getUTCFullYear()}|${pad2(dt.getUTCMonth() + 1)}`;
    (groups[key] = groups[key] || { emp: l._emp, project_id: l.project_id, code: l._code, y: dt.getUTCFullYear(), m: dt.getUTCMonth(), mins: 0 }).mins += l._mins;
  });
  const curY = TODAY.getUTCFullYear();
  const curM = TODAY.getUTCMonth();
  // current month: 4 Submitted + 1 Rejected
  const currentPicks = {
    "PRJ-2026-001": { AA012: "Submitted", AA016: "Submitted", AA014: "Submitted" },
    "PRJ-2026-002": { AA037: "Submitted" },
    "PRJ-2026-003": { AA030: "Rejected" },
  };
  const subs = [];
  let sub = { Submitted: 0, Rejected: 0, Approved: 0 };
  Object.values(groups).forEach((g) => {
    const start = new Date(Date.UTC(g.y, g.m, 1));
    const end = new Date(Date.UTC(g.y, g.m + 1, 0, 23, 59, 59, 999));
    const isCurrent = g.y === curY && g.m === curM;
    let status = "Approved";
    let reviewNote = "";
    if (isCurrent) {
      status = (currentPicks[g.code] || {})[g.emp.code];
      if (!status) return; // not submitted yet this month
      if (status === "Rejected") reviewNote = "Hours on two days overlap with approved leave and the descriptions are too generic. Please correct and resubmit.";
    }
    const submittedAt = isCurrent ? day(-1, 17) : new Date(Date.UTC(g.y, g.m + 1, 1, 9, 30));
    subs.push({
      companyId: ctx.companyId, employee_id: g.emp._id, project_id: g.project_id, periodStart: start, periodEnd: end, status, submittedMinutes: g.mins,
      note: isCurrent ? "Monthly timesheet for approval" : "", submittedAt, reviewedBy: status === "Submitted" ? null : ctx.byCode.AA004._id,
      reviewedAt: status === "Submitted" ? null : new Date(submittedAt.getTime() + (isCurrent ? 6 : 28) * 3600000), reviewNote,
      ...audit(g.emp._id, submittedAt),
    });
    sub[status]++;
  });
  await M.Submission.insertMany(subs);
  log(`   ${all.length} hour logs, ${totals.length} monthly rollups, ${approved.length} approved-hours rows`);
  log(`   timesheet submissions: ${sub.Approved} Approved, ${sub.Submitted} Submitted, ${sub.Rejected} Rejected`);
  const perProject = {};
  built.forEach((b) => { perProject[b.spec.code] = all.filter((l) => l._code === b.spec.code); });
  const summary = {};
  built.forEach((b) => {
    const l = perProject[b.spec.code];
    const hrs = l.reduce((s, x) => s + x._mins, 0) / 60;
    const cost = l.reduce((s, x) => s + (x._mins / 60) * x._emp.hourly, 0);
    summary[b.spec.code] = { logs: l.length, hours: Math.round(hrs), cost: Math.round(cost), factor: Math.round(b.factor * 100) / 100 };
  });
  return { all, summary, groups: Object.keys(groups).length, adminId };
}

// ─── Planned hours ───────────────────────────────────────────────────────────
// Task estimates are rescaled AFTER the hour logs exist so the plan is never below the actuals: total planned
// = logged x 1.25 for running projects (about 80% productivity), logged x 1.05 for the closed project.
// Each person's assigned hours are logged_e x factor (tasks are single-assignee), integers, min 1h per task.
// Logged hours, timesheets, allocations and approvals are not touched.
async function scalePlannedHours(ctx, built, hs) {
  void ctx;
  for (const b of built) {
    const factor = b.spec.status === "Closed" ? 1.05 : 1.25;
    const logs = hs.all.filter((l) => l._code === b.spec.code);
    const loggedMin = {};
    logs.forEach((l) => { loggedMin[String(l._emp._id)] = (loggedMin[String(l._emp._id)] || 0) + l._mins; });
    const total = Math.round((logs.reduce((s, l) => s + l._mins, 0) / 60) * factor);
    const tasks = await M.Task.find({ project_id: b.proj._id, isDeleted: false }).select("assignees estimated_hours").lean();
    const byEmp = {};
    tasks.forEach((t) => { const k = String(t.assignees[0]); (byEmp[k] = byEmp[k] || []).push(t); });
    const emps = Object.keys(byEmp);
    const weight = (k) => loggedMin[k] || 0;
    const wSum = emps.reduce((s, k) => s + weight(k), 0) || 1;
    const ops = [];
    let assigned = 0;
    emps.forEach((k) => {
      const list = byEmp[k];
      const target = Math.max(list.length, Math.round((total * weight(k)) / wSum));
      const cur = list.map((t) => parseFloat(t.estimated_hours) || 1);
      const curSum = cur.reduce((a, c) => a + c, 0);
      let est = cur.map((c) => Math.max(1, Math.floor((c * target) / curSum)));
      let rem = target - est.reduce((a, c) => a + c, 0);
      for (let i = 0; rem > 0; i = (i + 1) % est.length, rem--) est[i]++; // spread the remainder
      for (let i = 0; rem < 0 && i < est.length * 3; i++) { const j = i % est.length; if (est[j] > 1) { est[j]--; rem++; } }
      assigned += est.reduce((a, c) => a + c, 0);
      list.forEach((t, i) => ops.push({ updateOne: { filter: { _id: t._id }, update: { $set: { estimated_hours: String(est[i]), estimated_minutes: "00" } } } }));
    });
    if (ops.length) await M.Task.bulkWrite(ops);
    await M.Project.updateOne({ _id: b.proj._id }, { $set: { estimatedHours: String(assigned) } });
    b.plannedHours = assigned;
    log(`   ${b.spec.code}: planned ${assigned}h vs logged ${Math.round(logs.reduce((s, l) => s + l._mins, 0) / 60)}h (target x${factor})`);
  }
}

// ─── Bugs, notes, discussions, expenses, complaints, reviews ─────────────────
async function buildCollaboration(ctx, built) {
  const { stages } = ctx;
  const bugDocs = [];
  const bugMeta = [];
  const noteDocs = [];
  const discDocs = [];
  for (const b of built) {
    const { spec, proj, manager, tm, teamMembers, tasks } = b;
    const devs = teamMembers.map((t) => t.person).filter((p) => ["magento", "php", "mobile", "react", "qa"].includes(p.group));
    const qa = teamMembers.map((t) => t.person).find((p) => p.group === "qa") || tm;
    const nb = spec.status === "Closed" ? 5 : 8;
    for (let i = 0; i < nb; i++) {
      const stageName = spec.status === "Closed" ? "Closed" : pick(["To-Do", "In Progress", "To be Tested", "Closed", "Closed", "On Hold"]);
      const dev = pick(devs);
      const task = pick(tasks.filter((t) => t.st !== "To-Do"));
      ctx.counters.bug++;
      const id = new mongoose.Types.ObjectId();
      const start = Math.max(spec.start + 5, -40 + i * 3);
      bugDocs.push({
        _id: id, title: D.BUG_TITLES[(i + hashStr(spec.code)) % D.BUG_TITLES.length], project_id: proj._id, task_id: task._id, bugId: `#${400000 + ctx.counters.bug * 17}`,
        descriptions: "<p>Steps to reproduce: open the screen, perform the action, observe the result.<br/>Expected: works as per the acceptance criteria.</p>",
        bug_labels: [ctx.labelId.QA], start_date: day(start), due_date: day(start + 7), assignees: [dev._id], estimated_hours: String(rint(1, 8)), estimated_minutes: "00",
        progress: stageName === "Closed" ? "100" : stageName === "To be Tested" ? "90" : stageName === "In Progress" ? "50" : "0",
        bug_status: ctx.bugStage[stageName], bug_status_history: [{ bug_status: ctx.bugStage["To-Do"], updatedBy: qa._id, updatedAt: day(start) }], ...audit(qa._id, day(start)),
      });
      bugMeta.push({ id, dev, qa, start });
    }
    // Notebook + notes
    const nbk = await M.NoteBook.create({ title: `${spec.customer === "006" ? "Orbit" : spec.title.split(" - ")[0]} notes`, project_id: proj._id, ...auditPlain(manager._id, day(spec.start)) });
    D.NOTE_TITLES.slice(0, 4).forEach((title, k) => {
      const by = k % 2 ? tm : manager;
      noteDocs.push({
        companyId: ctx.companyId, title, color: ["#e0f7fa", "#fce4ec", "#e8f5e9", "#fff8e1"][k], noteBook_id: nbk._id, project_id: proj._id, subscribers: [manager._id, tm._id],
        notesInfo: `<p><strong>${title}</strong></p><ul><li>Attendees: ${manager.name}, ${tm.name}, client team</li><li>Decisions recorded and shared with the team.</li><li>Next steps assigned with owners and dates.</li></ul>`,
        isBookmark: k === 0, ...audit(by._id, day(Math.max(spec.start + 3 + k * 9, -60), 11)),
      });
    });
    // Discussions
    D.DISCUSSION_TITLES.slice(0, 3).forEach((title, k) => {
      const by = k % 2 ? tm : manager;
      discDocs.push({
        _meta: { proj, manager, tm, teamMembers, k }, companyId: ctx.companyId, title, project_id: proj._id, status: "active",
        descriptions: `<p>${title}: please share your views. Decision needed this week.</p>`, subscribers: [manager._id, tm._id, ...teamMembers.slice(0, 3).map((t) => t.person._id)],
        isPinToTop: k === 0, ...audit(by._id, day(Math.max(spec.start + 10 + k * 6, -40))),
      });
    });
  }
  const bugs = await M.Bug.insertMany(bugDocs);
  const bc = [];
  bugs.forEach((bg, i) => {
    const m = bugMeta[i];
    bc.push({ comment: "<p>Reproduced on staging, attaching the steps in the description.</p>", bug_id: bg._id, employee_id: m.qa._id, taggedUsers: [m.dev._id], ...audit(m.qa._id, day(m.start + 1, 11)) });
    bc.push({ comment: "<p>Fix pushed to the dev branch, please retest.</p>", bug_id: bg._id, employee_id: m.dev._id, taggedUsers: [m.qa._id], ...audit(m.dev._id, day(m.start + 3, 15)) });
  });
  await M.BugComment.insertMany(bc);
  const notes = await M.Note.insertMany(noteDocs);
  await M.NoteComment.insertMany(
    notes.filter((_, i) => i % 2 === 0).map((n) => ({ comment: "<p>Thanks for capturing this, looks accurate.</p>", note_id: n._id, employee_id: n.createdBy, taggedUsers: [], ...audit(ctx.byCode.AA004._id, new Date(n.createdAt.getTime() + 7200000)) }))
  );
  const topics = await M.Discussion.insertMany(discDocs.map(({ _meta, ...d }) => d));
  const details = [];
  topics.forEach((t, i) => {
    const { manager, tm, teamMembers } = discDocs[i]._meta;
    details.push({ companyId: ctx.companyId, title: "Added this topic", project_id: t.project_id, topic_id: t._id, isDefault: true, ...audit(t.createdBy, t.createdAt) });
    ["I think we should lock this by Friday.", "Agree, I will update the plan accordingly.", "Client is fine with this approach, confirmed on the call."].forEach((txt, r) => {
      const by = r === 0 ? teamMembers[1].person : r === 1 ? manager : tm;
      details.push({ companyId: ctx.companyId, title: txt, project_id: t.project_id, topic_id: t._id, taggedUsers: [manager._id], isDefault: false, ...audit(by._id, new Date(t.createdAt.getTime() + (r + 1) * 5 * 3600000)) });
    });
  });
  await M.TopicDetail.insertMany(details);

  // Expenses (USD field, amounts typical for the engagements)
  const ex = [
    [0, "AWS staging and production hosting (3 months)", 1450, "Infrastructure", "Approved", true], [0, "Magento Commerce extensions licence", 620, "Software License", "Paid", true],
    [1, "Figma Professional seats for UI/UX team", 360, "Software License", "Paid", false], [1, "Third-party GST API credits", 240, "Third-party API", "Pending", true],
    [2, "Google Maps Platform usage for fleet tracking", 980, "Third-party API", "Approved", true], [2, "Test devices (Android and iOS)", 1100, "Hardware", "Approved", false],
    [3, "Hosting for analytics dashboard (project life)", 780, "Infrastructure", "Paid", true],
  ];
  await M.Expense.insertMany(
    ex.map(([pi, txt, cost, nature, status, bill], i) => ({
      companyId: ctx.companyId, project_id: built[pi].proj._id, purchase_request_details: txt, cost_in_usd: cost, need_to_bill_customer: bill, status, nature_Of_expense: nature,
      details: `Raised by ${built[pi].tm.name} for ${built[pi].spec.code}.`, billing_cycle: nature === "Infrastructure" ? "monthly" : "one-time", is_recuring: nature === "Infrastructure",
      ...audit(built[pi].manager._id, day(-60 + i * 7)),
    }))
  );

  // Complaints (+status trail, comments, feedback) and reviews
  const cs = [
    [1, "Client reports the prototype review took longer than agreed and wants a faster turnaround for design approvals.", "Design resourcing overlapped with another delivery.", "high", "in_progress"],
    [2, "Driver app showed stale GPS location for some vehicles during peak hours.", "Location updates were batched too aggressively on low-network devices.", "medium", "resolved"],
    [0, "Staging credentials for the storefront were shared late, delaying client UAT preparation.", "Environment handover checklist missed access request.", "low", "open"],
  ];
  for (const [pi, text, reason, priority, status] of cs) {
    const b = built[pi];
    const comp = await M.Complaint.create({
      companyId: ctx.companyId, project_id: b.proj._id, client_name: b.client.full_name, client_email: b.client.email, complaint: text, priority, reason, status,
      escalation_level: ctx.byCode.AA003._id, ...audit(b.manager._id, day(-25 + pi * 5)),
    });
    await M.ComplaintStatus.create({ complaint_id: comp._id, status, root_cause: reason, immediate_action: "Acknowledged and assigned to the delivery manager.", corrective_action: "Process change agreed and added to the project checklist.", ...audit(b.manager._id, day(-22 + pi * 5)) });
    await M.ComplaintComment.create({ complaint_id: comp._id, comment: "Discussed with the client on a call; action plan shared by email.", ...audit(ctx.byCode.AA003._id, day(-21 + pi * 5)) });
    if (status === "resolved") await M.Feedback.create({ complaint_id: comp._id, satisfaction: 4, rate_reviews: 5, additional_comments: "Resolved quickly, thank you.", createdAt: day(-10) });
  }
  await M.Review.insertMany([
    { project_id: built[3].proj._id, client_name: "Prakash Hegde", feedback: "Delivered on time with all milestones signed off. The analytics dashboard is now used daily by our finance and ops teams.", feedback_type: "Text Testimonial", client_nda_sign: true, ...audit(built[3].manager._id, day(-9)) },
    { project_id: built[3].proj._id, client_name: "Orbit Finserv", feedback: "Clear communication at every milestone and no surprises on cost.", feedback_type: "Clutch Review", client_nda_sign: false, ...audit(built[3].manager._id, day(-8)) },
    { project_id: built[2].proj._id, client_name: "Ramesh Sundaram", feedback: "Mobile app quality has been excellent so far; the tracking accuracy exceeded expectations.", feedback_type: "Feedback", client_nda_sign: true, ...audit(built[2].manager._id, day(-30)) },
  ]);
  log(`   ${bugs.length} bugs (+${bc.length} comments), ${notes.length} notes, ${topics.length} discussions, ${ex.length} expenses, ${cs.length} complaints, 3 reviews`);
}

// ─── Misc: notifications, activity, holidays, attendance, stars, recents, timers, trash ─────
async function buildMisc(ctx, built, hoursSummary) {
  const { people, byCode } = ctx;
  // Notifications (TTL index expires them after 10 days: keep them inside that window)
  const notif = [...ctx.notifications];
  built.filter((b) => b.spec.status !== "Closed").forEach((b) => {
    b.teamMembers.slice(0, 6).forEach((t, i) => {
      const tk = b.tasks.find((x) => String(x.assignee._id) === String(t.person._id) && x.st !== "Done") || b.tasks[0];
      notif.push({ type: "taskAssign", message: `${b.manager.name} assigned you the task "${tk.title}"`, project_id: b.proj._id, task: tk, sender: b.manager, receivers: [t.person], daysAgo: 2 + (i % 6) });
      notif.push({ type: "taskCommentsAdded", message: `${b.tm.name} commented on "${tk.title}"`, project_id: b.proj._id, task: tk, sender: b.tm, receivers: [t.person], daysAgo: 1 + (i % 4) });
    });
    notif.push({ type: "loggedHours", message: `Timesheet for ${moment(TODAY).format("MMMM")} submitted on ${b.spec.code} is waiting for approval`, project_id: b.proj._id, sender: byCode.AA012, receivers: [byCode.AA004], daysAgo: 1 });
    notif.push({ type: "projectAssign", message: `You were added to project ${b.spec.title}`, project_id: b.proj._id, sender: byCode.AA001, receivers: [b.manager, byCode.AA006], daysAgo: 8 });
  });
  await M.Notification.insertMany(
    notif.map((n, i) => ({
      sender_id: n.sender._id, senderModel: "employees", receiver_ids: n.receivers.map((r) => r._id), receiverModels: n.receivers.map(() => "employees"),
      message: n.message, type: n.type, project_id: n.project_id, main_task_id: n.task ? n.task.main_task_id : null, task_id: n.task ? n.task._id : null,
      read_history: i % 3 === 0 ? n.receivers.map((r) => ({ receiver_id: r._id, updatedAt: day(-n.daysAgo, 14), readByModel: "employees" })) : [],
      ...audit(n.sender._id, day(-Math.min(n.daysAgo, 8), 9 + (i % 8))),
    }))
  );

  // Activity logs (logins for the last 14 days + a few updates)
  const logs = [];
  const loginPeople = [byCode.AA001, byCode.AA003, byCode.AA004, byCode.AA006, byCode.AA009, byCode.AA010, byCode.AA011, byCode.AA012, byCode.AA014, byCode.AA015, byCode.AA013, byCode.AA016];
  for (let d = -14; d <= 0; d++) {
    if (isWeekend(day(d))) continue;
    loginPeople.forEach((p) => {
      logs.push({ companyId: ctx.companyId, operationName: "LOGIN", moduleName: null, email: p.email, createdBy: p._id, createdAt: day(d, 4, rint(0, 59)), ipAddress: `103.${rint(10, 99)}.${rint(1, 250)}.${rint(1, 250)}` });
    });
  }
  built.forEach((b) => {
    logs.push({ companyId: ctx.companyId, operationName: "UPDATE", moduleName: "projects", email: b.manager.email, createdBy: b.manager._id, updatedBy: b.manager._id, createdAt: day(-12, 6), additionalData: { projectId: b.proj._id, title: b.spec.title }, updatedData: { oldData: { project_status: "Planning" }, newData: { project_status: b.spec.status } }, ipAddress: "103.21.44.18" });
    logs.push({ companyId: ctx.companyId, operationName: "UPDATE", moduleName: "milestones", email: b.manager.email, createdBy: b.manager._id, updatedBy: b.manager._id, createdAt: day(-3, 7), additionalData: { projectCode: b.spec.code }, updatedData: null, ipAddress: "103.21.44.18" });
  });
  logs.push({ companyId: ctx.companyId, operationName: "DELETE", moduleName: "tasks", email: byCode.AA004.email, createdBy: byCode.AA004._id, deletedBy: byCode.AA004._id, createdAt: day(-6, 8), additionalData: { title: "Duplicate task (cleanup)" }, ipAddress: "103.21.44.18" });
  await M.ActivityLog.insertMany(logs);

  // Holidays
  await M.Holiday.insertMany(HOLIDAYS_2026.map(([holiday_name, dt]) => ({ org_id: ctx.companyId, holiday_name, holiday_date: new Date(`${dt}T00:00:00.000Z`), isOptional: ["Makar Sankranti / Uttarayan", "Gudi Padwa / Ugadi", "Bakrid", "Guru Nanak Jayanti"].includes(holiday_name), createdBy: ctx.adminId, updatedBy: ctx.adminId })));

  // Attendance (last 30 days) for everyone
  const inout = [];
  for (const p of people) {
    const leaves = leaveSet(p.code, -30, 0);
    const r = mulberry32(hashStr(p.code) ^ 7);
    for (let d = -30; d <= -1; d++) {
      const dt = day(d);
      let rec = "Working Day";
      if (isWeekend(dt)) rec = "Weekoff";
      else if (HOLIDAY_SET.has(ymd(dt))) rec = "Holiday";
      else if (leaves.has(d)) rec = "Leave";
      const worked = rec === "Working Day";
      const inM = 9 * 60 + 15 + rint(0, 40, r);
      const outM = inM + 8 * 60 + rint(15, 70, r);
      const hm = (m) => `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
      inout.push({ employee_id: p._id, inTime: worked ? hm(inM) : "", outTime: worked ? hm(outM) : "", PMSTime: worked ? hm(7 * 60 + rint(0, 90, r)) : "", workedTime: worked ? hm(outM - inM) : "", record_type: rec, leave_type: rec === "Leave" ? "Casual Leave" : "", created_At: day(d, 5), updated_At: day(d, 5) });
    }
  }
  await M.InOut.insertMany(inout);

  // Stars, recent visits, timers
  const stars = [];
  const recents = [];
  const starUsers = [byCode.AA001, byCode.AA004, byCode.AA006, byCode.AA009];
  built.forEach((b, i) => {
    starUsers.forEach((u, k) => { if ((i + k) % 2 === 0) stars.push({ isStarred: true, project_id: b.proj._id, ...audit(u._id, day(-10 + k)) }); });
    [b.manager, b.tm, byCode.AA001, byCode.AA006].forEach((u, k) => {
      recents.push({ dataFor: "project", project_id: b.proj._id, visited_count: rint(3, 20), ...audit(u._id, day(-k, 10 + i)) });
      const tk = b.tasks.filter((t) => t.st !== "Done")[k] || b.tasks[0];
      recents.push({ dataFor: "task", project_id: b.proj._id, main_task_id: tk.main_task_id, task_id: tk._id, visited_count: rint(1, 8), ...audit(u._id, day(-k, 11 + i)) });
    });
  });
  await M.Star.insertMany(stars);
  await M.Recent.insertMany(recents);
  const timers = [];
  built.filter((b) => b.spec.status !== "Closed").forEach((b) => {
    b.teamMembers.slice(0, 4).forEach((t, k) => {
      const tk = b.tasks.find((x) => String(x.assignee._id) === String(t.person._id) && x.st !== "To-Do") || b.tasks[0];
      const start = day(-(k + 1), 10);
      timers.push({ task_id: tk._id, user_id: t.person._id, start_time: start, stop_time: new Date(start.getTime() + 95 * 60000), duration_minutes: 95, duration_seconds: 5700, is_active: false, ...audit(t.person._id, start) });
    });
  });
  await M.Timer.insertMany(timers);

  // Trash: a few soft-deleted items
  const b0 = built[0];
  const delAt = day(-4, 12);
  const delBy = byCode.AA004._id;
  const soft = { isDeleted: true, deletedAt: delAt, deletedBy: delBy, deletedByModel: "employees" };
  const delTask = b0.tasks.find((t) => t.st === "To-Do") || b0.tasks[0];
  await M.Task.create({ title: "Duplicate: Cart and checkout APIs", taskId: "#299001", project_id: b0.proj._id, main_task_id: delTask.main_task_id, assignees: [b0.tm._id], task_status: ctx.stages["To-Do"], ...audit(b0.manager._id, day(-9)), ...soft });
  const nbk = await M.NoteBook.findOne({ project_id: b0.proj._id });
  await M.Note.create({ companyId: ctx.companyId, title: "Old kickoff draft (superseded)", noteBook_id: nbk._id, project_id: b0.proj._id, notesInfo: "<p>Superseded by the final kickoff notes.</p>", ...audit(b0.manager._id, day(-30)), ...soft });
  await M.Discussion.create({ companyId: ctx.companyId, title: "Duplicate topic: release plan", project_id: b0.proj._id, descriptions: "<p>Duplicate.</p>", subscribers: [b0.manager._id], ...audit(b0.manager._id, day(-12)), ...soft });
  ctx.placeholders.push(["folderWise", "aarav_trash_old_plan.pdf", "Old plan (deleted)"]);
  await M.File.create({ name: "Old_plan.pdf", file_type: ".pdf", path: "public/folderWise/aarav_trash_old_plan.pdf", file_section: "Files", project_id: b0.proj._id, companyId: ctx.companyId, folder_id: b0.folders[0]._id, file_size: 120000, ...audit(b0.manager._id, day(-20)), ...soft });

  // Placeholder files so downloads / previews do not 404
  for (const [dir, stored, text] of ctx.placeholders) {
    const p = path.resolve(__dirname, "../public", dir);
    fs.mkdirSync(p, { recursive: true });
    fs.writeFileSync(path.join(p, stored), `Aarav Enterprises demo placeholder: ${text}\n`);
  }
  log(`   ${notif.length} notifications, ${logs.length} activity logs, ${HOLIDAYS_2026.length} holidays, ${inout.length} attendance rows, ${stars.length} stars, ${recents.length} recent visits, ${timers.length} timers, 4 trashed items, ${ctx.placeholders.length} placeholder files`);
  void hoursSummary;
}

async function printSummary(companyId, built, hs) {
  step("Done");
  log(`Company ${D.COMPANY.name}  id=${companyId}  domain=${D.COMPANY.domain}`);
  log(`Login: ${D.COMPANY.adminEmail} / ${D.COMPANY.password}  (PM neha.gupta@aaravent.com, same password)`);
  for (const b of built) {
    const ms = await M.Milestone.find({ project_id: b.proj._id }).sort({ sequence: 1 }).lean();
    const s = hs.summary[b.spec.code];
    log(`  ${b.spec.code}  ${b.spec.title}`);
    log(`     milestones: ${ms.map((m) => `${m.key}:${m.status}`).join(" ")}`);
    log(`     hours: ${s.hours}h in ${s.logs} logs, cost INR ${s.cost.toLocaleString("en-IN")}, factor ${s.factor}`);
  }
}

main()
  .then(() => mongoose.disconnect())
  .catch((err) => {
    console.error(global.chalk.red("\nSeed failed:"), err.stack || err.message);
    return mongoose.disconnect().finally(() => process.exit(1));
  });
