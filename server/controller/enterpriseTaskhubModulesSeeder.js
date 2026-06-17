"use strict";

/**
 * enterpriseTaskhubModulesSeeder.js
 *
 * Extends the deep TaskHub enterprise seed (enterpriseTaskhubSeeder.js) so that
 * the modules whose screens are still EMPTY get realistic demo data:
 *   Bugs (+ comments), Task comments, Sub-tasks, File attachments,
 *   Hours-approval (date-filtered incl. current month), Notifications,
 *   Discussions (topics + replies), Task timers (incl. running ones),
 *   Notes/Notebooks (+ note comments), Holidays, Clients, and the optional
 *   modules (reviews, project expenses, complaints +comments +status,
 *   consumer feedback, logged-hours comments).
 *
 * It also tops up logged hours / a few extra timesheets so the project
 * dashboards' month filter reaches the current month (June 2026).
 *
 * Re-uses the project ids, task ids, main-task ids, employee ids already
 * created by the primary seeder (passed in via `ctx`). Bulk rows are written
 * with the native driver (`collection.insertMany`) so back-dated createdAt and
 * pre-assigned _ids survive, matching the primary seeder. Idempotent: each
 * collection is skipped when it already has rows for the seeded projects.
 *
 * The holidays model is required directly because it is intentionally left out
 * of models/index.js (so mongoose.model("holidays") is otherwise unregistered).
 */

const mongoose = require("mongoose");
const { generateRandomId } = require("../helpers/common");

// holidays model is not registered via models/index.js — register it on demand.
try {
  mongoose.model("holidays");
} catch (e) {
  // eslint-disable-next-line global-require
  require("../models/holidays");
}

// ---------------------------------------------------------------------------
// Small helpers (kept local; mirror enterpriseTaskhubSeeder.js conventions)
// ---------------------------------------------------------------------------

const oid = () => new mongoose.Types.ObjectId();
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const chance = (p) => Math.random() < p;
const sample = (arr, n) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.max(0, n));
};
const pad2 = (n) => String(n).padStart(2, "0");

const NOW = () => new Date();
function daysAgo(maxDaysBack, minDaysBack = 1) {
  const d = new Date();
  d.setDate(d.getDate() - randInt(minDaysBack, maxDaysBack));
  d.setHours(randInt(8, 18), randInt(0, 59), 0, 0);
  return d;
}
// A datetime inside the current month, on/before today (for "June 2026" data).
function thisMonthDate() {
  const now = new Date();
  const day = randInt(1, now.getDate());
  const d = new Date(now.getFullYear(), now.getMonth(), day, randInt(8, 18), randInt(0, 59), 0, 0);
  return d;
}

// Native chunked insert that tolerates duplicate-key races (idempotent re-runs).
async function nativeInsert(Model, docs) {
  let n = 0;
  for (let i = 0; i < docs.length; i += 2000) {
    const slice = docs.slice(i, i + 2000);
    if (!slice.length) continue;
    try {
      const r = await Model.collection.insertMany(slice, { ordered: false });
      n += r.insertedCount || slice.length;
    } catch (e) {
      if (e.code !== 11000 && !e.writeErrors) throw e;
      n += e.result?.nInserted || e.result?.result?.nInserted || 0;
    }
  }
  return n;
}

// createdBy/createdByModel polymorphic block used by commonSchema(isRefPath=true)
function auditRef(empId, at) {
  return {
    createdBy: empId,
    updatedBy: empId,
    createdByModel: "employees",
    updatedByModel: "employees",
    createdAt: at,
    updatedAt: at,
    isDeleted: false,
  };
}
// Plain audit block for schemas that do NOT use refPath (folders/notebook/etc.)
function auditPlain(empId, at) {
  return {
    createdBy: empId,
    updatedBy: empId,
    createdAt: at,
    updatedAt: at,
    isDeleted: false,
  };
}

// ---------------------------------------------------------------------------
// Realistic content pools
// ---------------------------------------------------------------------------

const BUG_TITLES = [
  "Login fails intermittently on Safari",
  "Pagination skips last record on large lists",
  "Date picker shows wrong timezone offset",
  "CSV export truncates UTF-8 characters",
  "Dashboard chart renders blank on first load",
  "Password reset email not delivered",
  "File upload exceeds memory on 50MB files",
  "Search returns stale results after edit",
  "Notification badge count off by one",
  "Mobile layout overlaps on small screens",
  "API returns 500 on empty filter payload",
  "Session expires earlier than configured",
  "Duplicate records created on double submit",
  "Sorting by date ignores time component",
  "Webhook retries cause duplicate writes",
  "Currency rounding error in invoice totals",
  "Drag-and-drop reorder not persisted",
  "Tooltip clipped inside scroll container",
];
const BUG_DESCS = [
  "Steps to reproduce: open the screen, perform the action, observe the incorrect result. Expected the operation to complete successfully.",
  "Reproducible on the latest build. Console shows an unhandled rejection. Needs investigation in the request handler.",
  "Occurs only with large datasets. Likely a pagination/offset boundary issue. Add a regression test.",
  "Reported by QA during the sprint review. Affects a small subset of users but blocks the happy path.",
];
const BUG_COMMENTS = [
  "Reproduced on staging. Looks like a boundary condition in the query builder.",
  "Assigned to me — will pick this up after the current task.",
  "Added a unit test that fails on the reported case.",
  "Root cause is a missing null check. PR incoming.",
  "Verified the fix on QA. Ready to close.",
  "Could not reproduce on the latest build — can you confirm the version?",
  "Workaround applied; permanent fix tracked separately.",
];

const TASK_COMMENTS = [
  "Pushed the first cut — please review the API contract.",
  "Blocked on the design spec; following up with the team.",
  "Refactored the service layer; tests are green.",
  "Can we split this into two tasks? Scope grew.",
  "Synced with the client; requirements confirmed.",
  "Estimate looks tight — flagging for the next standup.",
  "Done on my side, moving to review.",
  "Left a couple of inline notes on the implementation.",
];

const SUBTASK_TITLES = [
  "Write unit tests", "Update API docs", "Add input validation", "Handle error states",
  "Wire up the loading spinner", "Add pagination", "Cache the response", "Add audit logging",
  "Review accessibility", "Add feature flag", "Migrate the schema", "Add metrics",
];

