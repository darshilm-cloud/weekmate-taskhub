/**
 * Project Data Seeder — Weekmate TaskHub
 * ----------------------------------------------------------------------------
 * Enriches ONE existing project with professional, back-dated activity:
 *   • Logged hours  (projecttaskhourlogs + monthly rollups)
 *   • Discussions   (discussionstopics) with topics/replies (discussionstopicsdetails)
 *   • Notes         (notes_pms, in a notebook) + a few note comments
 *   • Files         (fileuploads in a folder, with optional physical placeholders)
 *
 * Unlike demoDataSeeder.js (which fabricates a whole company), this script does
 * NOT create employees or projects. You pass an existing company + project; the
 * script reads that project's real manager / account-manager / assignees and the
 * real tasks, then generates data authored by those people, dated from the
 * project start date up to YESTERDAY.
 *
 * Usage:
 *   node server/seeders/projectDataSeeder.js --companyId=<id> --projectId=<id>
 *
 * Common options:
 *   --companyId=<ObjectId>   (required) company that owns the project
 *   --projectId=<ObjectId>   (required) project to enrich
 *   --dbUrl=<uri>            Mongo URI (else DB_URL env, else env/.env.dev|prod)
 *   --since=<YYYY-MM-DD>     first date to generate (default: project.start_date
 *                            or 60 days before --until)
 *   --until=<YYYY-MM-DD>     last date to generate (default: yesterday)
 *   --discussions=<n>        number of discussion topics      (default 8)
 *   --notes=<n>              number of notes                  (default 10)
 *   --files=<n>              number of files                  (default 12)
 *   --coverage=<0..1>        fraction of business days each member logs (default 0.7)
 *   --hoursPerDay=<n>        target logged hours per member per active day (default 7)
 *   --maxHoursEntries=<n>    safety cap on hour-log rows       (default 4000)
 *   --noPhysicalFiles        don't write placeholder files under public/folderWise
 *   --dry                    print the plan and write nothing
 *   --undo=<manifestPath>    delete a previous run (by manifest) and recompute totals
 *
 * Every run writes a manifest to server/seeders/.seedlogs/<projectId>__<ts>.json
 * so the exact rows it created can be removed later with --undo.
 * ----------------------------------------------------------------------------
 */

"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

// Globals the app/models/configs expect to exist (see server/app.js).
global.moment = require("moment");
global.chalk = require("chalk");

// ─── CLI parsing ─────────────────────────────────────────────────────────────
const ARGV = process.argv.slice(2);
function arg(name, def = null) {
  const hit = ARGV.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return def;
  const eq = hit.indexOf("=");
  return eq === -1 ? true : hit.slice(eq + 1);
}
const OPTS = {
  companyId: arg("companyId"),
  projectId: arg("projectId"),
  dbUrl: arg("dbUrl"),
  since: arg("since"),
  until: arg("until"),
  discussions: parseInt(arg("discussions", "8"), 10),
  notes: parseInt(arg("notes", "10"), 10),
  files: parseInt(arg("files", "12"), 10),
  coverage: parseFloat(arg("coverage", "0.7")),
  hoursPerDay: parseFloat(arg("hoursPerDay", "7")),
  maxHoursEntries: parseInt(arg("maxHoursEntries", "4000"), 10),
  noPhysicalFiles: !!arg("noPhysicalFiles", false),
  dry: !!arg("dry", false),
  undo: arg("undo"),
};

// ─── Bootstrap: settings symlink + env + models ──────────────────────────────
// `npm start` symlinks ../settings -> ./settings; models -> helpers/common.js
// require("../settings/config.json"). Recreate it if a standalone run lacks it.
function ensureSettingsSymlink() {
  const link = path.resolve(__dirname, "../settings");
  if (fs.existsSync(link)) return;
  try {
    fs.symlinkSync(path.resolve(__dirname, "../../settings"), link, "dir");
  } catch (_) {
    /* best effort — require will surface a clear error if it truly is missing */
  }
}
function loadEnv() {
  if (OPTS.dbUrl) {
    process.env.DB_URL = OPTS.dbUrl;
    return;
  }
  if (process.env.DB_URL) return;
  for (const f of [".env.dev", ".env.prod", ".env", ".env.sample"]) {
    const p = path.resolve(__dirname, "../env", f);
    if (fs.existsSync(p)) {
      dotenv.config({ path: p });
      if (process.env.DB_URL) return;
    }
  }
}
ensureSettingsSymlink();
loadEnv();

require("../models"); // registers every schema used below

const Project = mongoose.model("projects");
const Employee = mongoose.model("employees");
const Task = mongoose.model("projecttasks");
const TimeSheet = mongoose.model("projecttimesheets");
const HoursLog = mongoose.model("projecttaskhourlogs");
const TotalHours = mongoose.model("projecttotaltaskhourlogs");
const Topic = mongoose.model("discussionstopics");
const TopicDetail = mongoose.model("discussionstopicsdetails");
const NoteBook = mongoose.model("notebook");
const Note = mongoose.model("notes_pms");
const NoteComment = mongoose.model("NotesComments");
const Folder = mongoose.model("filefolders");
const FileUpload = mongoose.model("fileuploads");

