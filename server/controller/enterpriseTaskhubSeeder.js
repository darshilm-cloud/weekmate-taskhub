"use strict";

/**
 * enterpriseTaskhubSeeder.js
 *
 * Deep, roster-driven enterprise demo seeder for TaskHub (PMS). Consumes the
 * canonical roster from Registration (the same people as HRMS/Payroll/CRM) so
 * TaskHub members match by email (SSO), and seeds 400–500 projects with
 * milestones (main tasks), tasks, teams (assignees) and logged hours so every
 * project dashboard / statistic is populated.
 *
 * companyId === registration company _id (TaskHub stores companies._id == that).
 *
 * Reuses the model + field conventions of controller/maintenance.js. Bulk rows
 * are written with insertMany (pre-assigned _ids for linking); purge is compact
 * via cascadeProjectIds (child docs deleted by project_id).
 */

const mongoose = require("mongoose");
const crypto = require("crypto");
const { generateRandomId } = require("../helpers/common");
const configs = require("../configs");
const CONFIG_JSON = require("../settings/config.json");
const DEFAULT_DATA = require("../helpers/constant").DEFAULT_DATA;
const { runEnterpriseTaskhubModulesSeed } = require("./enterpriseTaskhubModulesSeeder");

const PROJECT_TARGET = 45;

const oid = () => new mongoose.Types.ObjectId();
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const sample = (arr, n) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
};
function pastDate(maxDaysBack) {
  const d = new Date();
  d.setDate(d.getDate() - randInt(1, maxDaysBack));
  return d;
}

const PROJECT_PREFIXES = ["Atlas", "Orion", "Phoenix", "Titan", "Nova", "Apollo", "Falcon", "Horizon", "Quantum", "Catalyst", "Nimbus", "Vertex", "Pioneer", "Summit", "Beacon", "Cobalt", "Aurora", "Polaris", "Keystone", "Meridian"];
const PROJECT_DOMAINS = ["Customer Portal", "Mobile App", "Data Platform", "Billing System", "Analytics Dashboard", "Inventory Module", "Payment Gateway", "Onboarding Flow", "CRM Integration", "Reporting Suite", "Notification Service", "Admin Console", "Search Revamp", "API Gateway", "Loyalty Program"];
const TECH_NAMES = ["React", "Node.js", "MongoDB", "Python", "AWS", "Flutter", "PostgreSQL", "Kubernetes"];
const MAIN_TASK_TITLES = ["Discovery & Planning", "Backend Development", "Frontend Development", "QA & Testing", "Deployment & Launch", "UX Design"];
const TASK_TITLES = ["Define requirements", "Design data schema", "Implement API endpoints", "Build UI components", "Write unit tests", "Integrate third-party APIs", "Code review", "Fix reported issues", "Performance tuning", "Prepare release notes", "Set up CI/CD", "Conduct UAT"];

function projectTitle(i) {
  return `${rand(PROJECT_PREFIXES)} - ${rand(PROJECT_DOMAINS)}`;
}

async function insertManyChunked(Model, docs, chunkSize = 1000) {
  let inserted = 0;
  for (let i = 0; i < docs.length; i += chunkSize) {
    const slice = docs.slice(i, i + chunkSize);
    if (!slice.length) continue;
    try {
      const res = await Model.insertMany(slice, { ordered: false });
      inserted += res.length;
    } catch (error) {
      if (error.writeErrors) inserted += slice.length - error.writeErrors.length;
      else if (error.code !== 11000) throw error;
    }
  }
  return inserted;
}

// ---------------------------------------------------------------------------
// Master data
// ---------------------------------------------------------------------------

