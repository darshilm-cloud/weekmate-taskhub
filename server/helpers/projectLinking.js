/**
 * Helpers for the cross-product extension of POST /projects/add
 * (projectCode, emails -> employees, clientName -> pmsclient, milestones, taskLists).
 */
const mongoose = require("mongoose");
const crypto = require("crypto");
const { generateRandomId } = require("./common");

const DEFAULT_MILESTONES = [
  { key: "M1", title: "Kickoff and requirements", weight: 10 },
  { key: "M2", title: "UI/UX design and approval", weight: 15 },
  { key: "M3", title: "Backend development", weight: 25 },
  { key: "M4", title: "Mobile/Frontend development", weight: 20 },
  { key: "M5", title: "Integration and QA", weight: 15 },
  { key: "M6", title: "UAT and client review", weight: 10 },
  { key: "M7", title: "Deployment and handover", weight: 5 },
];

const lc = (s) => String(s || "").trim().toLowerCase();

/** { email -> employee _id } for the company, plus the emails that did not resolve. */
async function resolveEmails(companyId, emails) {
  const wanted = [...new Set(emails.map(lc).filter(Boolean))];
  if (!wanted.length) return { byEmail: {}, unresolved: [] };
  const rows = await mongoose
    .model("employees")
    .find({ companyId, email: { $in: wanted }, isDeleted: false })
    .select("_id email")
    .lean();
  const byEmail = Object.fromEntries(rows.map((r) => [lc(r.email), r._id]));
  return { byEmail, unresolved: wanted.filter((e) => !byEmail[e]) };
}

/**
 * Create Taskhub users for people that exist in HRMS but not here yet (a new hire). They get the plain "User" role and a
 * random password (sign-in goes through the shared company login). Existing emails are left untouched. Never throws.
 */
async function provisionUsers(companyId, users, createdBy) {
  const created = [];
  try {
    const Employee = mongoose.model("employees");
    const role = await mongoose.model("pms_roles").findOne({ role_name: "User", isDeleted: false }).select("_id").lean();
    for (const u of users || []) {
      const email = lc(u.email);
      if (!email) continue;
      if (await Employee.exists({ companyId, email, isDeleted: false })) continue;
      const parts = String(u.full_name || "").trim().split(/\s+/).filter(Boolean);
      const first = u.first_name || parts[0] || email.split("@")[0];
      const last = u.last_name || parts.slice(1).join(" ") || "";
      const pwd = process.env.TASKHUB_NEW_USER_PASSWORD || `Th-${crypto.randomBytes(6).toString("hex")}`;
      await new Employee({
        companyId, first_name: first, last_name: last, full_name: `${first} ${last}`.trim(), email, phone_number: u.phone_number || "",
        password: pwd, pms_role_id: role?._id, isActivate: true, isAdmin: false, createdBy, updatedBy: createdBy,
      }).save();
      created.push(email);
    }
  } catch (e) {
    console.log("provisionUsers failed:", e?.message);
  }
  return created;
}

/** Find a pmsclient by company name (or full name); create one when missing. */
async function findOrCreateClient(companyId, clientName, createdBy) {
  const name = String(clientName || "").trim();
  if (!name) return null;
  const PMSClient = mongoose.model("pmsclients");
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rx = new RegExp(`^${escaped}$`, "i");
  const existing = await PMSClient.findOne({
    companyId,
    isDeleted: false,
    $or: [{ company_name: rx }, { full_name: rx }],
  }).select("_id");
  if (existing) return existing._id;

  const clientRole = await mongoose.model("pms_roles").findOne({ role_name: "Client", isDeleted: false }).select("_id").lean();
  if (!clientRole) throw new Error("Client role not found; cannot create the client record");
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/(^\.|\.$)/g, "") || "client";
  const password = `Cl-${crypto.randomBytes(5).toString("hex")}`;
  const doc = new PMSClient({
    companyId,
    first_name: name.split(/\s+/)[0],
    last_name: name.split(/\s+/).slice(1).join(" ") || "Client",
    full_name: name,
    company_name: name,
    email: `${slug}@client.invalid`,
    password,
    plain_password: password,
    pms_role_id: clientRole._id,
    isActivate: true,
    createdBy,
    updatedBy: createdBy,
  });
  await doc.save();
  return doc._id;
}

/** Milestones for a new project. Falls back to the standard M1..M7 set when `list` is empty. */
async function createMilestones({ list, project, req, refModel }) {
  const Milestone = mongoose.model("projectmilestones");
  const items = list && list.length ? list : [];
  const docs = items.map((m, i) => ({
    companyId: project.companyId,
    project_id: project._id,
    key: m.key,
    title: m.title,
    description: m.description || "",
    weight: m.weight ?? 0,
    billingPercent: m.billingPercent ?? 0,
    dueDate: m.dueDate || null,
    sequence: i + 1,
    status: "Not Started",
    history: [{ action: "created", status: "Not Started", by: req.user._id, at: new Date() }],
    createdBy: req.user._id,
    updatedBy: req.user._id,
    ...refModel,
  }));
  if (!docs.length) return 0;
  await Milestone.insertMany(docs);
  return docs.length;
}

/** Task lists + tasks (assigneeEmail resolved through `byEmail`). */
async function createTaskLists({ lists, project, req, refModel, byEmail }) {
  if (!lists || !lists.length) return { lists: 0, tasks: 0 };
  const MainTask = mongoose.model("projectmaintasks");
  const Task = mongoose.model("projecttasks");
  const WorkFlowStatus = mongoose.model("workflowstatus");

  let defaultStatus = null;
  if (project.workFlow) {
    defaultStatus = await WorkFlowStatus.findOne({ workflow_id: project.workFlow, isDeleted: false })
      .sort({ isDefault: -1, sequence: 1 })
      .select("_id")
      .lean();
  }
  let taskCount = 0;
  for (const list of lists) {
    const main = await new MainTask({
      title: list.title,
      project_id: project._id,
      task_status: defaultStatus?._id || null,
      createdBy: req.user._id,
      updatedBy: req.user._id,
      ...refModel,
    }).save();
    for (const t of list.tasks || []) {
      const assignee = t.assigneeEmail ? byEmail[lc(t.assigneeEmail)] : null;
      await new Task({
        title: t.title,
        taskId: generateRandomId(),
        project_id: project._id,
        main_task_id: main._id,
        task_status: defaultStatus?._id || null,
        assignees: assignee ? [assignee] : [],
        due_date: t.dueDate || null,
        end_date: t.dueDate || null,
        createdBy: req.user._id,
        updatedBy: req.user._id,
        ...refModel,
      }).save();
      taskCount++;
    }
  }
  return { lists: lists.length, tasks: taskCount };
}

module.exports = { DEFAULT_MILESTONES, lc, resolveEmails, provisionUsers, findOrCreateClient, createMilestones, createTaskLists };