const FILE_BLUEPRINTS = [
  { name: "SRS.pdf", type: ".pdf" },
  { name: "Wireframes.fig", type: ".fig" },
  { name: "Budget.xlsx", type: ".xlsx" },
  { name: "Architecture-Diagram.png", type: ".png" },
  { name: "Meeting-Notes.docx", type: ".docx" },
  { name: "API-Contract.yaml", type: ".yaml" },
  { name: "Test-Plan.pdf", type: ".pdf" },
  { name: "Release-Checklist.md", type: ".md" },
  { name: "Database-Schema.png", type: ".png" },
  { name: "Sprint-Demo.mp4", type: ".mp4" },
  { name: "Branding-Guidelines.pdf", type: ".pdf" },
  { name: "Cost-Estimate.xlsx", type: ".xlsx" },
];

const DISCUSSION_TOPICS = [
  "Sprint retrospective action items",
  "API versioning strategy",
  "Choosing a state-management approach",
  "Performance budget for the dashboard",
  "Handling timezones across the app",
  "Release process and rollback plan",
  "Accessibility audit findings",
  "Database indexing review",
  "Third-party integration trade-offs",
  "Onboarding flow improvements",
];
const DISCUSSION_REPLIES = [
  "Good point — I'd lean towards the simpler option for now.",
  "Let's document the decision in the wiki so it doesn't get lost.",
  "I benchmarked both approaches; numbers attached.",
  "Agreed. I'll open a follow-up task to track this.",
  "We tried this on the previous project and it worked well.",
  "Can we revisit this after the release? Bandwidth is tight.",
  "+1 from me. Happy to pair on the implementation.",
  "Raising a concern about backward compatibility here.",
];

const NOTEBOOK_TITLES = ["Project Wiki", "Meeting Notes", "Decisions Log", "Onboarding Guide"];
const NOTE_TITLES = [
  "Kickoff summary", "Architecture decisions", "Client requirements", "Sprint planning notes",
  "Tech debt backlog", "Deployment runbook", "Risk register", "Glossary",
];
const NOTE_BODIES = [
  "Captured the key decisions from today's session. Owners and due dates noted inline.",
  "Summary of the requirements gathered with the client. Open questions listed at the bottom.",
  "Runbook for deploying to production, including rollback steps and health checks.",
  "Running list of technical debt items with rough effort estimates.",
];
const NOTE_COMMENTS = [
  "Added the missing acceptance criteria.",
  "Linked the related ticket for context.",
  "We should keep this updated each sprint.",
  "Great summary — thanks for writing this up.",
];

// Company-wide holiday list (India-centric, with upcoming 2026 dates).
const HOLIDAYS_2026 = [
  { name: "New Year's Day", date: "2026-01-01" },
  { name: "Republic Day", date: "2026-01-26" },
  { name: "Holi", date: "2026-03-04" },
  { name: "Good Friday", date: "2026-04-03" },
  { name: "Independence Day", date: "2026-08-15" },
  { name: "Raksha Bandhan", date: "2026-08-28", optional: true },
  { name: "Ganesh Chaturthi", date: "2026-09-14", optional: true },
  { name: "Gandhi Jayanti", date: "2026-10-02" },
  { name: "Dussehra", date: "2026-10-20" },
  { name: "Diwali", date: "2026-11-08" },
  { name: "Christmas Day", date: "2026-12-25" },
];

const CLIENT_FIRST = ["James", "Olivia", "William", "Sophia", "Benjamin", "Emma", "Lucas", "Ava", "Henry", "Mia", "Daniel", "Charlotte", "Michael", "Amelia", "David", "Harper", "Joseph", "Ella", "Samuel", "Grace"];
const CLIENT_LAST = ["Anderson", "Bennett", "Carter", "Dawson", "Edwards", "Fletcher", "Greene", "Harris", "Ingram", "Jenkins", "Knight", "Lawson", "Mitchell", "Norton", "Owens", "Parker", "Quinn", "Reynolds", "Sutton", "Turner"];
const CLIENT_COMPANIES = ["Northwind Trading", "Globex Corp", "Initech Systems", "Umbrella Retail", "Stark Industries", "Wayne Enterprises", "Acme Logistics", "Hooli Cloud", "Pied Piper", "Vandelay Imports", "Soylent Foods", "Cyberdyne", "Massive Dynamic", "Wonka Group", "Tyrell Solutions", "Gekko Capital", "Oscorp Labs", "Bluth Company", "Dunder Retail", "Prestige Worldwide"];

const REVIEW_FEEDBACKS = [
  "The team delivered ahead of schedule and communication was excellent throughout.",
  "Great technical depth and a smooth onboarding experience for our staff.",
  "Responsive, professional, and proactive about flagging risks early.",
  "High-quality work; we have already scoped the next phase with them.",
];
const EXPENSE_DETAILS = [
  { req: "Cloud hosting (monthly)", nature: "Infrastructure" },
  { req: "Third-party API subscription", nature: "Software License" },
  { req: "SSL certificate renewal", nature: "Security" },
  { req: "Design tool seats", nature: "Tooling" },
  { req: "Load-testing service", nature: "Testing" },
];
const COMPLAINTS = [
  { complaint: "Reported defect was not fixed within the agreed SLA.", reason: "Delayed turnaround on a critical bug.", priority: "high" },
  { complaint: "Status updates were infrequent during the last sprint.", reason: "Communication gap noted by the client.", priority: "medium" },
  { complaint: "A delivered feature did not match the agreed spec.", reason: "Requirement interpretation mismatch.", priority: "high" },
  { complaint: "Minor UI inconsistency on the reports page.", reason: "Cosmetic issue reported post-release.", priority: "low" },
];

// ---------------------------------------------------------------------------
// Bug workflow statuses (per company) — needed for bug_status.
// ---------------------------------------------------------------------------

async function ensureBugStages(companyId, creatorId) {
  const Model = mongoose.model("bugsworkflowstatus");
  const mc = new mongoose.Types.ObjectId(companyId);
  const existing = await Model.find({ companyId: mc, isDeleted: false }).sort({ sequence: 1 }).lean();
  if (existing.length) return { stages: existing, createdIds: [] };

  const defs = [
    { title: "To-Do", color: "#89CFF0", sequence: 1, isDefault: true },
    { title: "In Progress", color: "#89CFF0", sequence: 2 },
    { title: "To be Tested", color: "#89CFF0", sequence: 3 },
    { title: "On Hold", color: "#89CFF0", sequence: 4 },
    { title: "Closed", color: "#89CFF0", sequence: 5 },
  ];
  const at = new Date();
  const docs = defs.map((d) => ({
    _id: oid(),
    ...d,
    companyId: mc,
    createdBy: creatorId,
    updatedBy: creatorId,
    createdAt: at,
    updatedAt: at,
    isDeleted: false,
    deletedAt: null,
  }));
  await nativeInsert(Model, docs);
  return { stages: docs, createdIds: docs.map((d) => d._id) };
}