// ─── Small helpers ───────────────────────────────────────────────────────────
const pad2 = (n) => String(n).padStart(2, "0");
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const chance = (p) => Math.random() < p;
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function sampleN(arr, n) {
  return shuffle(arr).slice(0, Math.min(n, arr.length));
}
const idStr = (v) => (v == null ? "" : String(v._id || v));

/** A Date at the given UTC calendar day, at hour:min (keeps the day stable). */
function atUTC(day, hour = 12, min = 0) {
  const d = new Date(day);
  d.setUTCHours(hour, min, 0, 0);
  return d;
}
function startOfDayUTC(d) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}
function addDaysUTC(d, n) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}
function isWeekend(d) {
  const wd = d.getUTCDay();
  return wd === 0 || wd === 6;
}
/** Inclusive list of weekday Dates between since..until (UTC midnights). */
function businessDays(since, until) {
  const out = [];
  let cur = startOfDayUTC(since);
  const end = startOfDayUTC(until);
  while (cur <= end) {
    if (!isWeekend(cur)) out.push(new Date(cur));
    cur = addDaysUTC(cur, 1);
  }
  return out;
}
function parseDateArg(s) {
  if (!s) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  return isNaN(d.getTime()) ? null : d;
}
function fmtDay(d) {
  return d.toISOString().slice(0, 10);
}

