/**
 * Generic company seeder for Taskhub (docs/aarav/seed-kit/AGENT_BRIEF.md + dataset.json in weekmate_pms).
 *
 *   node scripts/seedCompany.js --company <mongoObjectId|slug> [--slug s] [--name "Test Co"] [--domain s.com]
 *                               [--password Demo@2026] [--dbUrl mongodb://127.0.0.1:27018/aarav_taskhub]
 *                               [--reset] [--purgeOnly] [--force]
 *   npm run seed:company -- --company testco --name "Test Co"
 *
 * Seeds for ONE company: 7 role users + 8 engineers, role permissions, a PMS client (Sundaram Textiles), and ONLY
 * project PRJ-<year>-001 (Dealer Portal; externalRef, value 12,00,000, PM E005, AM E003, assignees E101/E102/E106),
 * task lists + tasks, milestones M1..M4 (M1,M2 Approved/synced, M3 Submitted, M4 Pending/Not Started), project-wise
 * hour logs (~480h/month for the team), timesheet submissions (last 3 months Approved, current month: one Submitted),
 * comments, notifications, activity logs. Projects 002/003 are NOT created here (Hub creates 002 in the demo).
 *
 * Idempotent: every re-run purges this company's SEEDED docs (ids derived from the company id + the dataset emails)
 * and rebuilds them; nothing else of the company is touched. --reset is the same (kept for interface parity),
 * --purgeOnly removes the seeded docs and stops. Refuses non-local Mongo unless --force.
 * DB url: --dbUrl, else DB_URL env, else env/.env.dev.
 */
"use strict";

const path = require("path");
const crypto = require("crypto");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

global.moment = require("moment");
global.chalk = require("chalk");
process.env.SMTP_HOST = process.env.SMTP_HOST || "127.0.0.1";
process.env.SMTP_PORT = process.env.SMTP_PORT || "1";
process.env.SMTP_USER = process.env.SMTP_USER || "seed";
process.env.SMTP_PASS = process.env.SMTP_PASS || "seed";
dotenv.config({ path: path.resolve(__dirname, "../env/.env.dev") });

const DATASET = require(path.resolve(__dirname, "../../../weekmate_pms/docs/aarav/seed-kit/dataset.json"));

// ─── args ────────────────────────────────────────────────────────────────────
const ARGV = process.argv.slice(2);
const FLAG = (n) => ARGV.includes(`--${n}`);
function arg(name, fb) {
  const i = ARGV.findIndex((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (i < 0) return fb;
  if (ARGV[i].includes("=")) return ARGV[i].split("=").slice(1).join("=");
  const v = ARGV[i + 1];
  return v && !v.startsWith("--") ? v : fb;
}
const COMPANY_ARG = arg("company");
const PURGE_ONLY = FLAG("purgeOnly");
const FORCE = FLAG("force");
const DB_URL = arg("dbUrl", process.env.DB_URL);
const PASSWORD = arg("password", "Demo@2026");
const CLIENT_PASSWORD = PASSWORD;

const log = (...a) => console.log(...a);
const step = (t) => log(global.chalk.cyan(`\n${t}`));
const pad2 = (n) => String(n).padStart(2, "0");

function assertLocalDb(url) {
  if (!url) throw new Error("DB url missing: pass --dbUrl or set DB_URL (e.g. mongodb://127.0.0.1:27018/aarav_taskhub)");
  const m = url.match(/^mongodb(?:\+srv)?:\/\/(?:[^@/]*@)?([^/?]+)/i);
  const hosts = (m ? m[1] : "").split(",").map((h) => h.replace(/:\d+$/, "").replace(/^\[|\]$/g, "").toLowerCase());
  if (!(hosts.length && hosts.every((h) => ["localhost", "127.0.0.1", "::1"].includes(h))) && !FORCE) {
    throw new Error(`Refusing to seed a non-local database (${hosts.join(",")}). Pass --force if you really mean it.`);
  }
}

// ─── deterministic ids derived from company id ───────────────────────────────
let COMPANY_ID;
const oid = (kind, n = 0) =>
  new mongoose.Types.ObjectId(crypto.createHash("sha1").update(`${COMPANY_ID}|${kind}|${n}`).digest("hex").slice(0, 24));

// seeded rng (per company)
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
let rng;
const rint = (a, b) => Math.floor(rng() * (b - a + 1)) + a;
const pick = (arr) => arr[Math.floor(rng() * arr.length)];

// ─── dates ───────────────────────────────────────────────────────────────────
const now = new Date();
const TODAY = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
const YEAR = TODAY.getUTCFullYear();
const day = (n, h = 0, m = 0) => new Date(TODAY.getTime() + n * 86400000 + h * 3600000 + m * 60000);
const isWeekend = (d) => d.getUTCDay() === 0 || d.getUTCDay() === 6;

// ─── models ──────────────────────────────────────────────────────────────────
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
    ProjectStatus: g("projectstatus"), Workflow: g("projectworkflows"), WfStatus: g("workflowstatus"),
    ProjectType: g("projecttypes"), ProjectTech: g("projecttechs"), Label: g("tasklabels"), Project: g("projects"),
    Folder: g("filefolders"), TimeSheet: g("projecttimesheets"), Milestone: g("projectmilestones"), Submission: g("projecttimesheetsubmissions"),
    MainTask: g("projectmaintasks"), Task: g("projecttasks"), SubTask: g("projectsubtasks"), Comment: g("Comments"),
    HourLog: g("projecttaskhourlogs"), TotalHours: g("projecttotaltaskhourlogs"), ApprovedHours: g("approvedHours"),
    Notification: g("notifications"), ActivityLog: g("activitylogs"), Dept: g("empdepartments"), Desig: g("empdesignations"),
    Star: g("star_project"), Recent: g("recent_visited_data"), History: g("taskupdatehistory"),
    NoteBook: g("notebook"), Note: g("notes_pms"), Discussion: g("discussionstopics"), TopicDetail: g("discussionstopicsdetails"),
  };
}