// ---------------------------------------------------------------------------
// 1. Bugs (+ bug comments)
// ---------------------------------------------------------------------------

async function seedBugs(ctx, stages) {
  const Bugs = mongoose.model("projecttaskbugs");
  const BugComments = mongoose.model("bugscomments");
  const { projects, employees, labelIds } = ctx;

  const bugDocs = [];
  const commentDocs = [];

  for (const proj of projects) {
    const projAssignees = proj.assignees.length ? proj.assignees : employees;
    const projTasks = ctx.tasksByProject[proj._id.toString()] || [];
    const bugCount = randInt(3, 6);
    for (let b = 0; b < bugCount; b++) {
      const stage = rand(stages);
      const start = chance(0.4) ? thisMonthDate() : daysAgo(200, 5);
      const assignees = sample(projAssignees, randInt(1, 3));
      const reporter = rand(projAssignees);
      const linkedTask = projTasks.length && chance(0.6) ? rand(projTasks) : null;
      const bugId = oid();
      bugDocs.push({
        _id: bugId,
        title: rand(BUG_TITLES),
        project_id: proj._id,
        task_id: linkedTask || null,
        sub_task_id: null,
        status: "active",
        descriptions: rand(BUG_DESCS),
        bugId: generateRandomId(),
        bug_labels: labelIds.length ? [rand(labelIds)] : [],
        start_date: start,
        due_date: new Date(start.getTime() + randInt(3, 21) * 86400000),
        assignees,
        estimated_hours: pad2(randInt(1, 8)),
        estimated_minutes: rand(["00", "15", "30", "45"]),
        progress: stage.title === "Closed" ? "100" : String(randInt(0, 80)),
        bug_status: stage._id,
        bug_status_history: [{ bug_status: stage._id, updatedBy: reporter, updatedAt: start }],
        isImported: false,
        isRepeated: false,
        ...auditRef(reporter, start),
      });

      const commentN = randInt(1, 3);
      for (let c = 0; c < commentN; c++) {
        const author = rand(projAssignees);
        const cAt = new Date(start.getTime() + (c + 1) * randInt(1, 3) * 86400000);
        commentDocs.push({
          _id: oid(),
          comment: rand(BUG_COMMENTS),
          bug_id: bugId,
          employee_id: author,
          taggedUsers: chance(0.3) ? sample(projAssignees, 1) : [],
          status_history: [],
          isResolve: false,
          ...auditRef(author, cAt > NOW() ? start : cAt),
        });
      }
    }
  }

  const bugs = await nativeInsert(Bugs, bugDocs);
  const comments = await nativeInsert(BugComments, commentDocs);
  return { bugs, comments, bugIds: bugDocs.map((d) => d._id) };
}

// ---------------------------------------------------------------------------
// 2. Task comments (collection "Comments")
// ---------------------------------------------------------------------------

async function seedTaskComments(ctx) {
  const Comments = mongoose.model("Comments");
  const { allTasks, employees } = ctx;
  const docs = [];
  // subset of tasks (~45%)
  const subset = allTasks.filter(() => chance(0.45));
  for (const task of subset) {
    const pool = task.assignees && task.assignees.length ? task.assignees : employees;
    const n = randInt(1, 3);
    for (let i = 0; i < n; i++) {
      const author = rand(pool);
      const at = daysAgo(120, 1);
      docs.push({
        _id: oid(),
        comment: rand(TASK_COMMENTS),
        task_id: task._id,
        employee_id: author,
        taggedUsers: chance(0.25) ? sample(pool, 1) : [],
        status_history: [],
        isResolve: false,
        ...auditRef(author, at),
      });
    }
  }
  const inserted = await nativeInsert(Comments, docs);
  return { comments: inserted, ids: docs.map((d) => d._id) };
}

// ---------------------------------------------------------------------------
// 3. Sub-tasks (projectsubtasks)
// ---------------------------------------------------------------------------

async function seedSubTasks(ctx) {
  const SubTasks = mongoose.model("projectsubtasks");
  const { allTasks, employees, wfStatuses, labelIds } = ctx;
  const docs = [];
  const subset = allTasks.filter(() => chance(0.3)); // ~30% of tasks
  for (const task of subset) {
    const pool = task.assignees && task.assignees.length ? task.assignees : employees;
    const n = randInt(2, 3);
    for (let i = 0; i < n; i++) {
      const wf = wfStatuses.length ? rand(wfStatuses) : null;
      const author = rand(pool);
      const start = task.start_date || daysAgo(120, 5);
      const tStart = new Date(new Date(start).getTime() + randInt(0, 10) * 86400000);
      docs.push({
        _id: oid(),
        title: rand(SUBTASK_TITLES),
        project_id: task.project_id,
        main_task_id: task.main_task_id,
        task_id: task._id,
        descriptions: "Sub-deliverable for the parent task.",
        subTaskId: generateRandomId(),
        status: "active",
        task_labels: labelIds.length ? [rand(labelIds)] : [],
        start_date: tStart,
        due_date: new Date(tStart.getTime() + randInt(2, 14) * 86400000),
        assignees: sample(pool, Math.min(2, pool.length)),
        estimated_hours: pad2(randInt(1, 6)),
        estimated_minutes: rand(["00", "15", "30", "45"]),
        task_progress: wf && wf.title === "Done" ? "100" : String(randInt(0, 90)),
        task_status: wf ? wf._id : null,
        task_status_history: wf ? [{ task_status: wf._id, updatedBy: author, updatedAt: tStart }] : [],
        comments: [],
        createdBy: author,
        updatedBy: author,
        createdAt: tStart,
        updatedAt: tStart,
        isDeleted: false,
        deletedAt: null,
      });
    }
  }
  const inserted = await nativeInsert(SubTasks, docs);
  return { subtasks: inserted, ids: docs.map((d) => d._id) };
}

// ---------------------------------------------------------------------------
// 4. File attachments (fileuploads)
// ---------------------------------------------------------------------------

