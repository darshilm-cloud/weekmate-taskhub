/**
 * CRM outbox: pushes an approved project milestone to the CRM
 *   POST {CRM_BASE_URL}/api/public/milestones/approved?apikey={CRM_API_KEY}
 *
 * Same BullMQ pattern as the import queues (config/queue.js: shared Redis, per-database
 * prefix), but one global queue + worker. The CRM endpoint is idempotent on
 * (projectCode, milestoneId) so a retried job is safe.
 *
 *  - Queue path: BullMQ job, 6 attempts, exponential backoff (5s, 10s, 20s ...).
 *  - If Redis is unreachable the milestone is pushed inline (fire-and-forget) with a
 *    small in-process retry loop, so an approval is never lost silently.
 *  - milestone.crmSyncStatus: pending -> synced | failed, crmSyncedAt, crmSyncAttempts,
 *    crmSyncError are kept up to date by both paths.
 */
const mongoose = require("mongoose");
const { Queue, Worker } = require("bullmq");
const { createRedisConnection, getQueuePrefix, waitForQueueReady } = require("../config/queue");

const QUEUE_NAME = "crm-milestone-sync";
const JOB_ATTEMPTS = Number(process.env.CRM_SYNC_ATTEMPTS) || 6;
const BACKOFF_MS = Number(process.env.CRM_SYNC_BACKOFF_MS) || 5000;
const REQUEST_TIMEOUT_MS = Number(process.env.CRM_SYNC_TIMEOUT_MS) || 15000;
const INLINE_ATTEMPTS = 3;
const REDIS_RETRY_COOLDOWN_MS = 60 * 1000;

let queue = null;
let bootstrap = null;
let redisDownUntil = 0;

const log = (...args) => console.log("[crm-sync]", ...args);
const warn = (...args) => console.warn("[crm-sync]", ...args);

// Only the base URL is mandatory: the API key is resolved per company (see crmKeyFor).
const crmConfigured = () => Boolean(process.env.CRM_BASE_URL);

const getMilestoneModel = () => mongoose.model("projectmilestones");

/** Body the CRM expects (see docs/aarav/CONTRACTS.md). */
async function buildPayload(milestoneId) {
  const milestone = await getMilestoneModel().findById(milestoneId).lean();
  if (!milestone) throw new Error(`Milestone ${milestoneId} not found`);
  const project = await mongoose
    .model("projects")
    .findById(milestone.project_id)
    .select("title externalRef projectValue")
    .lean();
  if (!project?.externalRef) throw new Error("Project has no projectCode (externalRef); nothing to sync");
  const approver = milestone.approvedBy
    ? await mongoose.model("employees").findById(milestone.approvedBy).select("full_name email").lean()
    : null;
  const billingAmount = Math.round(((project.projectValue || 0) * (milestone.billingPercent || 0)) / 100);
  return {
    projectCode: project.externalRef,
    milestoneId: String(milestone._id),
    milestoneKey: milestone.key,
    title: milestone.title,
    amount: billingAmount,
    approvedBy: approver?.email || approver?.full_name || String(milestone.approvedBy || ""),
    approvedAt: (milestone.approvedAt || new Date()).toISOString(),
    evidence: (milestone.evidence || []).map((e) => ({ name: e.name, url: e.url })),
  };
}

/**
 * CRM api key for the milestone's company (the CRM maps key -> tenant, so the key MUST belong to
 * the same company as the project). Resolution order:
 *   1. env CRM_API_KEY_<SLUG> (slug = company.companyDomain upper-cased, non-alphanumerics -> "_")
 *   2. env CRM_API_KEY (the single-tenant default; used for every company unless CRM_API_KEY_SLUG is
 *      set, in which case only for that slug)
 *   3. `<slug>-demo-crm-key` (local multi-tenant demo seed convention) - only when CRM_API_KEY is unset
 * Throws a readable error when nothing resolves.
 */