const audit = (by, at = new Date()) => ({ createdBy: by, updatedBy: by, createdByModel: "employees", updatedByModel: "employees", createdAt: at, updatedAt: at });
const auditPlain = (by, at = new Date()) => ({ createdBy: by, updatedBy: by, createdAt: at, updatedAt: at });

// ─── company resolution ──────────────────────────────────────────────────────
async function resolveCompany() {
  if (!COMPANY_ARG) throw new Error("--company <mongoObjectId|slug> is required");
  const isOid = /^[a-f0-9]{24}$/i.test(COMPANY_ARG);
  let company = isOid ? await M.Company.findById(COMPANY_ARG).lean() : await M.Company.findOne({ companyDomain: COMPANY_ARG }).lean();
  const slug = arg("slug", company ? company.companyDomain : isOid ? null : COMPANY_ARG);
  if (!slug) throw new Error("Company id given but no company doc exists: also pass --slug");
  const name = arg("name", company ? company.companyName : slug.replace(/(^|[-_])(\w)/g, (_, a, b) => (a ? " " : "") + b.toUpperCase()));
  const domain = arg("domain", `${slug}.com`);
  if (!company) {
    const _id = isOid ? new mongoose.Types.ObjectId(COMPANY_ARG)
      : new mongoose.Types.ObjectId(crypto.createHash("sha1").update(`taskhub-company|${slug}`).digest("hex").slice(0, 24));
    company = (await M.Company.create({ _id, companyName: name, companyDomain: slug, plan: "enterprise", maxUsers: 200, currency: "INR", isActive: true })).toObject();
    log(`   + company "${name}" (${_id}) created`);
  } else log(`   company "${company.companyName}" (${company._id}) exists`);
  return { id: company._id, slug, name: company.companyName, domain };
}

// ─── global reference rows (exist in a real Taskhub DB; created when missing) ─
async function ensureGlobals(authorId) {
  const roleIds = require("../settings/role.json");
  const rolesCfg = require("../settings/config.json").PMS_ROLES;
  for (const name of Object.values(rolesCfg).filter((n) => n !== "Super Admin")) {
    if (!(await M.Role.exists({ role_name: name }))) {
      const _id = roleIds[name] ? new mongoose.Types.ObjectId(roleIds[name]) : new mongoose.Types.ObjectId();
      await M.Role.create({ _id, role_name: name, createdBy: authorId, updatedBy: authorId });
    }
  }
  const { ALL_PERMISSION_NAMES } = require("../helpers/permissionCatalog");
  const have = new Set((await M.Resource.find({ isDeleted: false }).select("resource_name").lean()).map((r) => r.resource_name));
  const missing = ALL_PERMISSION_NAMES.filter((n) => !have.has(n));
  if (missing.length) await M.Resource.insertMany(missing.map((resource_name) => ({ resource_name, isDefault: true, createdBy: authorId, updatedBy: authorId })));
  const { DEFAULT_DATA } = require("../helpers/constant");
  for (const name of Object.values(DEFAULT_DATA.PROJECT_TABS)) {
    if (!(await M.ProjectTab.exists({ name, isDeleted: false }))) await M.ProjectTab.create({ name, createdBy: authorId, updatedBy: authorId });
  }
}

// ─── people ──────────────────────────────────────────────────────────────────
// Taskhub PMS roles: Admin / PC (project coordinator = PM approver) / AM / TL / User / Client
const ROLE_FOR = { E001: "Admin", E002: "User", E003: "AM", E004: "PC", E005: "PC", E006: "User", E007: "User" };
function buildPeople(domain) {
  const mk = (p, isEng) => {
    const [first, ...rest] = p.name.split(" ");
    const monthly = isEng ? Math.round(p.ctcAnnual / 12) : 0;
    return {
      code: p.code, name: p.name, first, last: rest.join(" "), email: `${p.local}@${domain}`, role: ROLE_FOR[p.code] || "User",
      title: isEng ? p.designation : p.role, dept: isEng ? (p.code === "E106" ? "QA" : "Engineering") : p.dept,
      skills: isEng ? p.skills.map((s) => s[0]) : [], monthly, hourly: monthly / 176, isEng,
    };
  };
  return [...DATASET.users.map((u) => mk(u, false)), ...DATASET.engineers.map((e) => mk(e, true))];
}

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

