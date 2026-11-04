/**
 * Resource Matrix plan seed (additive, tagged, idempotent) - shared by seedAaravEnterprises.js and seedCompany.js.
 *
 * What the Taskhub Resource Matrix reads (controller/resourcematrix.js): for each ACTIVE employee of the company it takes the
 * tasks (projecttasks) of non-deleted projects with end_date >= the window start, that are active, assigned to the employee and
 * sit in a workflow stage that is NOT To-Do/Done/Review/QA/Hold/Deploy ("In Progress" is the usable stage), and greedily
 * allocates each task's remaining estimate (estimated_hours + estimated_minutes/60 - hours logged up to today) from today onward,
 * 8.5 h per Mon-Fri day, in start_date order, never before the task's start_date. Cell = planned hours of the day
 * (0 -> red "!", < 8.5 -> red "Xh", >= 8.5 -> green check). Nothing else (no leave, no holidays, no project allocation %) is read.
 *
 * This step creates, per employee, "In Progress" tasks on the open projects whose start dates and estimates reproduce a target
 * hours-per-day profile (engineers 60-100 %, managers 20-50 %, sales/finance/HR/management a few internal hours/day, leave days = 0).
 * It simulates the controller's allocation (including the tenant's existing open tasks) to size the estimates, then re-simulates to verify.
 *
 * Every inserted document carries seedTag = TAG. Rollback (one company only):
 *   db.projecttasks.deleteMany({ seedTag: "matrix-plan-v1", project_id: { $in: <company project ids> } })
 *   db.projectmaintasks.deleteMany({ seedTag: "matrix-plan-v1", project_id: { $in: <company project ids> } })
 *   db.app_migrations.deleteOne({ key: "matrix-plan:<companyId>" })
 * (or run the seed with --matrixReset, which does exactly that and re-creates the plan relative to today).
 * Existing tasks, logged hours, timesheets, projects, milestones, invoices are never modified.
 */
"use strict";

const path = require("path");
const fs = require("fs");

const TAG = "matrix-plan-v1";
const DAILY = 8.5;
const HORIZON_WEEKDAYS = 45; // ~9 weeks of working days from today
const FULL_BLOCK_MAX = 5;

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
const hashStr = (s) => [...String(s)].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);
const ymd = (d) => d.toISOString().slice(0, 10);
const q = (h) => Math.round(h * 4) / 4; // quarter-hour precision

const ENG_TITLES = {
  magento: ["Checkout flow customisation", "Catalog and pricing rules module", "Payment gateway integration", "Product import and export scripts", "Admin grid and order status extensions", "Performance tuning (FPC and indexers)", "Theme and PDP template changes", "Bug fixing from client UAT feedback"],
  php: ["REST API endpoints", "Inventory sync service", "Role based access and audit trail", "Reports and export module", "Database optimisation and migrations", "Background jobs and queue workers", "Unit tests and API documentation", "Bug fixing from sprint backlog"],
  react: ["Dashboard UI components", "Admin console screens", "State management refactor", "API integration and error handling", "Responsive layouts and accessibility fixes", "Node.js service endpoints", "Frontend unit tests", "Bug fixing from sprint backlog"],
  mobile: ["Offline sync and local storage", "Push notifications", "Live tracking map screens", "Screen implementation from Figma", "API integration and authentication", "App performance and crash fixes", "Release build and store submission", "Bug fixing from sprint backlog"],
  qa: ["Regression test cycle", "Test case design for new stories", "Automation scripts (Selenium and Cypress)", "UAT support and defect triage", "Cross-browser and device testing", "Bug verification and closure"],
  design: ["UI design for new modules", "Design system updates", "Prototype and client walkthrough", "Design handoff and QA review", "UX review of user flows"],
  devops: ["CI/CD pipeline maintenance", "AWS environment hardening", "Staging and production deployments", "Monitoring and alerting setup", "Backup and DR drill"],
  pm: ["Sprint planning and backlog grooming", "Client status call and weekly report", "Risk, budget and resource review", "Milestone tracking and timesheet approvals", "Stakeholder demo preparation"],
  tl: ["Code review and release sign-off", "Team stand-ups and 1:1s", "Sprint planning and estimation", "Technical design reviews", "Hiring interviews and mentoring"],
  cto: ["Architecture review", "Delivery governance and escalations", "Technical solutioning for proposals", "Infrastructure and vendor review"],
  sales: ["Internal - Pipeline review and follow-ups", "Internal - Proposal and quotation preparation", "Internal - Client account check-in", "Internal - Upsell and renewal discussions"],
  finance: ["Internal - Invoice raising and payment follow-up", "Internal - Milestone billing reconciliation", "Internal - Project cost and margin review", "Internal - GST and statutory compliance"],
  hr: ["Internal - Recruitment and interview coordination", "Internal - Onboarding and induction", "Internal - Leave and attendance review", "Internal - Payroll inputs and compliance"],
  exec: ["Internal - Management review and approvals", "Internal - Client and partner meetings", "Internal - Business planning and budgeting"],
};