async function seedFiles(ctx) {
  const FileUploads = mongoose.model("fileuploads");
  const { projects, employees, companyId, folderByProject } = ctx;
  const mc = new mongoose.Types.ObjectId(companyId);
  const docs = [];
  for (const proj of projects) {
    const pool = proj.assignees.length ? proj.assignees : employees;
    const folderId = folderByProject[proj._id.toString()] || null;
    const blueprints = sample(FILE_BLUEPRINTS, randInt(3, 5));
    for (const bp of blueprints) {
      const author = rand(pool);
      const at = chance(0.3) ? thisMonthDate() : daysAgo(250, 5);
      docs.push({
        _id: oid(),
        name: bp.name,
        file_type: bp.type,
        path: `/public/folderWise/${bp.name.replace(/\.[^.]+$/, "")}_${at.getTime()}${bp.type}`,
        file_section: "Files",
        project_id: proj._id,
        companyId: mc,
        folder_id: folderId,
        task_id: null,
        sub_task_id: null,
        comments_id: null,
        discussion_topic_id: null,
        discussion_topic_details_id: null,
        bugs_id: null,
        subscribers: [],
        pms_clients: [],
        file_size: randInt(50, 8000) * 1024,
        isBookmark: false,
        complaint_comment_id: null,
        ...auditRef(author, at),
      });
    }
  }
  const inserted = await nativeInsert(FileUploads, docs);
  return { files: inserted, ids: docs.map((d) => d._id) };
}

// ---------------------------------------------------------------------------
// 5. Hours approval (approvedHours) — DATE-FILTERED incl. current month.
// ---------------------------------------------------------------------------

async function seedHoursApproval(ctx) {
  const Approved = mongoose.model("approvedHours");
  const { employees, managers, creatorId } = ctx;
  const docs = [];

  const now = new Date();
  // last 4 months including the current month (e.g. Mar, Apr, May, Jun 2026)
  const periods = [];
  for (let back = 3; back >= 0; back--) {
    const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
    periods.push({ month: String(d.getMonth() + 1), year: String(d.getFullYear()) });
  }

  const approverPool = managers && managers.length ? managers : employees;
  for (const empId of employees) {
    for (const p of periods) {
      // a per-employee monthly approved total
      const approver = rand(approverPool);
      // current month is partial — approve fewer hours
      const isCurrent = p.month === String(now.getMonth() + 1) && p.year === String(now.getFullYear());
      const hrs = isCurrent ? randInt(20, 90) : randInt(120, 175);
      const at = new Date(Number(p.year), Number(p.month) - 1, isCurrent ? now.getDate() : 28, 17, 0, 0);
      docs.push({
        _id: oid(),
        employee_id: empId,
        approved_by: approver,
        notes: "",
        approved_hours: pad2(hrs),
        approved_minutes: rand(["00", "15", "30", "45"]),
        hours: pad2(hrs),
        minutes: "00",
        month: p.month,
        year: p.year,
        ...auditRef(approver, at > now ? now : at),
      });
    }
  }
  const inserted = await nativeInsert(Approved, docs);
  return { approvals: inserted, ids: docs.map((d) => d._id) };
}

// ---------------------------------------------------------------------------
// 6. Notifications — recent 30 days incl. June.
// ---------------------------------------------------------------------------

async function seedNotifications(ctx, bugIds) {
  const Notifications = mongoose.model("notifications");
  const { projects, employees, allTasks } = ctx;
  const docs = [];

  const tasksByProj = ctx.tasksByProject;
  const types = [
    { type: "task_assigned", msg: "has assigned you the task" },
    { type: "task_status_changed", msg: "updated the task status" },
    { type: "task_comment_added", msg: "Task comment added by" },
    { type: "bug_assigned", msg: "has assigned you the bug" },
    { type: "project_assigned", msg: "has assigned you the project" },
    { type: "discussion_comment", msg: "has mentioned you to the topic comment" },
  ];

  for (const proj of projects) {
    const pool = proj.assignees.length ? proj.assignees : employees;
    if (pool.length < 2) continue;
    const projTasks = tasksByProj[proj._id.toString()] || [];
    const n = randInt(2, 5);
    for (let i = 0; i < n; i++) {
      const def = rand(types);
      const sender = rand(pool);
      const receivers = sample(pool.filter((id) => String(id) !== String(sender)), randInt(1, Math.min(3, pool.length - 1)));
      if (!receivers.length) continue;
      const at = chance(0.5) ? thisMonthDate() : daysAgo(30, 1);
      const task = projTasks.length ? rand(projTasks) : null;
      const isBug = def.type === "bug_assigned" && bugIds.length;
      docs.push({
        _id: oid(),
        sender_id: sender,
        senderModel: "employees",
        receiver_ids: receivers,
        receiverModels: receivers.map(() => "employees"),
        read_history: [],
        message: def.msg,
        type: def.type,
        project_id: proj._id,
        main_task_id: null,
        task_id: !isBug && task ? task._id : null,
        bug_id: isBug ? rand(bugIds) : null,
        logged_hours_id: null,
        ...auditRef(sender, at),
      });
    }
  }
  const inserted = await nativeInsert(Notifications, docs);
  return { notifications: inserted, ids: docs.map((d) => d._id) };
}

// ---------------------------------------------------------------------------
// 7. Discussions (topics + replies/details)
// ---------------------------------------------------------------------------

async function seedDiscussions(ctx) {
  const Topics = mongoose.model("discussionstopics");
  const Details = mongoose.model("discussionstopicsdetails");
  const { projects, employees, companyId } = ctx;
  const mc = new mongoose.Types.ObjectId(companyId);

  const topicDocs = [];
  const detailDocs = [];

  // subset of projects (~60%)
  for (const proj of projects) {
    if (!chance(0.6)) continue;
    const pool = proj.assignees.length ? proj.assignees : employees;
    const topicTitles = sample(DISCUSSION_TOPICS, randInt(2, 4));
    for (const title of topicTitles) {
      const author = rand(pool);
      const at = chance(0.4) ? thisMonthDate() : daysAgo(150, 5);
      const topicId = oid();
      topicDocs.push({
        _id: topicId,
        companyId: mc,
        title,
        project_id: proj._id,
        task_id: null,
        status: "active",
        descriptions: `Thread to align on: ${title.toLowerCase()}.`,
        subscribers: sample(pool, Math.min(randInt(2, 4), pool.length)),
        pms_clients: [],
        isPinToTop: false,
        isPrivate: false,
        isBookMark: false,
        ...auditRef(author, at),
      });

      // default detail (mirrors app behaviour) + replies
      detailDocs.push({
        _id: oid(),
        companyId: mc,
        title: `Started the discussion: ${title}`,
        project_id: proj._id,
        topic_id: topicId,
        taggedUsers: [],
        isDefault: true,
        ...auditRef(author, at),
      });
      const replyN = randInt(3, 5);
      for (let r = 0; r < replyN; r++) {
        const replier = rand(pool);
        const rAt = new Date(at.getTime() + (r + 1) * randInt(1, 2) * 86400000);
        detailDocs.push({
          _id: oid(),
          companyId: mc,
          title: rand(DISCUSSION_REPLIES),
          project_id: proj._id,
          topic_id: topicId,
          taggedUsers: chance(0.25) ? sample(pool, 1) : [],
          isDefault: false,
          ...auditRef(replier, rAt > NOW() ? at : rAt),
        });
      }
    }
  }

  const topics = await nativeInsert(Topics, topicDocs);
  const details = await nativeInsert(Details, detailDocs);
  return { topics, details, topicIds: topicDocs.map((d) => d._id), detailIds: detailDocs.map((d) => d._id) };
}