// ─── purge (only this company's seeded docs) ─────────────────────────────────
async function purge(companyId, emails) {
  const counts = {};
  const del = async (n, Model, where) => { const r = await Model.deleteMany(where); if (r.deletedCount) counts[n] = r.deletedCount; };
  const projectIds = (await M.Project.find({ companyId }).select("_id").lean()).map((p) => p._id);
  const empIds = (await M.Employee.find({ companyId, email: { $in: emails } }).select("_id").lean()).map((e) => e._id);
  const taskIds = projectIds.length ? (await M.Task.find({ project_id: { $in: projectIds } }).select("_id").lean()).map((t) => t._id) : [];
  const noteBookIds = projectIds.length ? (await M.NoteBook.find({ project_id: { $in: projectIds } }).select("_id").lean()).map((n) => n._id) : [];
  const topicIds = projectIds.length ? (await M.Discussion.find({ project_id: { $in: projectIds } }).select("_id").lean()).map((n) => n._id) : [];
  void noteBookIds;
  if (projectIds.length) {
    const byP = { project_id: { $in: projectIds } };
    for (const [n, Mdl] of [["milestones", M.Milestone], ["main tasks", M.MainTask], ["tasks", M.Task], ["subtasks", M.SubTask], ["hour logs", M.HourLog],
      ["project timesheets", M.TimeSheet], ["folders", M.Folder], ["notebooks", M.NoteBook], ["notes", M.Note], ["discussions", M.Discussion],
      ["history", M.History], ["notifications", M.Notification], ["stars", M.Star], ["recent", M.Recent], ["tab settings", M.ProjectTabSetting],
      ["submissions", M.Submission]]) await del(n, Mdl, byP);
  }
  if (topicIds.length) await del("discussion details", M.TopicDetail, { topic_id: { $in: topicIds } });
  if (taskIds.length) await del("task comments", M.Comment, { task_id: { $in: taskIds } });
  if (empIds.length) {
    await del("approved hours", M.ApprovedHours, { employee_id: { $in: empIds } });
    await del("hour totals", M.TotalHours, { employee_id: { $in: empIds } });
    await del("activity logs", M.ActivityLog, { companyId, createdBy: { $in: empIds } });
    await del("notifications (sender)", M.Notification, { sender_id: { $in: empIds } });
  }
  await del("projects", M.Project, { _id: { $in: projectIds } });
  await del("clients", M.Client, { companyId, _id: { $in: DATASET.customers.map((_, i) => oid("client", i + 1)) } });
  await del("types", M.ProjectType, { companyId, _id: oid("type", 1) });
  await del("techs", M.ProjectTech, { companyId, _id: { $in: [1, 2, 3].map((i) => oid("tech", i)) } });
  await del("labels", M.Label, { companyId, _id: { $in: [1, 2, 3, 4, 5, 6].map((i) => oid("label", i)) } });
  await del("departments", M.Dept, { companyId, _id: { $in: Array.from({ length: 8 }, (_, i) => oid("dept", i + 1)) } });
  await del("designations", M.Desig, { companyId, _id: { $in: Array.from({ length: 20 }, (_, i) => oid("desig", i + 1)) } });
  await del("employees", M.Employee, { companyId, email: { $in: emails } });
  return counts;
}

// ─── v2 profile: 3 CLOSED projects inside the last 2 completed calendar months ─
// tags: pm / dev / qa / ops. Hours: pct of an 8h day over a window of working-day indexes of the 2-month period.
const TASKS = {
  "001": [
    ["Requirements workshop with dealer network", "pm"], ["Dealer flow wireframes", "dev"], ["Portal UI design (Figma)", "dev"], ["Architecture and data model", "dev"],
    ["Dealer onboarding and KYC API", "dev"], ["Order management module", "dev"], ["Dealer dashboard UI", "dev"], ["Auth and role-based access", "dev"], ["Core build test cases", "qa"],
    ["UAT test plan", "qa"], ["Cypress regression suite", "qa"], ["Fix UAT defects", "dev"], ["UAT sign-off pack for client", "pm"],
    ["Production environment setup", "dev"], ["Data migration and dry run", "dev"], ["Go-live checklist and rollback plan", "pm"], ["Dealer training material", "pm"],
  ],
  "002": [
    ["Dashboard wireframes", "dev"], ["Inventory data model", "dev"], ["UI design system", "dev"],
    ["Stock levels API", "dev"], ["Inventory charts UI", "dev"], ["Warehouse sync jobs", "dev"], ["AWS deployment pipeline", "ops"], ["Low-stock alerts", "dev"],
    ["Production cutover", "ops"], ["Load testing", "ops"], ["Handover documentation", "pm"],
  ],
  "003": [
    ["Storefront UI", "dev"], ["Catalog and cart API", "dev"], ["Checkout and payments", "dev"], ["Order tracking", "dev"], ["Regression test pass", "qa"],
    ["Production deploy", "dev"], ["Smoke tests", "qa"], ["Go-live handover", "pm"],
  ],
};
// task counts per milestone (matches dataset billingMilestones order)
const TASK_SPLIT = { "001": [4, 5, 4, 4], "002": [3, 5, 3], "003": [5, 3] };
// per project: window [from,to) in working-day indexes of the 2-month period (-1 = end) and pct of day per person
const PLAN = {
  "001": { from: 0, to: 28, pct: { E101: 100, E102: 70, E106: 80 } },
  "002": { from: 6, to: 36, pct: { E102: 30, E103: 100, E105: 60 } },
  "003": { from: 28, to: -1, pct: { E101: 100, E106: 100 } },
};
const COMMENTS = ["Picked this up today, will share an update by EOD.", "Done on my side, moving to review.", "Updated as per the review comments, please re-check.",
  "Verified on staging, looks good.", "Client asked for a small change here, discussed with Neha.", "Merged to the release branch.", "Closing this, all acceptance criteria met.",
  "Deployed to production, monitoring for the next 24 hours.", "Client confirmed acceptance over email."];