async function ensureMasterData(companyId, creatorId) {
  const mc = new mongoose.Types.ObjectId(companyId);
  const ProjectType = mongoose.model("projecttypes");
  const ProjectTech = mongoose.model("projecttechs");
  const ProjectStatus = mongoose.model("projectstatus");
  const ProjectWorkFlow = mongoose.model("projectworkflows");
  const WorkFlowStatus = mongoose.model("workflowstatus");
  const TaskLabels = mongoose.model("tasklabels");
  const base = { companyId: mc, createdBy: creatorId, updatedBy: creatorId };

  const foc = async (Model, query, create) => {
    const existing = await Model.findOne(query).lean();
    if (existing) return existing;
    const doc = new Model(create);
    await doc.save();
    return doc.toObject();
  };

  const projectType = await foc(ProjectType, { companyId: mc, isDeleted: false, project_type: "Web Development" }, { ...base, project_type: "Web Development" });

  const techs = [];
  for (const t of TECH_NAMES) techs.push(await foc(ProjectTech, { companyId: mc, project_tech: t }, { ...base, project_tech: t }));

  const statusNames = [DEFAULT_DATA.PROJECT_STATUS.ACTIVE, DEFAULT_DATA.PROJECT_STATUS.ARCHIVED, "On Hold", "Completed"];
  const statuses = {};
  for (const title of statusNames) {
    const doc = await foc(ProjectStatus, { companyId: mc, title, isDeleted: false }, { ...base, title, isDefault: title === DEFAULT_DATA.PROJECT_STATUS.ACTIVE });
    statuses[title] = doc;
  }

  const workflow = await foc(ProjectWorkFlow, { companyId: mc, project_workflow: DEFAULT_DATA.WORKFLOW.STANDARD, isDeleted: false }, { ...base, project_workflow: DEFAULT_DATA.WORKFLOW.STANDARD, status: "active", isDefault: true });

  let workflowStatuses = await WorkFlowStatus.find({ workflow_id: workflow._id, isDeleted: false }).lean();
  if (!workflowStatuses.length) {
    const defs = [
      { title: DEFAULT_DATA.WORKFLOW_STATUS.TODO, color: "#616161", sequence: 1, isDefault: true },
      { title: "In Progress", color: "#FFA500", sequence: 2 },
      { title: "Review", color: "#9370DB", sequence: 3 },
      { title: DEFAULT_DATA.WORKFLOW_STATUS.DONE, color: "#228B22", sequence: 4 },
    ];
    const docs = defs.map((d) => ({ ...d, workflow_id: workflow._id, createdBy: creatorId, updatedBy: creatorId }));
    workflowStatuses = await WorkFlowStatus.insertMany(docs);
    workflowStatuses = workflowStatuses.map((d) => d.toObject());
  }

  const labelDefs = [
    { title: "High Priority", color: "#FF0000" },
    { title: "Medium Priority", color: "#FFA500" },
    { title: "Low Priority", color: "#00FF00" },
  ];
  const labels = [];
  for (const l of labelDefs) labels.push(await foc(TaskLabels, { companyId: mc, title: l.title }, { ...base, ...l }));

  return { projectType, techs, statuses, workflow, workflowStatuses, labels };
}

// ---------------------------------------------------------------------------
// Employees (from roster — email match enables SSO)
// ---------------------------------------------------------------------------