// ---------------------------------------------------------------------------
// 8. Task timers (tasktimers) — completed + a few running, incl. June.
// ---------------------------------------------------------------------------

async function seedTaskTimers(ctx) {
  const Timers = mongoose.model("tasktimers");
  const { allTasks, employees } = ctx;
  const docs = [];

  // group a few timers per active employee
  for (const empId of employees) {
    // each employee gets some completed timers + maybe one running
    const myTasks = sample(allTasks.filter((t) => (t.assignees || []).some((a) => String(a) === String(empId))), randInt(2, 4));
    const tasksForTimers = myTasks.length ? myTasks : sample(allTasks, randInt(1, 3));
    for (const task of tasksForTimers) {
      const completedN = randInt(1, 3);
      for (let i = 0; i < completedN; i++) {
        const start = chance(0.5) ? thisMonthDate() : daysAgo(60, 1);
        const durMin = randInt(15, 180);
        const stop = new Date(start.getTime() + durMin * 60000);
        docs.push({
          _id: oid(),
          task_id: task._id,
          user_id: empId,
          start_time: start,
          stop_time: stop,
          duration_minutes: durMin,
          duration_seconds: durMin * 60,
          is_active: false,
          ...auditRef(empId, start),
        });
      }
    }
    // ~15% of employees have a currently running timer (started today)
    if (chance(0.15) && tasksForTimers.length) {
      const task = rand(tasksForTimers);
      const start = new Date();
      start.setHours(start.getHours() - randInt(0, 3), randInt(0, 59), 0, 0);
      docs.push({
        _id: oid(),
        task_id: task._id,
        user_id: empId,
        start_time: start,
        stop_time: null,
        duration_minutes: 0,
        duration_seconds: 0,
        is_active: true,
        ...auditRef(empId, start),
      });
    }
  }
  const inserted = await nativeInsert(Timers, docs);
  return { timers: inserted, ids: docs.map((d) => d._id) };
}

// ---------------------------------------------------------------------------
// 9. Notes / notebooks (+ note comments)
// ---------------------------------------------------------------------------

async function seedNotes(ctx) {
  const NoteBook = mongoose.model("notebook");
  const Notes = mongoose.model("notes_pms");
  const NotesComments = mongoose.model("NotesComments");
  const { projects, employees, companyId } = ctx;
  const mc = new mongoose.Types.ObjectId(companyId);

  const notebookDocs = [];
  const noteDocs = [];
  const commentDocs = [];

  for (const proj of projects) {
    if (!chance(0.6)) continue; // a few per (subset of) project
    const pool = proj.assignees.length ? proj.assignees : employees;
    const author = rand(pool);
    const at = daysAgo(180, 5);
    const nbId = oid();
    notebookDocs.push({
      _id: nbId,
      title: rand(NOTEBOOK_TITLES),
      isPinned: { value: false, date: null },
      project_id: proj._id,
      isBookmark: false,
      isDeleted: false,
      deletedAt: null,
      createdBy: author,
      updatedBy: author,
      createdAt: at,
      updatedAt: at,
    });

    const noteN = randInt(1, 3);
    for (let i = 0; i < noteN; i++) {
      const nAuthor = rand(pool);
      const nAt = chance(0.3) ? thisMonthDate() : daysAgo(150, 3);
      const noteId = oid();
      noteDocs.push({
        _id: noteId,
        companyId: mc,
        title: rand(NOTE_TITLES),
        color: rand(["#e0f7fa", "#fff3e0", "#f3e5f5", "#e8f5e9"]),
        subscribers: sample(pool, Math.min(2, pool.length)),
        pms_clients: [],
        noteBook_id: nbId,
        project_id: proj._id,
        notesInfo: rand(NOTE_BODIES),
        isBookmark: false,
        isPrivate: false,
        ...auditRef(nAuthor, nAt),
      });

      if (chance(0.5)) {
        const cAuthor = rand(pool);
        const cAt = new Date(nAt.getTime() + randInt(1, 5) * 86400000);
        commentDocs.push({
          _id: oid(),
          comment: rand(NOTE_COMMENTS),
          note_id: noteId,
          taggedUsers: [],
          employee_id: cAuthor,
          status_history: [],
          isResolve: false,
          ...auditRef(cAuthor, cAt > NOW() ? nAt : cAt),
        });
      }
    }
  }

  const notebooks = await nativeInsert(NoteBook, notebookDocs);
  const notes = await nativeInsert(Notes, noteDocs);
  const comments = await nativeInsert(NotesComments, commentDocs);
  return {
    notebooks, notes, comments,
    notebookIds: notebookDocs.map((d) => d._id),
    noteIds: noteDocs.map((d) => d._id),
    commentIds: commentDocs.map((d) => d._id),
  };
}

// ---------------------------------------------------------------------------
// 10. Holidays (company list incl. upcoming 2026 dates)
// ---------------------------------------------------------------------------

async function seedHolidays(ctx) {
  const Holidays = mongoose.model("holidays");
  const { companyId, creatorId } = ctx;
  const mc = new mongoose.Types.ObjectId(companyId);

  // idempotent: scope holidays to this org via org_id == companyId
  const existing = await Holidays.countDocuments({ org_id: mc });
  if (existing > 0) return { holidays: 0, ids: [] };

  const at = new Date();
  const docs = HOLIDAYS_2026.map((h) => ({
    _id: oid(),
    org_id: mc,
    holiday_name: h.name,
    holiday_date: new Date(`${h.date}T00:00:00.000Z`),
    isOptional: !!h.optional,
    createdBy: creatorId,
    created_At: at,
    updatedBy: creatorId,
    updated_At: at,
    isDeleted: false,
  }));
  const inserted = await nativeInsert(Holidays, docs);
  return { holidays: inserted, ids: docs.map((d) => d._id) };
}