async function build(ctx) {
  const { companyId, people, byCode } = ctx;
  const adminId = byCode.E001._id;
  const pm = byCode.E005;
  const am = byCode.E003;

  // Departments / designations (+ raw HR-style fields on employees)
  const deptNames = ["Management", "Sales", "Delivery", "Engineering", "HR", "Finance", "QA"];
  const depts = await M.Dept.insertMany(deptNames.map((department_name, i) => ({ _id: oid("dept", i + 1), companyId, org_id: companyId, department_name, ...auditPlain(adminId) })));
  const deptId = Object.fromEntries(depts.map((d) => [d.department_name, d._id]));
  const desigNames = [...new Set(people.map((p) => p.title))];
  const desigs = await M.Desig.insertMany(desigNames.map((designation_name, i) => ({ _id: oid("desig", i + 1), companyId, org_id: companyId, designation_name, ...auditPlain(adminId) })));
  const desigId = Object.fromEntries(desigs.map((d) => [d.designation_name, d._id]));
  await M.Employee.collection.bulkWrite(people.map((p) => ({
    updateOne: { filter: { _id: p._id }, update: { $set: {
      emp_code: p.code, joining_date: day(-400), department_id: deptId[p.dept] || deptId.Engineering, designation_id: desigId[p.title],
      monthly_ctc: p.monthly, skills: p.skills, reporting_manager: p.isEng ? pm._id : null,
    } } },
  })));

  // Clients (all customers of the dataset)
  const clients = [];
  for (let i = 0; i < DATASET.customers.length; i++) {
    const c = DATASET.customers[i];
    const [fn, ...ln] = c.contact.replace(/^Dr\.\s*/, "").split(" ");
    const cslug = c.name.toLowerCase().replace(/[^a-z]+/g, "").slice(0, 14);
    clients.push(await new M.Client({
      _id: oid("client", i + 1), companyId, first_name: fn, last_name: ln.join(" "), full_name: c.contact, company_name: c.name,
      email: `${fn.toLowerCase()}@${cslug}.in`, phone_number: `+91 9${rint(100000000, 999999999)}`, password: CLIENT_PASSWORD, plain_password: CLIENT_PASSWORD,
      pms_role_id: ctx.roleByName.Client._id, address: { city: c.city, country: "India" }, isActivate: true, createdBy: adminId, updatedBy: adminId,
      createdAt: day(-200 + i), updatedAt: day(-200 + i),
    }).save());
  }
  const type = await new M.ProjectType({ _id: oid("type", 1), companyId, project_type: "Web Application", ...auditPlain(adminId) }).save();
  const techs = await M.ProjectTech.insertMany(["React", "Node.js", "MongoDB"].map((project_tech, i) => ({ _id: oid("tech", i + 1), companyId, project_tech, ...auditPlain(adminId) })));
  const labels = await M.Label.insertMany([["Frontend", "#4e73df"], ["Backend", "#1cc88a"], ["Design", "#e83e8c"], ["QA", "#f6c23e"], ["DevOps", "#6f42c1"], ["Documentation", "#858796"]]
    .map(([title, color], i) => ({ _id: oid("label", i + 1), companyId, title, color, project_id: null, ...auditPlain(adminId) })));
  const labelId = Object.fromEntries(labels.map((l) => [l.title, l._id]));
  const workflow = await M.Workflow.findOne({ companyId, project_workflow: "Standard" }).lean();
  const stages = Object.fromEntries((await M.WfStatus.find({ workflow_id: workflow._id }).lean()).map((s) => [s.title, s._id]));
  const projStatus = Object.fromEntries((await M.ProjectStatus.find({ companyId }).lean()).map((s) => [s.title, s._id]));
  const closedStatus = projStatus.Closed || projStatus.Completed || projStatus.Active;
  const tabs = await M.ProjectTab.find({ isDeleted: false }).lean();

  // Working days of the last 2 completed calendar months
  const wdays = [];
  for (const off of [-2, -1]) {
    const first = new Date(Date.UTC(YEAR, TODAY.getUTCMonth() + off, 1));
    const dim = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    for (let d = 1; d <= dim; d++) { const dt = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), d)); if (!isWeekend(dt)) wdays.push(dt); }
  }
  const N = wdays.length;
  const offOf = (dt) => Math.round((dt - TODAY) / 86400000);

  const out = { projects: [], monthlyMins: {}, logCount: 0, subs: 0, empByIdStr: Object.fromEntries(people.map((p) => [String(p._id), p])), tasks: 0, comments: 0, notif: 0, byProjectCost: {} };
  const allLogs = [];
  const submitter = byCode.E101;

  for (let pi = 0; pi < DATASET.projects.length; pi++) {
    const spec = DATASET.projects[pi];
    const num = String(pi + 1).padStart(3, "0");
    const code = spec.code.replace("{YEAR}", YEAR);
    const deal = DATASET.deals.find((d) => d.id === spec.deal);
    const customer = DATASET.customers[deal.customer];
    const client = clients[deal.customer];
    const team = spec.team.map((c) => byCode[c]);
    const plan = PLAN[num];
    const wFrom = plan.from; const wTo = plan.to < 0 ? N : plan.to;
    const startDt = wdays[wFrom]; const endDt = wdays[wTo - 1];
    const startOff = offOf(startDt); const endOff = offOf(endDt);
    const created = day(startOff - 10);
    const pid = (n) => oid("p" + num, n);
    const proj = await M.Project.create({
      _id: oid("project", pi + 1), companyId, title: spec.name, projectId: `#${100000 + (parseInt(oid("project", pi + 1).toString().slice(-6), 16) % 899999)}`, color: ["#4e73df", "#1cc88a", "#36b9cc"][pi],
      descriptions: `<p>${spec.name} for <strong>${customer.name}</strong>. Delivered and closed.</p>`, technology: techs.map((t) => t._id), project_type: type._id,
      project_status: closedStatus, manager: pm._id, acc_manager: am._id,
      assignees: [...new Set([...team, pm, am].map((p) => String(p._id)))].map((s) => new mongoose.Types.ObjectId(s)), pms_clients: [client._id], workFlow: workflow._id,
      estimatedHours: "0", isBillable: true, isBugsEnabled: false, start_date: startDt, end_date: endDt, recurringType: "", externalRef: code, projectValue: deal.value,
      custom_fields: { companySeed: true, billingModel: "Milestone", customer: customer.name, completed: true }, ...audit(pm._id, created),
    });
    await M.Folder.insertMany([[spec.name, true], ["Requirements", false], ["Design", false], ["Deliverables", false]].map(([name, isDefault], i) => ({
      _id: pid(i + 1), name, isDefault, project_id: proj._id, ...auditPlain(pm._id, created),
    })));
    const timesheet = await M.TimeSheet.create({ _id: pid(10), title: `${spec.name} - Timesheet`, isDefault: true, project_id: proj._id, ...auditPlain(pm._id, created) });
    await M.ProjectTabSetting.insertMany(tabs.map((t) => ({ project_id: proj._id, tab_id: t._id, isEnable: true, isDefault: t.name === "Tasks", ...auditPlain(pm._id, created) })));

    // Milestone windows by cumulative % of the project window; all Approved + synced
    const span = wTo - wFrom;
    let cum = 0;
    const msDefs = spec.billingMilestones.map(([key, title, pct], i) => {
      const a = wFrom + Math.floor((span * cum) / 100); cum += pct;
      const b = Math.max(a + 1, wFrom + Math.floor((span * cum) / 100));
      return { key, title, pct, i, a, b: Math.min(b, wTo) };
    });
    const milestones = [];
    for (const ms of msDefs) {
      const dueOff = offOf(wdays[ms.b - 1]);
      const submittedAt = day(dueOff, 11);
      const approvedAt = day(Math.min(-1, dueOff), 15, 30);
      const evidence = [{ name: `${ms.key}_Deliverable_Summary.pdf`, url: `/public/folderWise/${code}_${ms.key}_Deliverable_Summary.pdf`, type: "file", addedAt: submittedAt },
        { name: `${ms.key}_Demo_Link`, url: `https://demo.${ctx.domain}/${code.toLowerCase()}/${ms.key.toLowerCase()}`, type: "link", addedAt: submittedAt }];
      milestones.push({
        _id: pid(20 + ms.i), companyId, project_id: proj._id, key: ms.key, title: ms.title, sequence: ms.i + 1,
        description: `${ms.key}: ${ms.title} (${ms.pct}% of project value, ${ms.pct}% billing trigger).`, weight: ms.pct, billingPercent: ms.pct, dueDate: day(dueOff), status: "Approved",
        evidence, submitNote: "Deliverables ready for review.", submittedBy: submitter._id, submittedAt, reviewNote: "Reviewed and accepted.", reviewedBy: pm._id, reviewedAt: approvedAt,
        reworkCount: 0, approvedBy: pm._id, approvedAt, crmSyncStatus: "synced", crmSyncedAt: new Date(approvedAt.getTime() + 60000), crmSyncAttempts: 1, crmSyncError: "",
        history: [{ action: "created", status: "Not Started", by: pm._id, at: created }, { action: "submitted", status: "Submitted", by: submitter._id, at: submittedAt, note: "Deliverables ready for review." },
          { action: "approved", status: "Approved", by: pm._id, at: approvedAt }], ...audit(pm._id, created),
      });
    }
    await M.Milestone.insertMany(milestones);

    // Tasks: all Done
    const devs = team.filter((p) => !["E106"].includes(p.code) && !(p.code === "E105" && false));
    const qaP = team.find((p) => p.code === "E106") || devs[0];
    const opsP = team.find((p) => p.code === "E105") || devs[0];
    const devPool = team.filter((p) => !["E106", "E105"].includes(p.code));
    const tpl = TASKS[num]; const split = TASK_SPLIT[num];
    const taskDocs = []; const commentDocs = []; const historyDocs = []; const tasks = [];
    let ti = 0; let devRR = 0;
    for (let mi = 0; mi < msDefs.length; mi++) {
      const ms = msDefs[mi];
      const main = await M.MainTask.create({
        _id: pid(40 + mi), title: `${ms.key} - ${ms.title}`, project_id: proj._id, subscribers: [pm._id, submitter._id], task_status: stages.Done,
        task_status_history: [{ task_status: stages.Done, updatedBy: pm._id, updatedAt: day(offOf(wdays[ms.b - 1])) }], ...audit(pm._id, day(offOf(wdays[ms.a]) - 2)),
      });
      for (let k = 0; k < split[mi]; k++, ti++) {
        const [title, disc] = tpl[ti];
        const assignee = disc === "pm" ? pm : disc === "qa" ? qaP : disc === "ops" ? opsP : devPool[devRR++ % devPool.length];
        const sIdx = ms.a + Math.floor(((ms.b - ms.a) * k) / split[mi]);
        const tStart = offOf(wdays[Math.min(sIdx, N - 1)]); const tDue = offOf(wdays[Math.min(ms.b - 1, N - 1)]);
        const lbl = disc === "pm" ? "Documentation" : disc === "qa" ? "QA" : disc === "ops" ? "DevOps" : /UI|dashboard|storefront|charts|wireframe/i.test(title) ? (/wireframe|design/i.test(title) ? "Design" : "Frontend") : "Backend";
        const id = pid(100 + ti);
        const doc = {
          _id: id, title, project_id: proj._id, main_task_id: main._id, taskId: `#${200000 + (pi + 1) * 1000 + ti * 13}`, priority: pick(["Low", "Medium", "Medium", "High"]),
          descriptions: `<p>${title} for <strong>${customer.name}</strong> (${ms.key}: ${ms.title}).</p>`, task_labels: [labelId[lbl]], start_date: day(tStart), due_date: day(tDue), end_date: day(tDue),
          assignees: [assignee._id], estimated_hours: "8", estimated_minutes: "00", task_progress: "100", task_status: stages.Done,
          task_status_history: [{ task_status: stages["To-Do"], updatedBy: pm._id, updatedAt: day(tStart - 2) }, { task_status: stages["In Progress"], updatedBy: assignee._id, updatedAt: day(tStart) }, { task_status: stages.Done, updatedBy: assignee._id, updatedAt: day(tDue) }],
          recurringType: "", custom_fields: {}, ...audit(pm._id, day(tStart - 2)),
        };
        taskDocs.push(doc); tasks.push({ ...doc, assignee, tStart, tDue, ms: mi });
        historyDocs.push({ project_id: proj._id, main_task_id: main._id, task_id: id, updated_key: "createdAt", ...audit(pm._id, day(tStart - 2)) });
        for (let c = 0; c < 2; c++) {
          const by = c === 0 ? assignee : pm;
          commentDocs.push({ comment: `<p>${pick(COMMENTS)}</p>`, task_id: id, employee_id: by._id, taggedUsers: [by._id === pm._id ? assignee._id : pm._id], ...audit(by._id, day(Math.min(-1, tStart + c + 1), 10 + c)) });
        }
      }
    }
    await M.Task.insertMany(taskDocs); await M.Comment.insertMany(commentDocs); await M.History.insertMany(historyDocs);
    out.tasks += taskDocs.length; out.comments += commentDocs.length;

    // Hours: each person logs pct% of an 8h day on every working day in the project window
    const perTask = {};
    tasks.forEach((t) => { (perTask[String(t.assignee._id)] = perTask[String(t.assignee._id)] || []).push(t); });
    const projLogs = [];
    for (const p of team) {
      const pct = plan.pct[p.code]; const mine = perTask[String(p._id)];
      let carry = 0;
      for (let wi = wFrom; wi < wTo; wi++) {
        const dt = wdays[wi]; const dOff = offOf(dt);
        const want = 480 * (pct / 100) + carry; const mins = Math.round(want / 5) * 5; carry = want - mins;
        const open = mine.filter((t) => dOff >= t.tStart - 1 && dOff <= t.tDue + 3);
        const tk = pick(open.length ? open : mine);
        const l = {
          employee_id: p._id, project_id: proj._id, task_id: tk._id, timesheet_id: timesheet._id,
          descriptions: `${pick(["Worked on", "Implemented", "Reviewed and tested", "Fixed issues in"])} ${tk.title.charAt(0).toLowerCase()}${tk.title.slice(1)}`,
          logged_hours: pad2(Math.floor(mins / 60)), logged_minutes: pad2(mins % 60), logged_seconds: "00", logged_date: new Date(dt.getTime() + 12 * 3600000),
          isManuallyAdded: true, logged_status: "Billable", ...audit(p._id, new Date(dt.getTime() + 18 * 3600000)),
        };
        projLogs.push({ doc: l, mins, emp: p, y: dt.getUTCFullYear(), mo: dt.getUTCMonth() + 1 });
      }
    }
    for (let i = 0; i < projLogs.length; i += 1000) await M.HourLog.insertMany(projLogs.slice(i, i + 1000).map((x) => x.doc));
    out.logCount += projLogs.length;

    // Timesheet submissions: Approved per (employee, project, month)
    const groups = {};
    projLogs.forEach((x) => { const k = `${x.emp._id}|${x.y}|${pad2(x.mo)}`; groups[k] = (groups[k] || 0) + x.mins; out.monthlyMins[k] = (out.monthlyMins[k] || 0) + x.mins; });
    const subs = Object.entries(groups).map(([k, mins]) => {
      const [empId, y, mo] = k.split("|");
      const submittedAt = new Date(Date.UTC(+y, +mo, 1, 9, 30));
      const at = submittedAt > now ? day(-1, 17) : submittedAt;
      return { companyId, employee_id: empId, project_id: proj._id, periodStart: new Date(Date.UTC(+y, +mo - 1, 1)), periodEnd: new Date(Date.UTC(+y, +mo, 0, 23, 59, 59, 999)), status: "Approved",
        submittedMinutes: mins, note: "", submittedAt: at, reviewedBy: pm._id, reviewedAt: new Date(at.getTime() + 6 * 3600000), reviewNote: "", ...audit(new mongoose.Types.ObjectId(empId), at) };
    });
    await M.Submission.insertMany(subs); out.subs += subs.length;

    // Planned hours = logged x 1.1 per assignee
    const loggedBy = {}; projLogs.forEach((x) => { loggedBy[String(x.emp._id)] = (loggedBy[String(x.emp._id)] || 0) + x.mins; });
    const ops = []; let planned = 0;
    for (const [empId, list] of Object.entries(perTask)) {
      const target = Math.max(list.length, Math.round(((loggedBy[empId] || 0) / 60) * 1.1));
      const per = Math.floor(target / list.length); let rem = target - per * list.length;
      list.forEach((t) => { const est = per + (rem-- > 0 ? 1 : 0); planned += est; ops.push({ updateOne: { filter: { _id: t._id }, update: { $set: { estimated_hours: String(est) } } } }); });
    }
    if (ops.length) await M.Task.bulkWrite(ops);
    await M.Project.updateOne({ _id: proj._id }, { $set: { estimatedHours: String(planned) } });

    // Notes / discussions / activity / notifications
    const nbk = await M.NoteBook.create({ _id: pid(60), title: `${spec.name} notes`, project_id: proj._id, ...auditPlain(pm._id, day(startOff)) });
    await M.Note.insertMany(["Kickoff meeting notes", "Go-live retrospective"].map((title, k) => ({
      _id: pid(61 + k), companyId, title, color: ["#e0f7fa", "#fff8e1"][k], noteBook_id: nbk._id, project_id: proj._id, subscribers: [pm._id],
      notesInfo: `<p><strong>${title}</strong></p><ul><li>Attendees: ${pm.name}, ${team[0].name}, client team</li><li>Decisions recorded and shared.</li></ul>`, ...audit(pm._id, day(k ? endOff : startOff + 1, 11)),
    })));
    const topics = await M.Discussion.insertMany(["Scope and acceptance criteria", "Go-live plan"].map((title, k) => ({
      _id: pid(70 + k), companyId, title, project_id: proj._id, status: "active", descriptions: `<p>${title}: please share your views.</p>`, subscribers: [pm._id, ...team.map((t) => t._id)],
      isPinToTop: k === 0, ...audit(pm._id, day(k ? endOff - 5 : startOff + 2)),
    })));
    const details = [];
    topics.forEach((t, i) => {
      details.push({ companyId, title: "Added this topic", project_id: proj._id, topic_id: t._id, isDefault: true, ...audit(t.createdBy, t.createdAt) });
      details.push({ companyId, title: "Agreed, plan updated accordingly.", project_id: proj._id, topic_id: t._id, taggedUsers: [pm._id], isDefault: false, ...audit(team[i % team.length]._id, new Date(t.createdAt.getTime() + 4 * 3600000)) });
    });
    await M.TopicDetail.insertMany(details);
    await M.Star.insertMany([pm, byCode.E001, am].map((u, k) => ({ isStarred: true, project_id: proj._id, ...audit(u._id, day(-10 + k)) })));
    await M.Recent.insertMany([pm, byCode.E001, am, ...team].map((u, k) => ({ dataFor: "project", project_id: proj._id, visited_count: rint(3, 20), ...audit(u._id, day(-(k % 3), 10)) })));
    const logs = [
      { companyId, operationName: "UPDATE", moduleName: "projects", email: pm.email, createdBy: pm._id, updatedBy: pm._id, createdAt: day(startOff, 6), additionalData: { projectId: proj._id, title: spec.name }, updatedData: { oldData: { project_status: "Planning" }, newData: { project_status: "Active" } }, ipAddress: "103.21.44.18" },
      { companyId, operationName: "UPDATE", moduleName: "projects", email: pm.email, createdBy: pm._id, updatedBy: pm._id, createdAt: day(-1, 8), additionalData: { projectId: proj._id, title: spec.name }, updatedData: { oldData: { project_status: "Active" }, newData: { project_status: "Closed" } }, ipAddress: "103.21.44.18" },
      ...milestones.map((m) => ({ companyId, operationName: "UPDATE", moduleName: "milestones", email: pm.email, createdBy: pm._id, updatedBy: pm._id, createdAt: m.approvedAt, additionalData: { projectCode: code, milestone: m.key }, updatedData: null, ipAddress: "103.21.44.18" })),
    ];
    await M.ActivityLog.insertMany(logs);
    out.actLogs = (out.actLogs || 0) + logs.length;
    const lastMs = milestones[milestones.length - 1];
    await M.Notification.create({ sender_id: pm._id, senderModel: "employees", receiver_ids: [am._id, byCode.E001._id], receiverModels: ["employees", "employees"], message: `Milestone ${lastMs.key} "${lastMs.title}" was approved on ${spec.name}; project closed`,
      type: "taskAssign", project_id: proj._id, main_task_id: null, task_id: null, read_history: [], ...audit(pm._id, day(-1 - pi, 15)) });
    out.notif++;

    const cost = projLogs.reduce((s, x) => s + (x.mins / 60) * x.emp.hourly, 0);
    out.projects.push({ code, name: spec.name, value: deal.value, hours: projLogs.reduce((s, x) => s + x.mins, 0) / 60, cost, planned, milestones: milestones.map((m) => `${m.key}:${m.status}(${m.crmSyncStatus})`).join(" "), tasks: taskDocs.length, team: spec.team.join("/") });
    allLogs.push(...projLogs);
  }

  // Per-employee monthly rollups + approved hours (for the 2 completed months)
  const totals = []; const approved = [];
  Object.entries(out.monthlyMins).forEach(([key, mins]) => {
    const [empId, y, mo] = key.split("|"); const hh = Math.floor(mins / 60);
    totals.push({ employee_id: empId, month: mo, year: y, total_time: `${pad2(hh)}:${pad2(mins % 60)}`, ...audit(new mongoose.Types.ObjectId(empId), new Date(Date.UTC(+y, +mo - 1, 1, 9))) });
    approved.push({ employee_id: empId, approved_by: pm._id, notes: "Approved after timesheet review", approved_hours: String(hh), approved_minutes: String(mins % 60), hours: String(hh), minutes: String(mins % 60), month: mo, year: y, ...audit(pm._id, new Date(Date.UTC(+y, +mo, 2, 10))) });
  });
  await M.TotalHours.insertMany(totals); await M.ApprovedHours.insertMany(approved);

  // Login activity for the company
  const actLogs = [];
  for (let d = -14; d <= 0; d++) {
    if (isWeekend(day(d))) continue;
    people.forEach((p) => actLogs.push({ companyId, operationName: "LOGIN", moduleName: null, email: p.email, createdBy: p._id, createdAt: day(d, 4, rint(0, 59)), ipAddress: `103.${rint(10, 99)}.${rint(1, 250)}.${rint(1, 250)}` }));
  }
  await M.ActivityLog.insertMany(actLogs);
  out.actLogs += actLogs.length;
  return out;
}