// ─── Professional content pools ──────────────────────────────────────────────
const DISCUSSION_TOPICS = [
  { t: "Finalising the sprint scope and acceptance criteria", d: "Let's lock the scope for the upcoming sprint and agree on clear acceptance criteria for each story before development starts." },
  { t: "API contract review before frontend integration", d: "Reviewing request/response shapes, error codes and pagination so the frontend and backend stay in sync." },
  { t: "Database indexing strategy for the reporting screens", d: "The reporting queries are getting slow on large datasets. Proposing compound indexes and discussing trade-offs." },
  { t: "Deployment & release checklist for the next build", d: "Capturing the steps, sign-offs and rollback plan we need before pushing the next release to production." },
  { t: "Handling edge cases in the authentication flow", d: "Documenting session expiry, concurrent logins and the 'remember me' behaviour so QA can verify them." },
  { t: "Performance budget for initial page load", d: "Agreeing on a target bundle size and load time, and how we enforce it in CI." },
  { t: "Error handling and user-facing messages", d: "Standardising how we surface validation and server errors to keep the UX consistent." },
  { t: "Test coverage plan — unit vs integration vs E2E", d: "Where to invest test effort for the highest confidence without slowing the team down." },
  { t: "Third-party integration: failure modes and retries", d: "What happens when the external service times out, and how we make the integration resilient." },
  { t: "Accessibility pass before the client demo", d: "Keyboard navigation, colour contrast and ARIA labels we should fix ahead of the demo." },
  { t: "Code review standards for the team", d: "What should be mandatory in a review, and how we keep reviews fast and useful." },
  { t: "Data migration approach for the new schema", d: "Sequencing the migration, dry-run validation and the cut-over window." },
  { t: "Caching strategy for frequently read data", d: "Where caching helps, invalidation rules, and avoiding stale data on the dashboards." },
  { t: "Logging and observability for production support", d: "Structured logs, correlation IDs and the alerts we actually want to be paged on." },
  { t: "Mobile responsiveness review across breakpoints", d: "Auditing the key screens on tablet and phone widths and listing what needs fixing." },
  { t: "Backlog grooming — prioritising the next milestone", d: "Re-ordering the backlog against the client's priorities and our delivery capacity." },
];
const DISCUSSION_REPLIES = [
  "Thanks for raising this. I think the approach makes sense — my only concern is how it behaves under load.",
  "Agreed. I'll put together a short spike to validate the assumptions and share findings by end of week.",
  "Can we make sure this is covered by tests before we merge? It's an area that's bitten us before.",
  "Good point. I've seen a similar pattern work well; happy to pair on the implementation.",
  "From the client's side this is a priority, so let's keep it near the top of the list.",
  "One thing to watch: backwards compatibility for the existing data. We shouldn't break current records.",
  "I've updated the relevant ticket with the details we discussed and tagged the reviewers.",
  "Let's document the final decision here so we have a clear reference later.",
  "I benchmarked it locally — the difference is noticeable but acceptable for now. Numbers in the thread.",
  "Looks good to me. I'll take this and aim to have a draft PR up tomorrow.",
  "We should loop in QA early so they can prepare test cases in parallel.",
  "I'd lean towards the simpler option for this release and revisit if we see issues in production.",
  "Confirmed working in staging. Moving it to ready-for-review.",
  "Nice work. Left a couple of small comments on the PR, nothing blocking.",
  "Let's timebox this to keep the sprint on track and split anything that doesn't fit.",
  "Aligned. I'll handle the migration script and add a dry-run flag so we can verify safely.",
];
const NOTES = [
  { t: "Kickoff Meeting Minutes", c: "#e3f2fd", b: "<h3>Kickoff Meeting Minutes</h3><p>Attendees walked through the project goals, success metrics and the high-level timeline. Key decisions:</p><ul><li>Two-week sprint cadence with a mid-sprint check-in.</li><li>Weekly client demo every Friday.</li><li>Definition of done agreed and pinned in this notebook.</li></ul><p><em>Next steps:</em> finalise the backlog and confirm environment access.</p>" },
  { t: "Architecture Decision Record", c: "#f3e5f5", b: "<h3>ADR-001 — Service Boundaries</h3><p><strong>Context:</strong> We needed clear boundaries between the core service and the reporting module.</p><p><strong>Decision:</strong> Keep a single deployable for now with well-defined internal modules; revisit splitting once load justifies it.</p><p><strong>Consequences:</strong> Faster delivery, simpler ops, with a clear path to extract services later.</p>" },
  { t: "API Integration Guide", c: "#e8f5e9", b: "<h3>API Integration Guide</h3><p>Base URL, authentication header and the standard error envelope are documented below. All list endpoints are paginated and return a <code>total</code> count.</p><ul><li>Auth: Bearer token in the <code>Authorization</code> header.</li><li>Errors: <code>{ code, message }</code> with appropriate HTTP status.</li><li>Rate limit: 100 req/min per token.</li></ul>" },
  { t: "Database Schema Notes", c: "#fff8e1", b: "<h3>Schema Notes</h3><p>Core entities and their relationships are captured here. Soft deletes are used throughout (<code>isDeleted</code> flag) and every record carries created/updated audit fields.</p><p>Indexes were added on the most common filter combinations to keep listing screens responsive.</p>" },
  { t: "Sprint Review Summary", c: "#fce4ec", b: "<h3>Sprint Review Summary</h3><p>Completed the planned stories for the authentication and dashboard modules. Carried over one item due to a dependency on the client's test data.</p><p>Velocity is stable; team morale good. Action items logged against owners.</p>" },
  { t: "Release Checklist", c: "#e0f7fa", b: "<h3>Release Checklist</h3><ul><li>All tests green in CI.</li><li>Database migrations reviewed and dry-run on staging.</li><li>Changelog updated and shared with the client.</li><li>Rollback plan documented.</li><li>Monitoring dashboards verified post-deploy.</li></ul>" },
  { t: "Security Review Findings", c: "#fbe9e7", b: "<h3>Security Review Findings</h3><p>Reviewed input validation, authorization checks and dependency advisories. No critical issues. Two medium items raised:</p><ol><li>Tighten rate limiting on the public endpoints.</li><li>Rotate the service credentials and move them to the secret store.</li></ol>" },
  { t: "Onboarding Notes for New Developers", c: "#e8f5e9", b: "<h3>Onboarding</h3><p>Clone the repo, copy the sample env file and run the seed script for a working local dataset. The local stack comes up with a single command. Ask in the team channel for access to the shared services.</p>" },
  { t: "Performance Benchmarks", c: "#e3f2fd", b: "<h3>Performance Benchmarks</h3><p>Measured the key screens before and after the indexing changes. Dashboard load dropped from ~2.4s to ~0.7s on the large dataset. Numbers and methodology recorded for future comparison.</p>" },
  { t: "Client Requirements Clarifications", c: "#fff8e1", b: "<h3>Requirements Clarifications</h3><p>Captured the answers to the open questions from the client call. The export feature should include archived records only when explicitly requested, and all timestamps are shown in the user's local timezone.</p>" },
  { t: "QA Test Plan", c: "#f3e5f5", b: "<h3>QA Test Plan</h3><p>Scope, environments and the regression checklist for this milestone. Smoke tests run on every deploy; the full suite runs nightly. Defects are triaged the next morning.</p>" },
  { t: "Deployment Runbook", c: "#e0f7fa", b: "<h3>Deployment Runbook</h3><p>Step-by-step deploy, health-check and rollback procedure. Includes the on-call contact and where to find the logs and dashboards during an incident.</p>" },
  { t: "Tech Debt Register", c: "#fce4ec", b: "<h3>Tech Debt Register</h3><p>Running list of known shortcuts with their impact and a rough effort estimate, so we can pay them down deliberately rather than all at once.</p>" },
];
const NOTE_COMMENTS = [
  "Thanks for writing this up — really useful reference.",
  "Added a small correction to the second point.",
  "Can we keep this updated after the next review?",
  "Shared this with the client; they were happy with the clarity.",
  "Linked this from the sprint board for visibility.",
];
const FILES = [
  { n: "Project_Proposal", ext: ".pdf", type: "application/pdf", kb: [180, 520] },
  { n: "Requirements_Specification", ext: ".docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", kb: [60, 240] },
  { n: "System_Architecture_Diagram", ext: ".png", type: "image/png", kb: [220, 900] },
  { n: "Database_ERD", ext: ".png", type: "image/png", kb: [180, 700] },
  { n: "Sprint_Plan", ext: ".xlsx", type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", kb: [30, 120] },
  { n: "Wireframes", ext: ".pdf", type: "application/pdf", kb: [400, 1500] },
  { n: "API_Documentation", ext: ".pdf", type: "application/pdf", kb: [120, 480] },
  { n: "Meeting_Notes", ext: ".docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", kb: [20, 80] },
  { n: "Test_Cases", ext: ".xlsx", type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", kb: [40, 160] },
  { n: "Release_Notes", ext: ".pdf", type: "application/pdf", kb: [40, 160] },
  { n: "UI_Style_Guide", ext: ".pdf", type: "application/pdf", kb: [300, 1100] },
  { n: "Deployment_Checklist", ext: ".pdf", type: "application/pdf", kb: [20, 90] },
  { n: "Risk_Register", ext: ".xlsx", type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", kb: [25, 100] },
  { n: "Client_Feedback_Summary", ext: ".docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", kb: [25, 110] },
  { n: "Performance_Report", ext: ".pdf", type: "application/pdf", kb: [80, 320] },
];
const HOURS_DESC = [
  (t) => `Implemented core logic for "${t}" and wired it to the existing services.`,
  (t) => `Worked on "${t}" — refactored the module and added unit tests.`,
  (t) => `Investigated and fixed edge cases reported during QA for "${t}".`,
  (t) => `Code review, feedback and follow-up changes for "${t}".`,
  (t) => `Pairing session on "${t}" to unblock the integration.`,
  (t) => `Updated documentation and cleaned up the implementation of "${t}".`,
  (t) => `Built the UI and connected it to the API for "${t}".`,
  (t) => `Performance tuning and query optimisation related to "${t}".`,
  () => `Sprint ceremonies, planning and team sync-ups.`,
  () => `Bug triage, reproduction and verification of fixes.`,
];

// ─── Manifest ────────────────────────────────────────────────────────────────
function newManifest() {
  return {
    meta: {},
    created: {
      projecttaskhourlogs: [],
      discussionstopics: [],
      discussionstopicsdetails: [],
      notes_pms: [],
      NotesComments: [],
      notebook: [],
      filefolders: [],
      fileuploads: [],
      projecttimesheets: [],
    },
    physicalFiles: [],
    totalsTouched: [],
  };
}
function writeManifest(manifest) {
  const dir = path.resolve(__dirname, ".seedlogs");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(
    dir,
    `${manifest.meta.projectId}__${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  );
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2));
  return file;
}

// ─── Monthly rollup recompute (projecttotaltaskhourlogs) ─────────────────────
// totals are per employee per month/year (global across projects). Recompute
// from the surviving hour logs so the figure always matches reality.
async function recomputeTotals(touchedKeys) {
  for (const key of touchedKeys) {
    const [empId, year, month] = key.split("|");
    const monthStart = new Date(`${year}-${month}-01T00:00:00.000Z`);
    const monthEnd = new Date(monthStart);
    monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);

    const logs = await HoursLog.find({
      employee_id: new mongoose.Types.ObjectId(empId),
      isDeleted: false,
      logged_date: { $gte: monthStart, $lt: monthEnd },
    })
      .select("logged_hours logged_minutes")
      .lean();

    let totalMin = 0;
    for (const l of logs) {
      totalMin += (parseInt(l.logged_hours || "0", 10) || 0) * 60;
      totalMin += parseInt(l.logged_minutes || "0", 10) || 0;
    }
    const totalTime = `${pad2(Math.floor(totalMin / 60))}:${pad2(totalMin % 60)}`;

    const existing = await TotalHours.findOne({ employee_id: empId, month, year });
    if (existing) {
      await TotalHours.updateOne(
        { _id: existing._id },
        { $set: { total_time: totalTime, updatedBy: empId, updatedByModel: "employees" } }
      );
    } else {
      await TotalHours.create({
        employee_id: empId,
        month,
        year,
        total_time: totalTime,
        createdBy: empId,
        updatedBy: empId,
        createdByModel: "employees",
        updatedByModel: "employees",
        createdAt: atUTC(monthStart, 9),
        updatedAt: atUTC(monthStart, 9),
      });
    }
  }
}

// ─── UNDO ────────────────────────────────────────────────────────────────────
async function undo(manifestPath) {
  const abs = path.isAbsolute(manifestPath)
    ? manifestPath
    : path.resolve(process.cwd(), manifestPath);
  if (!fs.existsSync(abs)) throw new Error(`Manifest not found: ${abs}`);
  const manifest = JSON.parse(fs.readFileSync(abs, "utf8"));

  console.log(global.chalk.cyan(`\n↩  Undoing seed run for project ${manifest.meta.projectTitle || manifest.meta.projectId}`));

  const modelByColl = {
    projecttaskhourlogs: HoursLog,
    discussionstopics: Topic,
    discussionstopicsdetails: TopicDetail,
    notes_pms: Note,
    NotesComments: NoteComment,
    notebook: NoteBook,
    filefolders: Folder,
    fileuploads: FileUpload,
    projecttimesheets: TimeSheet,
  };
  for (const [coll, ids] of Object.entries(manifest.created || {})) {
    if (!ids || !ids.length) continue;
    const Model = modelByColl[coll];
    const objIds = ids.map((i) => new mongoose.Types.ObjectId(i));
    const res = await Model.deleteMany({ _id: { $in: objIds } });
    console.log(`   • ${coll}: removed ${res.deletedCount}`);
  }

  // Remove physical placeholder files we wrote.
  let removedFiles = 0;
  for (const p of manifest.physicalFiles || []) {
    try {
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
        removedFiles++;
      }
    } catch (_) {}
  }
  if (removedFiles) console.log(`   • physical files: removed ${removedFiles}`);

  // Recompute the monthly rollups from whatever logs remain.
  if (manifest.totalsTouched && manifest.totalsTouched.length) {
    await recomputeTotals(manifest.totalsTouched);
    console.log(`   • recomputed ${manifest.totalsTouched.length} monthly total(s)`);
  }
  console.log(global.chalk.green("✅  Undo complete.\n"));
}

// ─── SEED ────────────────────────────────────────────────────────────────────
async function seed() {
  if (!OPTS.companyId || !mongoose.Types.ObjectId.isValid(OPTS.companyId))
    throw new Error("Provide a valid --companyId");
  if (!OPTS.projectId || !mongoose.Types.ObjectId.isValid(OPTS.projectId))
    throw new Error("Provide a valid --projectId");

  // 1. Load the project and confirm it belongs to the company.
  const project = await Project.findOne({
    _id: OPTS.projectId,
    companyId: OPTS.companyId,
    isDeleted: false,
  }).lean();
  if (!project)
    throw new Error(`No active project ${OPTS.projectId} in company ${OPTS.companyId}`);
  console.log(global.chalk.cyan(`\n📁  Project: ${project.title} (${project.projectId || project._id})`));

  // 2. Read the real team: manager, account manager, assignees.
  const teamIds = [
    ...(project.assignees || []),
    project.manager,
    project.acc_manager,
  ]
    .filter(Boolean)
    .map(idStr);
  const uniqueTeamIds = [...new Set(teamIds)];
  const team = await Employee.find({
    _id: { $in: uniqueTeamIds },
    isDeleted: false,
  }).lean();
  if (!team.length)
    throw new Error(
      "Project has no manager/assignees to author data. Add team members first."
    );

  const manager =
    team.find((e) => idStr(e) === idStr(project.manager)) || team[0];
  // People who log hours = assignees if present, else the whole team.
  const assigneeIds = new Set((project.assignees || []).map(idStr));
  const workers = team.filter((e) => assigneeIds.has(idStr(e)));
  const hourLoggers = workers.length ? workers : team;
  console.log(
    `   Team: ${team.length} member(s) — manager: ${manager.full_name || manager.email}; ` +
      `${hourLoggers.length} logging hours.`
  );

  // 3. Existing tasks (to attach hours/realism). Optional.
  const tasks = await Task.find({
    project_id: project._id,
    isDeleted: false,
  })
    .select("_id title assignees")
    .lean();
  const tasksByEmp = new Map();
  for (const e of hourLoggers) {
    const mine = tasks.filter((t) => (t.assignees || []).map(idStr).includes(idStr(e)));
    tasksByEmp.set(idStr(e), mine.length ? mine : tasks);
  }
  console.log(`   Tasks found: ${tasks.length}${tasks.length ? "" : " (hours will be project-level)"}`);

  // 4. Date window: project start → yesterday.
  const yesterday = startOfDayUTC(addDaysUTC(new Date(), -1));
  const until = parseDateArg(OPTS.until) || yesterday;
  let since =
    parseDateArg(OPTS.since) ||
    (project.start_date ? startOfDayUTC(project.start_date) : null) ||
    startOfDayUTC(addDaysUTC(until, -60));
  if (since > until) since = startOfDayUTC(addDaysUTC(until, -45));
  const bdays = businessDays(since, until);
  if (!bdays.length) throw new Error("No business days in the chosen window.");
  console.log(
    `   Window: ${fmtDay(since)} → ${fmtDay(until)} (${bdays.length} business days)`
  );

  // ── Plan / dry-run estimate ────────────────────────────────────────────────
  const estHours = Math.min(
    OPTS.maxHoursEntries,
    Math.round(hourLoggers.length * bdays.length * OPTS.coverage * 1.4)
  );
  console.log(global.chalk.gray(
    `\n   Plan ≈ hours:${estHours}, discussions:${OPTS.discussions} (+replies), ` +
      `notes:${OPTS.notes}, files:${OPTS.files}`
  ));
  if (OPTS.dry) {
    console.log(global.chalk.yellow("\n   --dry set: nothing written.\n"));
    return;
  }

  const manifest = newManifest();
  manifest.meta = {
    companyId: String(project.companyId),
    projectId: String(project._id),
    projectTitle: project.title,
    since: fmtDay(since),
    until: fmtDay(until),
    generatedAt: new Date().toISOString(),
  };
  const companyId = project.companyId;
  const totalsTouched = new Set();

  // ── 5. LOGGED HOURS ────────────────────────────────────────────────────────
  console.log(global.chalk.cyan("\n⏱  Logging hours …"));
  // Ensure a timesheet exists for this project (UI groups logs under it).
  let timesheet = await TimeSheet.findOne({
    project_id: project._id,
    isDeleted: false,
  }).lean();
  if (!timesheet) {
    const ts = await TimeSheet.create({
      project_id: project._id,
      title: `${project.title} — Timesheet`,
      isDefault: true,
      createdBy: manager._id,
      updatedBy: manager._id,
      createdAt: atUTC(since, 9),
      updatedAt: atUTC(since, 9),
    });
    timesheet = ts.toObject();
    manifest.created.projecttimesheets.push(String(ts._id));
  }

  const billablePool = project.isBillable
    ? ["Billable", "Billable", "Billable", "Non-billable", "Billed"]
    : ["Non-billable", "Non-billable", "Void"];

  const hourDocs = [];
  outer: for (const emp of hourLoggers) {
    const empTasks = tasksByEmp.get(idStr(emp)) || [];
    for (const day of bdays) {
      if (!chance(OPTS.coverage)) continue;
      if (hourDocs.length >= OPTS.maxHoursEntries) break outer;

      // Split a day's work (~hoursPerDay) into 1–2 entries.
      let dayMin = Math.round((OPTS.hoursPerDay + (Math.random() - 0.5) * 2) * 60);
      dayMin = Math.max(120, Math.min(600, dayMin)); // clamp 2h–10h
      const entries = dayMin > 300 && chance(0.6) ? 2 : 1;
      let remaining = dayMin;
      for (let k = 0; k < entries; k++) {
        if (hourDocs.length >= OPTS.maxHoursEntries) break outer;
        const slice =
          k === entries - 1 ? remaining : Math.round(remaining * (0.4 + Math.random() * 0.2));
        remaining -= slice;
        const h = Math.floor(slice / 60);
        const m = slice % 60;
        const taskDoc = empTasks.length ? pick(empTasks) : null;
        const descFn = pick(HOURS_DESC);
        const startHour = 9 + k * 4 + randInt(0, 1);
        hourDocs.push({
          employee_id: emp._id,
          project_id: project._id,
          task_id: taskDoc ? taskDoc._id : null,
          timesheet_id: timesheet._id,
          descriptions: descFn(taskDoc ? taskDoc.title : ""),
          logged_hours: pad2(h),
          logged_minutes: pad2(m),
          logged_seconds: "00",
          logged_date: atUTC(day, 12),
          isManuallyAdded: true,
          logged_status: pick(billablePool),
          createdBy: emp._id,
          updatedBy: emp._id,
          createdByModel: "employees",
          updatedByModel: "employees",
          createdAt: atUTC(day, startHour, randInt(0, 59)),
          updatedAt: atUTC(day, startHour, randInt(0, 59)),
        });
        totalsTouched.add(
          `${idStr(emp)}|${day.getUTCFullYear()}|${pad2(day.getUTCMonth() + 1)}`
        );
      }
    }
  }
  if (hourDocs.length) {
    const inserted = await HoursLog.insertMany(hourDocs);
    manifest.created.projecttaskhourlogs.push(...inserted.map((d) => String(d._id)));
  }
  console.log(`   ✓ ${hourDocs.length} hour-log entries`);

  // Recompute monthly rollups for every employee/month touched.
  manifest.totalsTouched = [...totalsTouched];
  await recomputeTotals(manifest.totalsTouched);
  console.log(`   ✓ ${manifest.totalsTouched.length} monthly rollup(s) recomputed`);

  // ── 6. DISCUSSIONS (topics + replies) ──────────────────────────────────────
  console.log(global.chalk.cyan("\n💬  Creating discussions …"));
  const topicPool = sampleN(DISCUSSION_TOPICS, OPTS.discussions);
  let topicCount = 0;
  let replyCount = 0;
  for (let i = 0; i < topicPool.length; i++) {
    const tp = topicPool[i];
    // Spread topic creation across the window.
    const createDay = bdays[Math.floor((i / Math.max(1, topicPool.length)) * (bdays.length - 1))] || pick(bdays);
    const author = pick(team);
    const subs = sampleN(team, randInt(2, Math.min(6, team.length))).map((e) => e._id);
    const createdAt = atUTC(createDay, randInt(9, 16), randInt(0, 59));

    const topic = await Topic.create({
      companyId,
      title: tp.t,
      project_id: project._id,
      task_id: null,
      status: "active",
      descriptions: tp.d,
      subscribers: subs,
      pms_clients: [],
      isPinToTop: i === 0,
      isPrivate: false,
      isBookMark: false,
      createdBy: author._id,
      updatedBy: author._id,
      createdByModel: "employees",
      updatedByModel: "employees",
      createdAt,
      updatedAt: createdAt,
    });
    manifest.created.discussionstopics.push(String(topic._id));
    topicCount++;

    // System default message (matches what the app auto-creates).
    const defDetail = await TopicDetail.create({
      companyId,
      topic_id: topic._id,
      project_id: project._id,
      title: "Added this topic",
      taggedUsers: [],
      isDefault: true,
      createdBy: author._id,
      updatedBy: author._id,
      createdByModel: "employees",
      updatedByModel: "employees",
      createdAt,
      updatedAt: createdAt,
    });
    manifest.created.discussionstopicsdetails.push(String(defDetail._id));

    // Replies by various team members, progressing in time up to `until`.
    const nReplies = randInt(3, 7);
    let replyAt = createdAt;
    const replyTexts = sampleN(DISCUSSION_REPLIES, nReplies);
    for (let r = 0; r < nReplies; r++) {
      replyAt = new Date(
        Math.min(
          atUTC(until, 18).getTime(),
          replyAt.getTime() + randInt(3, 36) * 3600 * 1000
        )
      );
      const replier = pick(team);
      const tagged = chance(0.4) ? [pick(team)._id] : [];
      const detail = await TopicDetail.create({
        companyId,
        topic_id: topic._id,
        project_id: project._id,
        title: replyTexts[r] || pick(DISCUSSION_REPLIES),
        taggedUsers: tagged,
        isDefault: false,
        createdBy: replier._id,
        updatedBy: replier._id,
        createdByModel: "employees",
        updatedByModel: "employees",
        createdAt: replyAt,
        updatedAt: replyAt,
      });
      manifest.created.discussionstopicsdetails.push(String(detail._id));
      replyCount++;
    }
  }
  console.log(`   ✓ ${topicCount} topics, ${replyCount} replies`);

  // ── 7. NOTES (notebook + notes + comments) ─────────────────────────────────
  console.log(global.chalk.cyan("\n📓  Creating notes …"));
  let notebook = await NoteBook.findOne({
    project_id: project._id,
    isDeleted: false,
  }).lean();
  if (!notebook) {
    const nb = await NoteBook.create({
      title: `${project.title} — Notebook`,
      project_id: project._id,
      createdBy: manager._id,
      updatedBy: manager._id,
      createdAt: atUTC(since, 9),
      updatedAt: atUTC(since, 9),
    });
    notebook = nb.toObject();
    manifest.created.notebook.push(String(nb._id));
  }
  const notePool = sampleN(NOTES, OPTS.notes);
  let noteCount = 0;
  let noteCommentCount = 0;
  for (let i = 0; i < notePool.length; i++) {
    const np = notePool[i];
    const day = pick(bdays);
    const author = pick(team);
    const createdAt = atUTC(day, randInt(9, 17), randInt(0, 59));
    const note = await Note.create({
      companyId,
      title: np.t,
      color: np.c,
      project_id: project._id,
      noteBook_id: notebook._id,
      notesInfo: np.b,
      subscribers: sampleN(team, randInt(1, Math.min(4, team.length))).map((e) => e._id),
      pms_clients: [],
      isBookmark: chance(0.15),
      isPrivate: false,
      createdBy: author._id,
      updatedBy: author._id,
      createdByModel: "employees",
      updatedByModel: "employees",
      createdAt,
      updatedAt: createdAt,
    });
    manifest.created.notes_pms.push(String(note._id));
    noteCount++;

    // A few comments on some notes.
    if (chance(0.5)) {
      const nc = randInt(1, 2);
      for (let c = 0; c < nc; c++) {
        const cAt = new Date(createdAt.getTime() + randInt(1, 72) * 3600 * 1000);
        if (cAt > atUTC(until, 18)) continue;
        const commenter = pick(team);
        const cm = await NoteComment.create({
          comment: pick(NOTE_COMMENTS),
          note_id: note._id,
          employee_id: commenter._id,
          taggedUsers: [],
          isResolve: false,
          createdBy: commenter._id,
          updatedBy: commenter._id,
          createdByModel: "employees",
          updatedByModel: "employees",
          createdAt: cAt,
          updatedAt: cAt,
        });
        manifest.created.NotesComments.push(String(cm._id));
        noteCommentCount++;
      }
    }
  }
  console.log(`   ✓ ${noteCount} notes, ${noteCommentCount} comments`);

  // ── 8. FILES (folder + uploads, optional physical placeholders) ────────────
  console.log(global.chalk.cyan("\n📎  Creating files …"));
  let folder = await Folder.findOne({
    project_id: project._id,
    isDeleted: false,
  }).lean();
  if (!folder) {
    const f = await Folder.create({
      name: "Project Documents",
      project_id: project._id,
      isDefault: true,
      createdBy: manager._id,
      updatedBy: manager._id,
      createdAt: atUTC(since, 9),
      updatedAt: atUTC(since, 9),
    });
    folder = f.toObject();
    manifest.created.filefolders.push(String(f._id));
  }

  // public/folderWise is where the app stores folder uploads (constant.js MULTER.FOLDERS).
  const uploadDir = path.resolve(__dirname, "../public/folderWise");
  if (!OPTS.noPhysicalFiles) {
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
    } catch (_) {}
  }
  const filePool = sampleN(FILES, OPTS.files);
  let fileCount = 0;
  for (let i = 0; i < filePool.length; i++) {
    const fp = filePool[i];
    const day = pick(bdays);
    const author = pick(team);
    const createdAt = atUTC(day, randInt(9, 17), randInt(0, 59));
    const ts = createdAt.getTime();
    const displayName = `${fp.n}${fp.ext}`;
    const storedName = `${fp.n}_${ts}${fp.ext}`;
    const sizeBytes = randInt(fp.kb[0], fp.kb[1]) * 1024;
    const relPath = `public/folderWise/${storedName}`; // GET splits on "public/"

    if (!OPTS.noPhysicalFiles) {
      try {
        const abs = path.join(uploadDir, storedName);
        // Small placeholder so preview/download don't 404 (real metadata stays realistic).
        fs.writeFileSync(
          abs,
          `Placeholder for ${displayName} — ${project.title}\nGenerated ${createdAt.toISOString()}\n`
        );
        manifest.physicalFiles.push(abs);
      } catch (_) {}
    }

    const file = await FileUpload.create({
      name: displayName,
      file_type: fp.ext,
      path: relPath,
      file_section: "Files",
      project_id: project._id,
      companyId,
      folder_id: folder._id,
      subscribers: sampleN(team, randInt(0, Math.min(3, team.length))).map((e) => e._id),
      pms_clients: [],
      file_size: sizeBytes,
      isBookmark: chance(0.1),
      createdBy: author._id,
      updatedBy: author._id,
      createdByModel: "employees",
      updatedByModel: "employees",
      createdAt,
      updatedAt: createdAt,
    });
    manifest.created.fileuploads.push(String(file._id));
    fileCount++;
  }
  console.log(`   ✓ ${fileCount} files${OPTS.noPhysicalFiles ? " (metadata only)" : ""}`);

  // ── Manifest + summary ─────────────────────────────────────────────────────
  const manifestPath = writeManifest(manifest);
  console.log(global.chalk.green("\n╔══════════════════════════════════════════════════╗"));
  console.log(global.chalk.green("║            SEED COMPLETED SUCCESSFULLY            ║"));
  console.log(global.chalk.green("╚══════════════════════════════════════════════════╝"));
  console.log(`   Hours logs        : ${manifest.created.projecttaskhourlogs.length}`);
  console.log(`   Monthly rollups   : ${manifest.totalsTouched.length}`);
  console.log(`   Discussion topics : ${manifest.created.discussionstopics.length}`);
  console.log(`   Discussion msgs   : ${manifest.created.discussionstopicsdetails.length}`);
  console.log(`   Notes             : ${manifest.created.notes_pms.length}`);
  console.log(`   Note comments     : ${manifest.created.NotesComments.length}`);
  console.log(`   Files             : ${manifest.created.fileuploads.length}`);
  console.log(global.chalk.gray(`\n   Manifest: ${manifestPath}`));
  console.log(global.chalk.gray(`   Undo with: node ${path.relative(process.cwd(), __filename)} --undo="${manifestPath}"\n`));
}

// ─── Entrypoint ──────────────────────────────────────────────────────────────
(async () => {
  if (!process.env.DB_URL)
    throw new Error(
      "DB_URL not set. Pass --dbUrl=<uri> or add it to server/env/.env.dev"
    );
  console.log(global.chalk.bgGreen.bold("Connecting to DB …"));
  await mongoose.connect(process.env.DB_URL);
  try {
    if (OPTS.undo) {
      await undo(OPTS.undo);
    } else {
      await seed();
    }
  } finally {
    await mongoose.disconnect();
  }
})()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(global.chalk.red("\n❌  Failed:"), err.message || err);
    mongoose.disconnect().finally(() => process.exit(1));
  });