// ---------------------------------------------------------------------------
// 11. Clients (pmsclients) — and link some projects to them.
// ---------------------------------------------------------------------------

async function seedClients(ctx) {
  const PMSClients = mongoose.model("pmsclients");
  const Projects = mongoose.model("projects");
  const PMSRoles = mongoose.model("pms_roles");
  const { companyId, creatorId, projects } = ctx;
  const mc = new mongoose.Types.ObjectId(companyId);

  const clientRole = await PMSRoles.findOne({ role_name: "Client" }).select("_id").lean();
  const roleId = clientRole ? clientRole._id : oid();
  const hashed = require("crypto").createHash("md5").update("WeekMate@123").digest("hex");

  const TARGET = 20;
  const existing = await PMSClients.countDocuments({ companyId: mc, isDeleted: false });
  let createdIds = [];
  if (existing < TARGET) {
    const at = new Date();
    const docs = [];
    const usedEmails = new Set();
    for (let i = existing; i < TARGET; i++) {
      const fn = rand(CLIENT_FIRST);
      const ln = rand(CLIENT_LAST);
      const company = CLIENT_COMPANIES[i % CLIENT_COMPANIES.length];
      let email = `${fn}.${ln}${i}@${company.toLowerCase().replace(/[^a-z]/g, "")}.com`;
      while (usedEmails.has(email)) email = `${fn}.${ln}${i}${randInt(1, 99)}@example.com`;
      usedEmails.add(email);
      docs.push({
        _id: oid(),
        companyId: mc,
        first_name: fn,
        last_name: ln,
        full_name: `${fn} ${ln}`,
        client_img: "",
        email,
        phone_number: `+1${randInt(2000000000, 9999999999)}`,
        password: hashed,
        plain_password: "WeekMate@123",
        pms_role_id: roleId,
        shift: "General Shift",
        gender: "",
        company_name: company,
        extra_details: "",
        createdBy: creatorId,
        updatedBy: creatorId,
        createdAt: at,
        updatedAt: at,
        deletedAt: null,
        isDeleted: false,
        isSoftDeleted: false,
        isActivate: true,
      });
    }
    // native insert to honour the pre-hashed password (skip pre-save hashing)
    await nativeInsert(PMSClients, docs);
    createdIds = docs.map((d) => d._id);
  }

  // Link ~40% of projects to 1 client each (projects DO have pms_clients[]).
  let linked = 0;
  const allClientIds = createdIds.length
    ? createdIds
    : (await PMSClients.find({ companyId: mc, isDeleted: false }).select("_id").lean()).map((c) => c._id);
  if (allClientIds.length) {
    for (const proj of projects) {
      if (!chance(0.4)) continue;
      try {
        await Projects.updateOne(
          { _id: proj._id, $or: [{ pms_clients: { $exists: false } }, { pms_clients: { $size: 0 } }] },
          { $set: { pms_clients: [rand(allClientIds)] } }
        );
        linked++;
      } catch (e) {
        /* ignore */
      }
    }
  }

  return { clients: createdIds.length, ids: createdIds, linkedProjects: linked };
}

// ---------------------------------------------------------------------------
// 12. Optional modules: reviews, expenses, complaints(+status+comments),
//     consumer feedback, logged-hours comments.
// ---------------------------------------------------------------------------

async function seedOptionalModules(ctx) {
  const Reviews = mongoose.model("reviews");
  const Expenses = mongoose.model("projectexpanses");
  const Complaints = mongoose.model("complaints");
  const ComplaintStatus = mongoose.model("complaints_status");
  const ComplaintComments = mongoose.model("complaints_comments");
  const ConsumerFeedback = mongoose.model("consumer_feedback_forms");
  const LogHoursComments = mongoose.model("loghoursComments");

  const { projects, employees, companyId } = ctx;
  const mc = new mongoose.Types.ObjectId(companyId);

  const reviewDocs = [];
  const expenseDocs = [];
  const complaintDocs = [];
  const complaintStatusDocs = [];
  const complaintCommentDocs = [];
  const feedbackDocs = [];
  const logCommentDocs = [];

  for (const proj of projects) {
    const pool = proj.assignees.length ? proj.assignees : employees;
    const author = rand(pool);
    const clientName = `${rand(CLIENT_FIRST)} ${rand(CLIENT_LAST)}`;

    // Reviews — ~25% of projects
    if (chance(0.25)) {
      const at = daysAgo(200, 5);
      reviewDocs.push({
        _id: oid(),
        project_id: proj._id,
        client_name: clientName,
        feedback: rand(REVIEW_FEEDBACKS),
        feedback_type: rand(["Clutch Review", "Video Testimonial", "Text Testimonial", "Feedback", "Zoho Partner Profile"]),
        review_url: chance(0.5) ? "https://clutch.co/profile/example" : null,
        client_nda_sign: chance(0.5),
        ...auditRef(author, at),
      });
    }

    // Expenses — ~35% of projects, 1-2 each
    if (chance(0.35)) {
      const eN = randInt(1, 2);
      for (let i = 0; i < eN; i++) {
        const e = rand(EXPENSE_DETAILS);
        const at = chance(0.3) ? thisMonthDate() : daysAgo(180, 5);
        expenseDocs.push({
          _id: oid(),
          companyId: mc,
          project_id: proj._id,
          purchase_request_details: e.req,
          cost_in_usd: randInt(50, 5000),
          need_to_bill_customer: chance(0.6),
          status: rand(["Pending", "Approved", "Rejected", "Paid"]),
          projectexpences: [],
          details: `${e.req} for ${proj.title}.`,
          nature_Of_expense: e.nature,
          billing_cycle: rand(["Monthly", "One-time", "Quarterly"]),
          is_recuring: chance(0.3),
          ...auditRef(author, at),
        });
      }
    }

    // Complaints — ~15% of projects, with a status row + comment
    if (chance(0.15)) {
      const c = rand(COMPLAINTS);
      const at = daysAgo(120, 5);
      const status = rand(["open", "in_progress", "client_review", "resolved", "reopened"]);
      const complaintId = oid();
      complaintDocs.push({
        _id: complaintId,
        companyId: mc,
        project_id: proj._id,
        client_name: clientName,
        client_email: `${clientName.toLowerCase().replace(/\s+/g, ".")}@example.com`,
        complaint: c.complaint,
        priority: c.priority,
        escalation_level: rand(pool),
        status,
        reason: c.reason,
        ...auditRef(author, at),
      });
      complaintStatusDocs.push({
        _id: oid(),
        complaint_id: complaintId,
        status,
        root_cause: "Identified during triage; tracked to a process gap.",
        immediate_action: "Acknowledged the complaint and assigned an owner.",
        corrective_action: "Added a checklist item to prevent recurrence.",
        ...auditRef(author, new Date(at.getTime() + 86400000)),
      });
      complaintCommentDocs.push({
        _id: oid(),
        complaint_id: complaintId,
        comment: "Followed up with the client and shared the remediation plan.",
        ...auditRef(author, new Date(at.getTime() + 2 * 86400000)),
      });
      // consumer feedback only when resolved
      if (status === "resolved" || chance(0.4)) {
        feedbackDocs.push({
          _id: oid(),
          complaint_id: complaintId,
          satisfaction: randInt(3, 5),
          rate_reviews: randInt(3, 5),
          additional_comments: "Issue handled professionally and resolved to our satisfaction.",
          createdAt: new Date(at.getTime() + 5 * 86400000),
        });
      }
    }
  }

  // Logged-hours comments — attach a few to existing tasks (logged_hour_id ref)
  const taskSubset = sample(ctx.allTasks, Math.min(40, ctx.allTasks.length));
  for (const task of taskSubset) {
    if (!chance(0.5)) continue;
    const pool = task.assignees && task.assignees.length ? task.assignees : employees;
    const author = rand(pool);
    const at = daysAgo(90, 1);
    logCommentDocs.push({
      _id: oid(),
      comment: "Logged additional time for the follow-up changes.",
      logged_hour_id: task._id,
      taggedUsers: chance(0.2) ? sample(pool, 1) : [],
      ...auditRef(author, at),
    });
  }

  const reviews = await nativeInsert(Reviews, reviewDocs);
  const expenses = await nativeInsert(Expenses, expenseDocs);
  const complaints = await nativeInsert(Complaints, complaintDocs);
  const complaintStatuses = await nativeInsert(ComplaintStatus, complaintStatusDocs);
  const complaintComments = await nativeInsert(ComplaintComments, complaintCommentDocs);
  const feedback = await nativeInsert(ConsumerFeedback, feedbackDocs);
  const loggedHoursComments = await nativeInsert(LogHoursComments, logCommentDocs);

  return {
    counts: { reviews, expenses, complaints, complaintStatuses, complaintComments, feedback, loggedHoursComments },
    ids: {
      reviews: reviewDocs.map((d) => d._id),
      projectexpanses: expenseDocs.map((d) => d._id),
      complaints: complaintDocs.map((d) => d._id),
      complaints_status: complaintStatusDocs.map((d) => d._id),
      complaints_comments: complaintCommentDocs.map((d) => d._id),
      consumer_feedback_forms: feedbackDocs.map((d) => d._id),
      loghoursComments: logCommentDocs.map((d) => d._id),
    },
  };
}