async function crmKeyFor(milestoneId) {
  let slug = "";
  try {
    const m = await getMilestoneModel().findById(milestoneId).select("project_id").lean();
    const pr = m && (await mongoose.model("projects").findById(m.project_id).select("companyId").lean());
    const co = pr?.companyId && (await mongoose.model("companies").findById(pr.companyId).select("companyDomain").lean());
    slug = String(co?.companyDomain || "").toLowerCase();
  } catch (_) { /* slug stays empty */ }
  const perSlug = slug && process.env[`CRM_API_KEY_${slug.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`];
  if (perSlug) return perSlug;
  const defaultSlug = String(process.env.CRM_API_KEY_SLUG || "").toLowerCase();
  if (process.env.CRM_API_KEY && (!defaultSlug || !slug || defaultSlug === slug)) return process.env.CRM_API_KEY;
  if (slug && !process.env.CRM_API_KEY) return `${slug}-demo-crm-key`;
  throw new Error(`No CRM API key configured for company "${slug || "unknown"}" (set CRM_API_KEY or CRM_API_KEY_${(slug || "SLUG").toUpperCase().replace(/[^A-Z0-9]/g, "_")})`);
}

async function postToCrm(payload, apiKey = process.env.CRM_API_KEY) {
  const base = String(process.env.CRM_BASE_URL).replace(/\/+$/, "");
  const url = `${base}/api/public/milestones/approved?apikey=${encodeURIComponent(apiKey)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const hint = res.status === 401 ? " - the CRM did not accept this company's API key"
        : res.status === 404 ? " - the CRM has no project handover with this projectCode for this company"
        : "";
      throw new Error(`CRM responded ${res.status}${hint}: ${text.slice(0, 250)}`);
    }
    return true;
  } catch (err) {
    if (err?.name === "AbortError") throw new Error(`CRM did not respond within ${REQUEST_TIMEOUT_MS}ms (${base})`);
    if (err instanceof TypeError) throw new Error(`CRM unreachable at ${base}: ${err.cause?.code || err.message}`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function markAttempt(milestoneId, error) {
  await getMilestoneModel().updateOne(
    { _id: milestoneId, crmSyncStatus: { $ne: "synced" } },
    { $inc: { crmSyncAttempts: 1 }, $set: { crmSyncError: error ? String(error.message || error).slice(0, 500) : "" } }
  );
}

async function markSynced(milestoneId) {
  await getMilestoneModel().updateOne(
    { _id: milestoneId },
    { $set: { crmSyncStatus: "synced", crmSyncedAt: new Date(), crmSyncError: "" } }
  );
}

// Never downgrade a milestone that has already synced: a stale job (the original approval's retries still
// running in Redis after a manual re-sync succeeded) must not flip a synced milestone back to "failed".
async function markFailed(milestoneId, error) {
  await getMilestoneModel().updateOne(
    { _id: milestoneId, crmSyncStatus: { $ne: "synced" } },
    { $set: { crmSyncStatus: "failed", crmSyncError: String(error?.message || error || "").slice(0, 500) } }
  );
}

/** One push attempt: build payload, POST, record the outcome on the milestone. */
async function pushOnce(milestoneId) {
  try {
    const payload = await buildPayload(milestoneId);
    await postToCrm(payload, await crmKeyFor(milestoneId));
    await markAttempt(milestoneId, null);
    await markSynced(milestoneId);
    log(`synced milestone ${milestoneId} (${payload.projectCode} ${payload.milestoneKey})`);
  } catch (err) {
    await markAttempt(milestoneId, err).catch(() => {});
    throw err;
  }
}

// ── Queue (BullMQ) ───────────────────────────────────────────────────────────

async function createQueue() {
  const queueConnection = createRedisConnection();
  const workerConnection = createRedisConnection();
  const q = new Queue(QUEUE_NAME, {
    prefix: getQueuePrefix(),
    connection: queueConnection,
    defaultJobOptions: {
      attempts: JOB_ATTEMPTS,
      backoff: { type: "exponential", delay: BACKOFF_MS },
      removeOnComplete: 50,
      removeOnFail: 100,
    },
  });
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      await pushOnce(job.data.milestoneId);
      return { success: true };
    },
    { prefix: getQueuePrefix(), connection: workerConnection, concurrency: 2 }
  );
  worker.on("failed", async (job, err) => {
    warn(`job ${job?.id} attempt ${job?.attemptsMade}/${job?.opts?.attempts} failed: ${err.message}`);
    if (job && job.attemptsMade >= (job.opts?.attempts || JOB_ATTEMPTS)) {
      await markFailed(job.data.milestoneId, err).catch(() => {});
    }
  });
  worker.on("error", (err) => warn("worker error:", err.message));
  await waitForQueueReady(q, worker, "CrmSync", [queueConnection, workerConnection]);
  log(`worker ready - ${QUEUE_NAME}`);
  return q;
}

async function getQueue() {
  if (queue) return queue;
  if (Date.now() < redisDownUntil) throw new Error("Redis unavailable (cooling down)");
  if (!bootstrap) {
    bootstrap = createQueue()
      .then((q) => {
        queue = q;
        return q;
      })
      .catch((err) => {
        redisDownUntil = Date.now() + REDIS_RETRY_COOLDOWN_MS;
        throw err;
      })
      .finally(() => {
        bootstrap = null;
      });
  }
  return bootstrap;
}

// ── Inline fallback ──────────────────────────────────────────────────────────

function pushInline(milestoneId) {
  (async () => {
    let lastErr;
    for (let attempt = 1; attempt <= INLINE_ATTEMPTS; attempt++) {
      try {
        await pushOnce(milestoneId);
        return;
      } catch (err) {
        lastErr = err;
        warn(`inline push ${attempt}/${INLINE_ATTEMPTS} failed for ${milestoneId}: ${err.message}`);
        if (attempt < INLINE_ATTEMPTS) await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
    await markFailed(milestoneId, lastErr);
  })().catch((err) => warn("inline push crashed:", err.message));
}

/**
 * Called when a milestone is approved. Always resolves (never throws): the milestone
 * is set to crmSyncStatus "pending" first and the push runs in the background.
 */
async function enqueueMilestoneApproved(milestoneId) {
  const id = String(milestoneId);
  // Non-billable milestone (billingPercent 0): approvable, but there is nothing to invoice, so no CRM push / invoice request.
  const ms = await getMilestoneModel().findById(id).select("billingPercent").lean();
  if (ms && !(Number(ms.billingPercent) > 0)) {
    await getMilestoneModel().updateOne({ _id: id }, { $set: { crmSyncStatus: "none", crmSyncError: "" } });
    return { mode: "non-billable" };
  }
  await getMilestoneModel().updateOne(
    { _id: id },
    { $set: { crmSyncStatus: "pending", crmSyncError: "", crmSyncAttempts: 0 } }
  );
  if (!crmConfigured()) {
    await markFailed(id, new Error("CRM_BASE_URL is not configured on this server"));
    warn("CRM_BASE_URL not set; milestone marked failed, use re-sync once configured");
    return { mode: "unconfigured" };
  }
  try {
    const q = await getQueue();
    // Stable job id would dedupe, but re-sync after a failure must be able to re-add.
    await q.add("push", { milestoneId: id }, { jobId: `ms-${id}-${Date.now()}` });
    return { mode: "queue" };
  } catch (err) {
    warn(`queue unavailable (${err.message}); pushing inline`);
    pushInline(id);
    return { mode: "inline" };
  }
}

/** Start the worker at boot so jobs left in Redis by a previous run are processed. */
async function start() {
  if (!crmConfigured()) {
    log("CRM_BASE_URL not set; CRM sync worker not started");
    return;
  }
  try {
    await getQueue();
  } catch (err) {
    warn(`worker not started (${err.message}); approvals will push inline`);
  }
}

module.exports = { enqueueMilestoneApproved, start, buildPayload, QUEUE_NAME };