async function ensureEmployees(companyId, roster) {
  const mc = new mongoose.Types.ObjectId(companyId);
  const Employees = mongoose.model("employees");
  const PMSRoles = mongoose.model("pms_roles");

  const allRoles = await PMSRoles.find({ isDeleted: false }).lean();
  const roleMap = {};
  for (const r of allRoles) roleMap[r.role_name.toLowerCase()] = r;
  const roleId = (key) => roleMap[String(key).toLowerCase()]?._id;
  const userRoleId = roleId(CONFIG_JSON.PMS_ROLES.USER) || allRoles[0]?._id;
  const tlRoleId = roleId(CONFIG_JSON.PMS_ROLES.TL) || userRoleId;
  const amRoleId = roleId(CONFIG_JSON.PMS_ROLES.AM) || userRoleId;
  const adminRoleId = roleId(CONFIG_JSON.PMS_ROLES.ADMIN) || userRoleId;

  const hashed = crypto.createHash("md5").update("WeekMate@123").digest("hex");

  const rosterEmails = roster.map((p) => p.email.toLowerCase());
  const existing = await Employees.find({ companyId: mc, email: { $in: rosterEmails } }).select("email pms_role_id").lean();
  const emailToEmp = {};
  for (const e of existing) emailToEmp[e.email.toLowerCase()] = e;

  // resolve a creator: an admin employee, else first existing, else first new.
  let creator = await Employees.findOne({ companyId: mc, isAdmin: true, isDeleted: false }).select("_id").lean();

  const newDocs = [];
  for (const person of roster) {
    const email = person.email.toLowerCase();
    if (emailToEmp[email]) continue;
    const _id = oid();
    const pmsRole = person.role_name === "Reporting Manager" ? (Math.random() < 0.3 ? amRoleId : tlRoleId) : userRoleId;
    newDocs.push({
      _id,
      first_name: person.first_name,
      last_name: person.last_name,
      full_name: person.full_name,
      email,
      phone_number: person.phone_number,
      password: hashed,
      companyId: mc,
      pms_role_id: pmsRole,
      isActivate: person.status === "active",
      isAdmin: false,
      isDeleted: false,
      createdBy: creator?._id || mc,
      updatedBy: creator?._id || mc,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    emailToEmp[email] = { _id, email, pms_role_id: pmsRole };
  }
  // native insert to honour pre-hashed password (skip pre-save hashing)
  if (newDocs.length) await Employees.collection.insertMany(newDocs, { ordered: false }).catch((e) => { if (e.code !== 11000 && !e.writeErrors) throw e; });

  const employees = roster.map((p) => emailToEmp[p.email.toLowerCase()]).filter(Boolean);
  if (!creator) creator = employees[0];

  const managers = employees.filter((e) => String(e.pms_role_id) === String(tlRoleId) || String(e.pms_role_id) === String(amRoleId));
  const accountManagers = employees.filter((e) => String(e.pms_role_id) === String(amRoleId));

  return { employees, creator, managers: managers.length ? managers : employees, accountManagers: accountManagers.length ? accountManagers : employees, newEmployeeIds: newDocs.map((d) => d._id) };
}

// ---------------------------------------------------------------------------
// Projects + milestones + tasks + time logs
// ---------------------------------------------------------------------------

async function seedProjects(companyId, master, team, target) {
  const mc = new mongoose.Types.ObjectId(companyId);
  const { employees, creator, managers, accountManagers } = team;
  const colors = CONFIG_JSON.COLORS || ["#4e73df", "#1cc88a", "#36b9cc", "#f6c23e", "#e74a3b"];
  const empIds = employees.map((e) => e._id);
  const techIds = master.techs.map((t) => t._id);
  const activeStatus = master.statuses[DEFAULT_DATA.PROJECT_STATUS.ACTIVE];
  const statusPool = [
    master.statuses[DEFAULT_DATA.PROJECT_STATUS.ACTIVE], master.statuses[DEFAULT_DATA.PROJECT_STATUS.ACTIVE],
    master.statuses[DEFAULT_DATA.PROJECT_STATUS.ACTIVE], master.statuses["On Hold"],
    master.statuses["Completed"], master.statuses[DEFAULT_DATA.PROJECT_STATUS.ARCHIVED],
  ].filter(Boolean);

  const projectDocs = [];
  const folderDocs = [];
  const timesheetDocs = [];
  const mainTaskDocs = [];
  const taskDocs = [];
  const logDocs = [];

  const wfTodo = master.workflowStatuses.find((s) => s.title === DEFAULT_DATA.WORKFLOW_STATUS.TODO) || master.workflowStatuses[0];

  for (let i = 0; i < target; i++) {
    const projectId = oid();
    const manager = rand(managers);
    const accManager = rand(accountManagers);
    const assignees = sample(empIds, randInt(3, 7));
    const start = pastDate(330);
    const end = new Date(start.getTime() + randInt(20, 180) * 86400000);
    const status = rand(statusPool) || activeStatus;

    projectDocs.push({
      _id: projectId,
      companyId: mc,
      title: projectTitle(i),
      projectId: generateRandomId(),
      color: rand(colors),
      descriptions: `Initiative covering ${rand(PROJECT_DOMAINS).toLowerCase()} for an enterprise customer.`,
      technology: sample(techIds, randInt(1, 3)),
      project_type: master.projectType._id,
      project_status: status._id,
      manager: manager._id,
      acc_manager: accManager?._id || null,
      assignees,
      pms_clients: [],
      workFlow: master.workflow._id,
      estimatedHours: String(randInt(80, 1200)),
      isBillable: Math.random() < 0.8,
      isBugsEnabled: true,
      start_date: start,
      end_date: end,
      createdBy: creator._id,
      updatedBy: creator._id,
      createdByModel: "employees",
      updatedByModel: "employees",
      isDeleted: false,
      createdAt: start,
      updatedAt: start,
    });

    folderDocs.push({ _id: oid(), name: "Project Files", isDefault: true, project_id: projectId, createdBy: creator._id, updatedBy: creator._id, createdAt: start, updatedAt: start });
    const timesheetId = oid();
    timesheetDocs.push({ _id: timesheetId, title: "Default Timesheet", isDefault: true, project_id: projectId, createdBy: creator._id, updatedBy: creator._id, createdAt: start, updatedAt: start });

    // 3 milestones (main tasks)
    const mtTitles = sample(MAIN_TASK_TITLES, 3);
    const mainTaskIds = [];
    for (const title of mtTitles) {
      const mtId = oid();
      mainTaskIds.push(mtId);
      mainTaskDocs.push({
        _id: mtId, title, project_id: projectId,
        subscribers: sample(assignees, Math.min(3, assignees.length)),
        pms_clients: [], status: "active",
        createdBy: creator._id, updatedBy: creator._id, createdByModel: "employees", updatedByModel: "employees",
        isDeleted: false, createdAt: start, updatedAt: start,
      });
    }

    // ~6 tasks spread across milestones + workflow statuses
    const taskCount = randInt(5, 8);
    for (let t = 0; t < taskCount; t++) {
      const taskId = oid();
      const wf = rand(master.workflowStatuses);
      const taskAssignees = sample(assignees, Math.min(randInt(1, 3), assignees.length));
      const tStart = new Date(start.getTime() + randInt(0, 30) * 86400000);
      taskDocs.push({
        _id: taskId,
        title: rand(TASK_TITLES),
        taskId: generateRandomId(),
        project_id: projectId,
        main_task_id: rand(mainTaskIds),
        status: "active",
        priority: rand(["Low", "Medium", "High"]),
        descriptions: "Work item for the project deliverable.",
        task_labels: [rand(master.labels)._id],
        assignees: taskAssignees,
        pms_clients: [],
        estimated_hours: String(randInt(1, 16)).padStart(2, "0"),
        estimated_minutes: rand(["00", "15", "30", "45"]),
        task_progress: String(wf.title === DEFAULT_DATA.WORKFLOW_STATUS.DONE ? 100 : randInt(0, 90)),
        task_status: wf._id,
        task_status_history: [{ task_status: wf._id, updatedBy: creator._id, updatedAt: configs.utcDefault() }],
        start_date: tStart,
        due_date: new Date(tStart.getTime() + randInt(2, 21) * 86400000),
        createdBy: creator._id, updatedBy: creator._id, createdByModel: "employees", updatedByModel: "employees",
        isDeleted: false, createdAt: tStart, updatedAt: tStart,
      });

      // 1-2 logged-hours entries per task (project statistics)
      const logCount = randInt(1, 2);
      for (let l = 0; l < logCount; l++) {
        const logEmp = taskAssignees.length ? rand(taskAssignees) : rand(empIds);
        logDocs.push({
          _id: oid(),
          employee_id: logEmp,
          project_id: projectId,
          task_id: taskId,
          timesheet_id: timesheetId,
          descriptions: "Logged work on the task.",
          logged_hours: String(randInt(1, 6)).padStart(2, "0"),
          logged_minutes: rand(["00", "15", "30", "45"]),
          logged_date: new Date(tStart.getTime() + randInt(1, 14) * 86400000),
          isManuallyAdded: true,
          logged_status: rand(["Billable", "Billable", "Non-billable"]),
          createdBy: logEmp, updatedBy: logEmp, createdByModel: "employees", updatedByModel: "employees",
          isDeleted: false, createdAt: tStart, updatedAt: tStart,
        });
      }
    }
  }

  // Bulk insert (native — backdated createdAt + skip per-doc hooks)
  const Projects = mongoose.model("projects");
  const FileFolders = mongoose.model("filefolders");
  const ProjectTimeSheet = mongoose.model("projecttimesheets");
  const ProjectMainTask = mongoose.model("projectmaintasks");
  const ProjectTasks = mongoose.model("projecttasks");
  const TaskHoursLogs = mongoose.model("projecttaskhourlogs");

  const nativeInsert = async (Model, docs) => {
    let n = 0;
    for (let i = 0; i < docs.length; i += 2000) {
      const slice = docs.slice(i, i + 2000);
      if (!slice.length) continue;
      try { const r = await Model.collection.insertMany(slice, { ordered: false }); n += r.insertedCount || slice.length; }
      catch (e) { if (e.code !== 11000 && !e.writeErrors) throw e; n += (e.result?.nInserted || 0); }
    }
    return n;
  };

  await nativeInsert(Projects, projectDocs);
  await nativeInsert(FileFolders, folderDocs);
  await nativeInsert(ProjectTimeSheet, timesheetDocs);
  await nativeInsert(ProjectMainTask, mainTaskDocs);
  await nativeInsert(ProjectTasks, taskDocs);
  await nativeInsert(TaskHoursLogs, logDocs);

  return {
    projectIds: projectDocs.map((p) => p._id),
    counts: { projects: projectDocs.length, mainTasks: mainTaskDocs.length, tasks: taskDocs.length, logs: logDocs.length, timesheets: timesheetDocs.length, folders: folderDocs.length },
  };
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

/**
 * Runs the full TaskHub enterprise seed for a company.
 * @returns {Promise<{ createdRecords: Object, summary: Object }>}
 */
async function runEnterpriseTaskhubSeed({ companyId, roster }) {
  const Projects = mongoose.model("projects");
  const mc = new mongoose.Types.ObjectId(companyId);

  const team = await ensureEmployees(companyId, roster);
  const master = await ensureMasterData(companyId, team.creator._id);

  const existingProjects = await Projects.countDocuments({ companyId: mc, isDeleted: false });
  let projectResult = { projectIds: [], counts: { projects: 0, mainTasks: 0, tasks: 0, logs: 0, timesheets: 0, folders: 0 } };
  if (existingProjects < PROJECT_TARGET) {
    projectResult = await seedProjects(companyId, master, team, PROJECT_TARGET - existingProjects);
  }

  // Compact purge descriptor: child docs (maintasks/tasks/logs/timesheets/
  // folders) are deleted by project_id via cascadeProjectIds; the rest by id.
  const createdRecords = {
    cascadeProjectIds: projectResult.projectIds.map((id) => id.toString()),
    projects: projectResult.projectIds.map((id) => id.toString()),
    employees: team.newEmployeeIds.map((id) => id.toString()),
    projecttypes: [master.projectType._id.toString()],
    projecttechs: master.techs.map((t) => t._id.toString()),
    projectstatus: Object.values(master.statuses).map((s) => s._id.toString()),
    projectworkflows: [master.workflow._id.toString()],
    workflowstatus: master.workflowStatuses.map((s) => s._id.toString()),
    tasklabels: master.labels.map((l) => l._id.toString()),
  };

  const summary = {
    companyId,
    membersInTaskhub: team.employees.length,
    newMembers: team.newEmployeeIds.length,
    ...projectResult.counts,
    skippedExistingProjects: existingProjects >= PROJECT_TARGET,
  };

  // Second pass: fill the still-empty module screens (bugs, comments, sub-tasks,
  // files, hours approval, notifications, discussions, timers, notes, holidays,
  // clients, optional modules) + top up current-month logs/timesheets. Re-uses
  // the project/task/employee ids just created.
  try {
    const modulesResult = await runEnterpriseTaskhubModulesSeed({
      companyId,
      primaryCreatedRecords: createdRecords,
    });
    // Merge module createdRecords (id lists) into the purge descriptor.
    for (const [collection, ids] of Object.entries(modulesResult.createdRecords || {})) {
      if (!Array.isArray(ids) || !ids.length) continue;
      createdRecords[collection] = (createdRecords[collection] || []).concat(ids);
    }
    // Ensure the cascade covers every seeded project (existing + reused).
    if (Array.isArray(modulesResult.cascadeProjectIds) && modulesResult.cascadeProjectIds.length) {
      const set = new Set([...(createdRecords.cascadeProjectIds || []), ...modulesResult.cascadeProjectIds]);
      createdRecords.cascadeProjectIds = Array.from(set);
    }
    summary.modules = modulesResult.summary;
  } catch (err) {
    summary.modulesError = err && err.message ? err.message : String(err);
  }

  return { createdRecords, summary };
}

module.exports = { runEnterpriseTaskhubSeed };