// ---------------------------------------------------------------------------
// 13. Top up logged hours + timesheets so dashboards reach the current month.
// ---------------------------------------------------------------------------

async function topUpCurrentMonthLogs(ctx) {
  const TaskHoursLogs = mongoose.model("projecttaskhourlogs");
  const ProjectTimeSheet = mongoose.model("projecttimesheets");
  const { projects, employees } = ctx;

  const logDocs = [];
  const timesheetDocs = [];
  const newTimesheetIds = [];

  for (const proj of projects) {
    const pool = proj.assignees.length ? proj.assignees : employees;
    const projTasks = ctx.tasksByProject[proj._id.toString()] || [];
    if (!projTasks.length) continue;

    // a second "Sprint - June" timesheet so the Time tab shows current activity
    const tsId = oid();
    const tsAt = thisMonthDate();
    timesheetDocs.push({
      _id: tsId,
      project_id: proj._id,
      title: "Current Sprint",
      status: "active",
      isDefault: false,
      isBookmark: false,
      isPrivate: false,
      createdBy: ctx.creatorId,
      updatedBy: ctx.creatorId,
      createdAt: tsAt,
      updatedAt: tsAt,
      isDeleted: false,
      deletedAt: null,
    });
    newTimesheetIds.push(tsId);

    // current-month logs spread across the seeded tasks
    const logN = randInt(4, 9);
    for (let i = 0; i < logN; i++) {
      const task = rand(projTasks);
      const pickPool = task.assignees && task.assignees.length ? task.assignees : pool;
      const emp = rand(pickPool);
      const at = thisMonthDate();
      logDocs.push({
        _id: oid(),
        employee_id: emp,
        project_id: proj._id,
        task_id: task._id,
        subtask_id: null,
        timesheet_id: tsId,
        bug_id: null,
        descriptions: "Logged work for the current sprint.",
        logged_hours: pad2(randInt(1, 7)),
        logged_minutes: rand(["00", "15", "30", "45"]),
        logged_seconds: "00",
        logged_date: at,
        isManuallyAdded: true,
        logged_status: rand(["Billable", "Billable", "Non-billable"]),
        ...auditRef(emp, at),
      });
    }
  }

  const logs = await nativeInsert(TaskHoursLogs, logDocs);
  const timesheets = await nativeInsert(ProjectTimeSheet, timesheetDocs);
  return { logs, timesheets, logIds: logDocs.map((d) => d._id), timesheetIds: newTimesheetIds };
}

// ---------------------------------------------------------------------------
// Context loader — re-reads the already-seeded projects/tasks/etc.
// ---------------------------------------------------------------------------