// stage names the controller excludes (copied from controller/resourcematrix.js)
const EXCLUDE = ["to do", "todo", "done", "complete", "completed", "completion", "completeed", "hold", "on hold", "in hold", "hold for now", "review", "in review", "ready to review", "qa", "ready for qa", "quality assurance", "production", "prod", "move to production", "to production", "deploy", "deployment", "release", "released", "live", "in live"];
const nSpace = (s) => (s || "").toString().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const nNo = (s) => nSpace(s).replace(/\s+/g, "");
const stageAllowed = (title) => !(EXCLUDE.map(nSpace).some((k) => k && nSpace(title).includes(k)) || EXCLUDE.map(nNo).some((k) => k && nNo(title).includes(k)));

function weekdays(start, count) {
  const out = [];
  const d = new Date(start.getTime());
  while (out.length < count) {
    const w = d.getUTCDay();
    if (w !== 0 && w !== 6) out.push(ymd(d));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/** Same greedy allocation as controller/resourcematrix.js for ONE employee. tasks: [{start:'YYYY-MM-DD'|null, remaining}] */
function simulate(tasks, dates, loggedByDay = {}) {
  const list = tasks.map((t) => ({ ...t })).sort((a, b) => (a.start || dates[0]).localeCompare(b.start || dates[0]));
  const today = dates[0];
  return dates.map((date) => {
    const logged = loggedByDay[date] || 0;
    let avail = Math.max(DAILY - logged, 0);
    let assigned = 0;
    if (date >= today) {
      for (const t of list) {
        if (!t.remaining || t.remaining <= 0) continue;
        if ((t.start || dates[0]) > date) continue;
        const a = Math.min(avail, t.remaining);
        if (a <= 0) continue;
        t.remaining -= a;
        avail -= a;
        assigned += a;
        if (avail <= 0) break;
      }
    }
    return { date, assigned, planned: Math.min(DAILY, assigned + logged) };
  });
}

function classify(roleName, desig, dept) {
  const t = `${desig || ""} ${dept || ""}`.toLowerCase();
  if (/\bcto\b|delivery manager/.test(t) && roleName !== "TL") return { kind: "manager", group: "cto", base: 3.5 };
  if (roleName === "PC") return { kind: "manager", group: "pm", base: 4.25 };
  if (roleName === "TL") return { kind: "manager", group: "tl", base: 3.5, skill: t };
  if (/managing|director|\bmd\b|ceo|management/.test(t) || roleName === "Admin") return { kind: "ops", group: "exec", base: 2 };
  if (/sales|account/.test(t)) return { kind: "ops", group: "sales", base: 3 };
  if (/finance/.test(t)) return { kind: "ops", group: "finance", base: 3 };
  if (/\bhr\b|human/.test(t)) return { kind: "ops", group: "hr", base: 3 };
  let group = "php";
  if (/magento/.test(t)) group = "magento";
  else if (/mobile|android|ios|flutter|native/.test(t)) group = "mobile";
  else if (/react|node|front/.test(t)) group = "react";
  else if (/\bqa\b|test/.test(t)) group = "qa";
  else if (/design|ui\/ux|ux/.test(t)) group = "design";
  else if (/devops|aws|infra/.test(t)) group = "devops";
  return { kind: "engineer", group };
}

function loadHrmsLeaves() {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, "../data/aaravLeaves.json"), "utf8")).leaves || {};
  } catch (_) {
    return {};
  }
}