async function main() {
  assertLocalDb(DB_URL);
  await mongoose.connect(DB_URL, { serverSelectionTimeoutMS: 8000 });
  loadModels();
  step("Company");
  const co = await resolveCompany();
  COMPANY_ID = String(co.id);
  rng = mulberry32(parseInt(crypto.createHash("sha1").update(COMPANY_ID).digest("hex").slice(0, 8), 16));
  const companyId = co.id;
  const people = buildPeople(co.domain);
  const emails = people.map((p) => p.email);
  log(`Taskhub company seed | ${co.name} (${COMPANY_ID}) slug=${co.slug} domain=${co.domain} db=${DB_URL.replace(/\/\/[^@]*@/, "//")}`);

  step("Purge previously seeded docs of this company");
  log("   removed:", JSON.stringify(await purge(companyId, emails)));
  if (PURGE_ONLY) return;

  step("Global reference data, company defaults");
  const adminId = oid("employee", 1);
  await ensureGlobals(adminId);
  const roleByName = Object.fromEntries((await M.Role.find({ isDeleted: false }).lean()).map((r) => [r.role_name, r]));
  for (const r of ["Admin", "User", "PC", "AM", "Client"]) if (!roleByName[r]) throw new Error(`PMS role ${r} missing`);
  const commonHelpers = require("../helpers/common");
  if (!(await M.RolePermission.exists({ companyId }))) await commonHelpers.addDefaultPermission(companyId, adminId);
  if (!(await M.ProjectStatus.exists({ companyId }))) await commonHelpers.addDefaultProjectStatus(companyId, adminId);
  if (!(await M.Workflow.exists({ companyId, project_workflow: "Standard" }))) await commonHelpers.addDefaultWorkflowandStages(companyId, adminId);
  await grantDemoPermissions(companyId, adminId, roleByName);

  step("Employees (7 role users + 8 engineers)");
  for (const p of people) {
    const existing = await M.Employee.findOne({ companyId, email: p.email }).select("_id").lean(); // purge removed ours; a foreign row would clash
    if (existing) throw new Error(`employee ${p.email} already exists and is not seeder-owned`);
    p._id = oid("employee", Number(p.code.slice(1)));
    await new M.Employee({
      _id: p._id, companyId, first_name: p.first, last_name: p.last, full_name: p.name, email: p.email, phone_number: `+91 9${rint(100000000, 999999999)}`,
      password: PASSWORD, pms_role_id: roleByName[p.role]._id, isActivate: true, isAdmin: p.role === "Admin", createdBy: adminId, updatedBy: adminId,
      createdAt: day(-400), updatedAt: day(-400),
    }).save();
  }
  const byCode = Object.fromEntries(people.map((p) => [p.code, p]));

  step("Clients, 3 closed projects (PRJ-" + YEAR + "-001..003), milestones, tasks, hours, timesheets");
  const r = await build({ companyId, people, byCode, roleByName, domain: co.domain });

  step("Resource Matrix plan (additive, tagged; no-op when the company has no open project)");
  const _now = new Date();
  await require("./lib/matrixPlan").seedMatrixPlan({
    mongoose, companyId, today: new Date(Date.UTC(_now.getUTCFullYear(), _now.getUTCMonth(), _now.getUTCDate())), log, reset: true, syntheticLeave: false, adminId: oid("employee", 1),
  });

  step("Done");
  log(`Company ${co.name}  id=${COMPANY_ID}  slug=${co.slug}`);
  r.projects.forEach((p) => {
    log(`${p.code} ${p.name} (value INR ${p.value.toLocaleString("en-IN")}, team ${p.team}): ${p.tasks} tasks (all Done), ${p.hours.toFixed(0)}h logged, cost INR ${Math.round(p.cost).toLocaleString("en-IN")} (${((p.cost / p.value) * 100).toFixed(0)}% of value), planned ${p.planned}h`);
    log(`   milestones: ${p.milestones}`);
  });
  const perMonth = {};
  Object.entries(r.monthlyMins).forEach(([k, m]) => { const mk = k.split("|").slice(1).join("-"); perMonth[mk] = (perMonth[mk] || 0) + m / 60; });
  log(`Timesheet submissions: ${r.subs} Approved (months ${Object.keys(perMonth).join(", ")}); team hours per month: ${Object.entries(perMonth).map(([k, h]) => `${k}=${h.toFixed(0)}h`).join(" ")}`);
  log(`${r.logCount} hour logs, ${r.tasks} tasks, ${r.comments} comments, ${r.notif} notifications, ${r.actLogs} activity logs`);
  log(`Logins (password ${PASSWORD}):`);
  people.forEach((p) => log(`   ${p.email.padEnd(28)} ${p.role.padEnd(6)} ${p.name} (${p.code}, ${p.title})`));
}

main()
  .then(() => mongoose.disconnect())
  .catch((err) => {
    console.error(global.chalk.red("\nSeed failed:"), err.stack || err.message);
    return mongoose.disconnect().finally(() => process.exit(1));
  });