async function buildContext(companyId, primaryCreatedRecords) {
  const mc = new mongoose.Types.ObjectId(companyId);
  const Projects = mongoose.model("projects");
  const ProjectTasks = mongoose.model("projecttasks");
  const FileFolders = mongoose.model("filefolders");
  const WorkFlowStatus = mongoose.model("workflowstatus");
  const Employees = mongoose.model("employees");
  const PMSRoles = mongoose.model("pms_roles");

  // Prefer the ids the primary seed reported (compact + accurate), else fall
  // back to "all non-deleted projects for the company".
  let projectIds = (primaryCreatedRecords && Array.isArray(primaryCreatedRecords.projects))
    ? primaryCreatedRecords.projects.filter((id) => mongoose.Types.ObjectId.isValid(id)).map((id) => new mongoose.Types.ObjectId(id))
    : [];

  let projects = projectIds.length
    ? await Projects.find({ _id: { $in: projectIds } }).select("_id title assignees pms_clients start_date").lean()
    : await Projects.find({ companyId: mc, isDeleted: false }).select("_id title assignees pms_clients start_date").lean();

  if (!projects.length) return null;
  projectIds = projects.map((p) => p._id);

  const tasks = await ProjectTasks.find({ project_id: { $in: projectIds }, isDeleted: false })
    .select("_id project_id main_task_id assignees start_date").lean();

  const tasksByProject = {};
  for (const t of tasks) {
    const k = t.project_id.toString();
    (tasksByProject[k] = tasksByProject[k] || []).push(t);
  }

  const folders = await FileFolders.find({ project_id: { $in: projectIds }, isDeleted: false }).select("_id project_id isDefault").lean();
  const folderByProject = {};
  for (const f of folders) {
    const k = f.project_id.toString();
    if (!folderByProject[k] || f.isDefault) folderByProject[k] = f._id;
  }

  const employeesDocs = await Employees.find({ companyId: mc, isDeleted: false, isActivate: true }).select("_id pms_role_id").lean();
  const employees = employeesDocs.map((e) => e._id);

  // managers = TL/AM roles (used as approvers/senders)
  const roles = await PMSRoles.find({ role_name: { $in: ["TL", "AM", "Admin"] } }).select("_id role_name").lean();
  const mgrRoleIds = new Set(roles.map((r) => r._id.toString()));
  const managers = employeesDocs.filter((e) => e.pms_role_id && mgrRoleIds.has(e.pms_role_id.toString())).map((e) => e._id);

  const wfStatuses = await WorkFlowStatus.find({ isDeleted: false }).select("_id title workflow_id").lean();

  // a creator id (admin) for system-authored rows
  const admin = await Employees.findOne({ companyId: mc, isAdmin: true, isDeleted: false }).select("_id").lean();
  const creatorId = admin ? admin._id : employees[0];

  // labels for bugs/subtasks
  const TaskLabels = mongoose.model("tasklabels");
  const labels = await TaskLabels.find({ companyId: mc, isDeleted: false }).select("_id").lean();
  const labelIds = labels.map((l) => l._id);

  return {
    companyId,
    projects: projects.map((p) => ({ _id: p._id, title: p.title, assignees: p.assignees || [], start_date: p.start_date })),
    tasksByProject,
    allTasks: tasks,
    folderByProject,
    employees,
    managers,
    creatorId,
    wfStatuses,
    labelIds,
  };
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

/**
 * Seeds all the empty-screen modules. Idempotent at the collection level.
 * @param {Object} args
 * @param {string} args.companyId
 * @param {Object} [args.primaryCreatedRecords] createdRecords from the primary seed
 * @returns {Promise<{ createdRecords: Object, summary: Object }>}
 */
async function runEnterpriseTaskhubModulesSeed({ companyId, primaryCreatedRecords }) {
  const ctx = await buildContext(companyId, primaryCreatedRecords);
  if (!ctx) {
    return { createdRecords: {}, summary: { skipped: true, reason: "no projects found for company" } };
  }

  const bugStages = await ensureBugStages(companyId, ctx.creatorId);

  const bugRes = await seedBugs(ctx, bugStages.stages);
  const taskCommentRes = await seedTaskComments(ctx);
  const subTaskRes = await seedSubTasks(ctx);
  const fileRes = await seedFiles(ctx);
  const approvalRes = await seedHoursApproval(ctx);
  const notifRes = await seedNotifications(ctx, bugRes.bugIds);
  const discussionRes = await seedDiscussions(ctx);
  const timerRes = await seedTaskTimers(ctx);
  const noteRes = await seedNotes(ctx);
  const holidayRes = await seedHolidays(ctx);
  const clientRes = await seedClients(ctx);
  const optionalRes = await seedOptionalModules(ctx);
  const topUpRes = await topUpCurrentMonthLogs(ctx);

  // createdRecords keyed by collection name (matches deleteDummyTestData map).
  // cascadeProjectIds purge already removes project-scoped child collections, so
  // those need not be enumerated by id; the rest are listed by id.
  const createdRecords = {
    // listed by id (no project_id, or to be safe)
    approvedHours: approvalRes.ids.map((id) => id.toString()),
    notifications: notifRes.ids.map((id) => id.toString()),
    tasktimers: timerRes.ids.map((id) => id.toString()),
    holidays: holidayRes.ids.map((id) => id.toString()),
    pmsclients: clientRes.ids.map((id) => id.toString()),
    Comments: taskCommentRes.ids.map((id) => id.toString()),
    // bugscomments are purged via the bug_id cascade in deleteDummyTestData
    // (and bugs themselves are project-scoped), so no id list is needed here.
    NotesComments: noteRes.commentIds.map((id) => id.toString()),
    consumer_feedback_forms: optionalRes.ids.consumer_feedback_forms.map((id) => id.toString()),
    complaints_status: optionalRes.ids.complaints_status.map((id) => id.toString()),
    complaints_comments: optionalRes.ids.complaints_comments.map((id) => id.toString()),
    loghoursComments: optionalRes.ids.loghoursComments.map((id) => id.toString()),
    bugsworkflowstatus: bugStages.createdIds.map((id) => id.toString()),
  };

  // Project-scoped collections that the cascade purge handles by project_id.
  // We expose the project ids so deleteDummyTestData's cascade covers them, and
  // also enumerate ids that the cascade does NOT yet handle for completeness.
  const cascadeProjectIds = ctx.projects.map((p) => p._id.toString());

  const summary = {
    companyId,
    bugs: bugRes.bugs,
    bugComments: bugRes.comments,
    bugStagesCreated: bugStages.createdIds.length,
    taskComments: taskCommentRes.comments,
    subTasks: subTaskRes.subtasks,
    files: fileRes.files,
    hoursApprovals: approvalRes.approvals,
    notifications: notifRes.notifications,
    discussionTopics: discussionRes.topics,
    discussionDetails: discussionRes.details,
    taskTimers: timerRes.timers,
    notebooks: noteRes.notebooks,
    notes: noteRes.notes,
    noteComments: noteRes.comments,
    holidays: holidayRes.holidays,
    clients: clientRes.clients,
    projectsLinkedToClients: clientRes.linkedProjects,
    reviews: optionalRes.counts.reviews,
    expenses: optionalRes.counts.expenses,
    complaints: optionalRes.counts.complaints,
    complaintStatuses: optionalRes.counts.complaintStatuses,
    complaintComments: optionalRes.counts.complaintComments,
    consumerFeedback: optionalRes.counts.feedback,
    loggedHoursComments: optionalRes.counts.loggedHoursComments,
    currentMonthLogs: topUpRes.logs,
    currentMonthTimesheets: topUpRes.timesheets,
  };

  return { createdRecords, cascadeProjectIds, summary };
}

module.exports = { runEnterpriseTaskhubModulesSeed };
