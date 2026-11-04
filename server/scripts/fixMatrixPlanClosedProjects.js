/**
 * ROLLBACK + corrected re-seed for the Resource Matrix plan (seedTag "matrix-plan-v1"), Aarav Enterprises only.
 *
 * Problem: the first matrix seed planned tasks on projects that are Closed/Completed in some environments (dev), which
 * changed their progress / upcoming-task counts. This script:
 *   1. deletes matrix-plan-v1 tasks + lists that sit on projects that are NOT truly open (status Closed/Completed/..., marked done, past end_date);
 *   2. patches matrix-plan-v1 lists on open projects that lack pms_clients / isPrivateList (a missing array crashed the Team Manager dashboard);
 *   3. with --reseed: rebuilds the plan on truly open projects only (engineers fully planned at 8.5 h/day) via lib/matrixPlan.js.
 * Nothing else is touched (no project, status, progress, milestone, hours recomputation). Idempotent: a second run finds nothing to delete.
 *
 *   DB_URL=... node scripts/fixMatrixPlanClosedProjects.js --dry-run
 *   DB_URL=<remote> ALLOW_REMOTE_SEED=1 node scripts/fixMatrixPlanClosedProjects.js --force [--reseed]
 */
"use strict";
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const D = require("./aaravStoryData");
const { isTrulyOpen, TAG } = require("./lib/matrixPlan");

const ARGV = process.argv.slice(2);
const has = (n) => ARGV.includes(`--${n}`);
const DRY = has("dry-run") || has("dryRun");
const FORCE = has("force");
const RESEED = has("reseed");
const log = (...a) => console.log(...a);

function hostsOf(url) {
  const m = (url || "").match(/^mongodb(?:\+srv)?:\/\/(?:[^@/]*@)?([^/?]+)/i);
  return (m ? m[1] : "").split(",").map((h) => h.replace(/:\d+$/, "").replace(/^\[|\]$/g, "").toLowerCase());
}

(async () => {
  const url = process.env.DB_URL;
  if (!url) throw new Error("DB_URL is not set");
  const hosts = hostsOf(url);
  const local = hosts.length > 0 && hosts.every((h) => ["localhost", "127.0.0.1", "::1"].includes(h));
  if (!local && !DRY && !(FORCE && process.env.ALLOW_REMOTE_SEED === "1")) {
    throw new Error(`Refusing to write to non-local DB (${hosts.join(",")}): need --force AND ALLOW_REMOTE_SEED=1 (or use --dry-run)`);
  }
  await mongoose.connect(url, { serverSelectionTimeoutMS: 8000 });
  const db = mongoose.connection.db;
  const companyId = new mongoose.Types.ObjectId(D.COMPANY.id);
  if (!(await db.collection("companies").findOne({ _id: companyId }))) throw new Error("Aarav company not found in this DB (nothing to do)");

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const projects = await db.collection("projects").find({ companyId, isDeleted: false }).toArray();
  const statuses = Object.fromEntries((await db.collection("projectstatuses").find({}).toArray()).map((s) => [String(s._id), s.title]));
  const closed = projects.filter((p) => !isTrulyOpen(p, today, statuses));
  const openP = projects.filter((p) => isTrulyOpen(p, today, statuses));
  log(`Aarav projects: ${projects.length} (open ${openP.length}: ${openP.map((p) => p.title).join(", ")})`);
  log(`Not open (plan removed): ${closed.map((p) => `${p.title} [${statuses[String(p.project_status)] || "?"}]`).join(", ") || "none"}`);

  const closedIds = closed.map((p) => p._id);
  const T = db.collection("projecttasks");
  const L = db.collection("projectmaintasks");
  const nT = await T.countDocuments({ seedTag: TAG, project_id: { $in: closedIds } });
  const nL = await L.countDocuments({ seedTag: TAG, project_id: { $in: closedIds } });
  const needPatch = { seedTag: TAG, project_id: { $in: openP.map((p) => p._id) }, $or: [{ pms_clients: { $exists: false } }, { isPrivateList: { $exists: false } }] };
  const nPatch = await L.countDocuments(needPatch);
  log(`${DRY ? "[dry-run] would delete" : "deleting"} ${nT} tasks + ${nL} lists on closed projects; patch ${nPatch} lists on open projects${RESEED ? "; then reseed" : ""}`);
  if (DRY) return;

  const dt = await T.deleteMany({ seedTag: TAG, project_id: { $in: closedIds } });
  const dl = await L.deleteMany({ seedTag: TAG, project_id: { $in: closedIds } });
  await L.updateMany({ ...needPatch, pms_clients: { $exists: false } }, { $set: { pms_clients: [] } });
  await L.updateMany({ seedTag: TAG, project_id: { $in: openP.map((p) => p._id) }, isPrivateList: { $exists: false } }, { $set: { isPrivateList: false } });
  log(`deleted ${dt.deletedCount} tasks, ${dl.deletedCount} lists`);

  if (RESEED) {
    const dir = path.resolve(__dirname, "../models");
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".js"))) { try { require(path.join(dir, f)); } catch (_) {} }
    const out = await require("./lib/matrixPlan").seedMatrixPlan({ mongoose, companyId, today, log, reset: true, syntheticLeave: true });
    log("reseed:", JSON.stringify({ tasks: out.tasks, lists: out.mainTasks, projects: out.openProjects }));
  }
})().catch((e) => { console.error("ERROR:", e.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