/**
 * opts: { mongoose, companyId, today (UTC midnight Date), log, reset, syntheticLeave, adminId }
 * Returns { skipped?, tasks, mainTasks, employees, ... }.
 */
async function seedMatrixPlan(opts) {
  const { mongoose, companyId, today, reset = false, syntheticLeave = false } = opts;
  const log = opts.log || (() => {});
  const db = mongoose.connection.db;
  const markerKey = `matrix-plan:${companyId}`;
  const migrations = db.collection("app_migrations");
  const Tasks = db.collection(mongoose.model("projecttasks").collection.name);
  const MainTasks = db.collection(mongoose.model("projectmaintasks").collection.name);

  const projectsAll = await mongoose.model("projects").find({ companyId, isDeleted: false }).lean();
  const allProjectIds = projectsAll.map((p) => p._id);

  if (reset) {
    const t = await Tasks.deleteMany({ seedTag: TAG, project_id: { $in: allProjectIds } });
    const m = await MainTasks.deleteMany({ seedTag: TAG, project_id: { $in: allProjectIds } });
    await migrations.deleteOne({ key: markerKey });
    log(`   matrix plan reset: removed ${t.deletedCount} tasks, ${m.deletedCount} lists`);
  } else if (await migrations.findOne({ key: markerKey })) {
    log("   matrix plan already applied (use --matrixReset to rebuild)");
    return { skipped: true };
  }
  // a half-applied earlier run: clean tagged docs first so the step stays idempotent
  await Tasks.deleteMany({ seedTag: TAG, project_id: { $in: allProjectIds } });
  await MainTasks.deleteMany({ seedTag: TAG, project_id: { $in: allProjectIds } });

  const dates = weekdays(today, HORIZON_WEEKDAYS);
  const open = projectsAll.filter((p) => p.end_date && new Date(p.end_date) >= today);
  if (!open.length) {
    log("   no open projects (end_date >= today): nothing to plan");
    return { skipped: true, reason: "no open projects" };
  }
  const openIds = open.map((p) => p._id);

  // workflow stages per project: "In Progress" id + allowed stage ids (what the matrix counts)
  const WfStatus = mongoose.model("workflowstatus");
  const wfIds = [...new Set(open.map((p) => String(p.workFlow)).filter(Boolean))];
  const stages = await WfStatus.find({ workflow_id: { $in: wfIds }, isDeleted: false }).lean();
  const inProgress = {};
  const allowedStage = new Set();
  for (const wf of wfIds) {
    const list = stages.filter((s) => String(s.workflow_id) === wf);
    const ok = list.filter((s) => stageAllowed(s.title));
    const ip = ok.find((s) => /in progress/i.test(s.title)) || ok[0];
    if (ip) inProgress[wf] = ip._id;
    ok.forEach((s) => allowedStage.add(String(s._id)));
  }
  const planProjects = open.filter((p) => inProgress[String(p.workFlow)]);
  if (!planProjects.length) throw new Error("no open project has a usable (non To-Do/Done/Review/Hold) workflow stage");

  // employees
  const employees = await mongoose.model("employees").find({ companyId, isDeleted: false, isActivate: true }).sort({ _id: 1 }).lean();
  const roles = Object.fromEntries((await mongoose.model("pms_roles").find({}).lean()).map((r) => [String(r._id), r.role_name]));
  const desigs = Object.fromEntries((await mongoose.model("empdesignations").find({ companyId }).lean()).map((d) => [String(d._id), d.designation_name]));
  const depts = Object.fromEntries((await mongoose.model("empdepartments").find({ companyId }).lean()).map((d) => [String(d._id), d.department_name]));

  // existing open tasks (the matrix already counts these) + their logs
  const existing = await Tasks.find({ project_id: { $in: openIds }, status: "active", isDeleted: false, seedTag: { $ne: TAG } }).toArray();
  const existingOpen = existing.filter((t) => allowedStage.has(String(t.task_status)));
  const exLogs = existingOpen.length
    ? await db.collection(mongoose.model("projecttaskhourlogs").collection.name)
        .find({ task_id: { $in: existingOpen.map((t) => t._id) }, isDeleted: false }).toArray()
    : [];
  const hrs = (h, m) => (parseFloat(h) || 0) + (parseFloat(m) || 0) / 60;
  const logTotal = {}; // emp_task -> hours <= today
  const logDay = {}; // emp -> {date -> hours} (matrix subtracts these from the day capacity)
  exLogs.forEach((l) => {
    const h = hrs(l.logged_hours, l.logged_minutes);
    const d = ymd(new Date(l.logged_date));
    if (d <= dates[0]) logTotal[`${l.employee_id}_${l.task_id}`] = (logTotal[`${l.employee_id}_${l.task_id}`] || 0) + h;
    (logDay[String(l.employee_id)] = logDay[String(l.employee_id)] || {})[d] = ((logDay[String(l.employee_id)] || {})[d] || 0) + h;
  });
  const existingFor = (empId) =>
    existingOpen
      .filter((t) => (t.assignees || []).some((a) => String(a) === String(empId)))
      .map((t) => ({
        start: t.start_date ? ymd(new Date(t.start_date)) : null,
        remaining: Math.max(0, hrs(t.estimated_hours, t.estimated_minutes) - (logTotal[`${empId}_${t._id}`] || 0)),
      }));

  const hrmsLeaves = loadHrmsLeaves();
  const empCodeOf = (e) => e.emp_code || "";
  const leaveDays = (e, idx, rnd) => {
    const out = {}; // date -> 0 (full) | 4.25 (half)
    for (const l of hrmsLeaves[empCodeOf(e)] || []) {
      for (const d of dates) if (d >= l.from && d <= l.to) out[d] = l.half ? 4.25 : 0;
    }
    if (syntheticLeave && idx % 5 === 3) {
      // planned leave not present in HRMS: 1-3 weekdays somewhere in weeks 2-8
      const s = 8 + Math.floor(rnd() * 28);
      const n = 1 + Math.floor(rnd() * 3);
      for (let i = 0; i < n && s + i < dates.length; i++) if (out[dates[s + i]] === undefined) out[dates[s + i]] = 0;
    }
    return out;
  };

  const planByName = Object.fromEntries(planProjects.map((p) => [String(p._id), p]));
  const involved = (p, e) =>
    [p.manager, p.team_manager, p.acc_manager, ...(p.assignees || [])].some((x) => x && String(x) === String(e._id));
  const affinity = (p, group) => {
    const t = (p.title || "").toLowerCase();
    if (group === "magento") return /magento|e-?commerce|commerce/.test(t);
    if (group === "mobile") return /mobile|app\b/.test(t);
    if (group === "php" || group === "react") return /erp|web|platform|portal|dashboard|analytics/.test(t);
    return true;
  };

  const adminId = opts.adminId || employees[0]._id;
  const now = new Date();
  const mainByProject = {};
  const mainDocs = planProjects.map((p) => {
    const _id = new mongoose.Types.ObjectId();
    mainByProject[String(p._id)] = _id;
    const by = p.manager || adminId;
    return {
      _id, title: `Resource Plan - team allocation (${dates[0]} to ${dates[dates.length - 1]})`, project_id: p._id,
      subscribers: [by], task_status: inProgress[String(p.workFlow)],
      task_status_history: [{ task_status: inProgress[String(p.workFlow)], updatedBy: by, updatedAt: now }],
      status: "active", isDeleted: false, createdBy: by, updatedBy: by, createdByModel: "employees", updatedByModel: "employees",
      createdAt: now, updatedAt: now, deletedBy: null, deletedByModel: null, deletedAt: null, seedTag: TAG,
    };
  });

  const taskDocs = [];
  let taskNo = 0;
  const summary = [];
  const verify = [];

  employees.forEach((e, idx) => {
    const roleName = roles[String(e.pms_role_id)] || "User";
    if (roleName === "Client") return;
    const cls = classify(roleName, desigs[String(e.designation_id)], depts[String(e.department_id)]);
    const rnd = mulberry32(hashStr(`${companyId}|${empCodeOf(e) || e._id}|matrix`));
    const leaves = leaveDays(e, idx, rnd);

    // candidate projects
    let cand = planProjects.filter((p) => involved(p, e));
    if (cls.kind === "engineer") {
      if (!cand.length) cand = planProjects.filter((p) => affinity(p, cls.group));
      if (!cand.length) cand = planProjects;
      const max = ["qa", "design", "devops"].includes(cls.group) ? 3 : 2;
      cand = cand.slice().sort((a, b) => hashStr(`${e._id}${a._id}`) - hashStr(`${e._id}${b._id}`)).slice(0, max);
    } else if (cls.kind === "manager") {
      if (cls.group === "tl" && cls.skill) {
        const aff = cand.filter((p) => affinity(p, /magento/.test(cls.skill) ? "magento" : /mobile|native/.test(cls.skill) ? "mobile" : "x"));
        if (aff.length) cand = aff;
      }
      if (!cand.length) cand = planProjects;
    } else {
      if (!cand.length) cand = planProjects;
      cand = cand.slice().sort((a, b) => hashStr(`${e._id}${a._id}`) - hashStr(`${e._id}${b._id}`)).slice(0, 2);
    }

    // daily hour targets
    let util = 1;
    if (cls.kind === "engineer") {
      const r = rnd();
      util = r < 0.4 ? 0.95 + rnd() * 0.05 : r < 0.75 ? 0.8 + rnd() * 0.15 : 0.6 + rnd() * 0.2;
    }
    const targets = dates.map((d, i) => {
      if (leaves[d] !== undefined) return leaves[d];
      if (cls.kind === "engineer") {
        const H = util * DAILY;
        const pFull = Math.min(1, Math.max(0.12, (H - 5) / 3.5));
        if (rnd() < pFull) return DAILY;
        return [3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7][Math.floor(rnd() * 8)];
      }
      const jitter = [-1, -0.5, 0, 0, 0, 0.5, 1][Math.floor(rnd() * 7)];
      return Math.round(Math.max(1.5, Math.min(6, cls.base + jitter)) * 2) / 2;
    });

    // project per day: segments
    const segLen = cls.kind === "engineer" ? 5 + Math.floor(rnd() * 6) : 2 + Math.floor(rnd() * 3);
    const projOf = dates.map((d, i) => {
      const valid = cand.filter((p) => (!p.start_date || ymd(new Date(p.start_date)) <= d) && (!p.end_date || ymd(new Date(p.end_date)) >= d));
      const pool = valid.length ? valid : cand;
      return pool[(Math.floor(i / segLen) + (hashStr(String(e._id)) % pool.length)) % pool.length];
    });

    const ex = simulate(existingFor(e._id), dates, logDay[String(e._id)] || {});
    const needs = targets.map((t, i) => (t >= DAILY ? Math.ceil(Math.max(0, t - ex[i].assigned) * 60 - 1e-6) / 60 : q(Math.max(0, t - ex[i].assigned))));

    const titles = ENG_TITLES[cls.group];
    const assignee = e._id;
    const mk = (proj, startIdx, endIdx, est) => {
      taskNo++;
      const wf = String(proj.workFlow);
      const by = proj.manager || adminId;
      const title = titles[(hashStr(`${e._id}${taskNo}`) + taskNo) % titles.length];
      const wholeH = Math.floor(est);
      const mins = Math.round((est - wholeH) * 60);
      const start = new Date(dates[startIdx] + "T00:00:00.000Z");
      const due = new Date(dates[endIdx] + "T00:00:00.000Z");
      taskDocs.push({
        _id: new mongoose.Types.ObjectId(), title, project_id: proj._id, main_task_id: mainByProject[String(proj._id)], status: "active",
        descriptions: `<p>${title} (resource plan, ${dates[startIdx]}${startIdx === endIdx ? "" : " to " + dates[endIdx]}).</p>`,
        priority: ["Low", "Medium", "Medium", "High"][taskNo % 4], taskId: `#${600000 + taskNo * 7}`, task_labels: [],
        start_date: start, end_date: null, due_date: due, assignees: [assignee], pms_clients: [],
        estimated_hours: String(wholeH), estimated_minutes: String(mins).padStart(2, "0"),
        task_progress: dates[startIdx] === dates[0] ? "25" : "0", task_status: inProgress[wf],
        task_status_history: [{ task_status: inProgress[wf], updatedBy: assignee, updatedAt: now }],
        isImported: false, recurringType: "", custom_fields: {},
        createdBy: by, createdByModel: "employees", createdAt: now, updatedBy: by, updatedByModel: "employees", updatedAt: now,
        deletedBy: null, deletedByModel: null, deletedAt: null, isDeleted: false, seedTag: TAG,
      });
      return { start: dates[startIdx], remaining: est };
    };

    const mine = [];
    let block = null;
    const flush = () => {
      if (block) mine.push(mk(block.proj, block.s, block.e, block.est));
      block = null;
    };
    dates.forEach((d, i) => {
      const need = needs[i];
      if (need <= 0) return flush();
      const full = targets[i] >= DAILY;
      if (full) {
        if (block && block.proj === projOf[i] && block.e === i - 1 && block.e - block.s + 1 < FULL_BLOCK_MAX) {
          block.e = i;
          block.est += need;
        } else {
          flush();
          block = { proj: projOf[i], s: i, e: i, est: need };
        }
      } else {
        flush();
        mine.push(mk(projOf[i], i, i, need));
      }
    });
    flush();

    const all = simulate([...existingFor(e._id), ...mine], dates, logDay[String(e._id)] || {});
    const bad = all.filter((x, i) => Math.abs(x.planned - Math.min(DAILY, targets[i])) > 0.01 && !(targets[i] < ex[i].assigned)).length;
    const hoursSum = all.reduce((s, x) => s + x.planned, 0);
    const wd = dates.length;
    summary.push({ code: empCodeOf(e), name: e.full_name, kind: cls.kind, group: cls.group, util: hoursSum / (wd * DAILY), full: all.filter((x) => x.planned >= DAILY).length, partial: all.filter((x) => x.planned > 0 && x.planned < DAILY).length, zero: all.filter((x) => x.planned === 0).length, leave: Object.keys(leaves).length, mismatch: bad });
    verify.push(bad);
  });

  if (mainDocs.length) await MainTasks.insertMany(mainDocs);
  for (let i = 0; i < taskDocs.length; i += 500) await Tasks.insertMany(taskDocs.slice(i, i + 500));
  await migrations.insertOne({ key: markerKey, tag: TAG, ranAt: new Date(), companyId, tasks: taskDocs.length, lists: mainDocs.length });

  log(`   matrix plan: ${taskDocs.length} tasks in ${mainDocs.length} lists for ${summary.length} people over ${dates.length} working days (${dates[0]} .. ${dates[dates.length - 1]}), tag ${TAG}`);
  const byKind = {};
  summary.forEach((s) => {
    const k = (byKind[s.kind] = byKind[s.kind] || { n: 0, util: 0, zero: 0, leave: 0 });
    k.n++; k.util += s.util; k.zero += s.zero; k.leave += s.leave;
  });
  Object.entries(byKind).forEach(([k, v]) => log(`   ${k}: ${v.n} people, avg planned ${(100 * v.util / v.n).toFixed(0)}% of capacity, ${v.zero} unplanned (leave) person-days`));
  log(`   plan vs target mismatches: ${verify.filter(Boolean).length} people`);
  return { tasks: taskDocs.length, mainTasks: mainDocs.length, employees: summary.length, summary, openProjects: planProjects.map((p) => p.title) };
}

module.exports = { seedMatrixPlan, TAG, simulate, weekdays };
