/*
  Migration: Normalize task stages company-wide across project workflows.

  Goal:
  - Within a company, all project workflows should carry the same stage set/order.
  - Remap tasks/main task lists to normalized stages in their workflow.
  - Optionally soft-delete extra stages not in canonical stage set.

  Usage:
  - Dry run:
      node server/migrations/202604171330__normalize_company_task_stages.js
  - Apply:
      node server/migrations/202604171330__normalize_company_task_stages.js --apply
  - Single company:
      node server/migrations/202604171330__normalize_company_task_stages.js --companyId=<COMPANY_OBJECT_ID>
      node server/migrations/202604171330__normalize_company_task_stages.js --apply --companyId=<COMPANY_OBJECT_ID>
*/

const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");

const envFile = process.env.NODE_ENV === "production" ? ".env.prod" : ".env.dev";
const envPath = path.resolve(__dirname, "../env", envFile);
dotenv.config({ path: envPath });

const DEFAULT_STAGE_ORDER = ["todo", "inprogress", "onhold", "done"];

function normalizeStageKey(value) {
  const raw = String(value || "").toLowerCase().trim();
  const compact = raw.replace(/[\s_-]+/g, "");
  if (compact.includes("todo")) return "todo";
  if (compact.includes("inprogress") || raw.includes("progress")) return "inprogress";
  if (compact.includes("onhold") || raw.includes("hold") || raw.includes("review")) return "onhold";
  if (raw.includes("done") || raw.includes("complete") || raw.includes("closed")) return "done";
  return compact || raw;
}

function orderBySemanticThenSequence(stages) {
  return [...stages].sort((a, b) => {
    const ak = normalizeStageKey(a?.title);
    const bk = normalizeStageKey(b?.title);
    const ai = DEFAULT_STAGE_ORDER.indexOf(ak);
    const bi = DEFAULT_STAGE_ORDER.indexOf(bk);
    const ah = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
    const bh = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
    if (ah !== bh) return ah - bh;
    const as = Number(a?.sequence || 0);
    const bs = Number(b?.sequence || 0);
    if (as !== bs) return as - bs;
    return String(a?._id || "").localeCompare(String(b?._id || ""));
  });
}

function getCliArgValue(name) {
  const inline = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (inline) return inline.split("=").slice(1).join("=");
  const idx = process.argv.findIndex((arg) => arg === `--${name}`);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return "";
}

async function run() {
  const isApply = process.argv.includes("--apply");
  const companyIdArg = String(getCliArgValue("companyId") || "").trim();

  if (!process.env.DB_URL) {
    console.error("DB_URL is missing. Check env file:", envPath);
    process.exit(1);
  }

  await mongoose.connect(process.env.DB_URL);
  if (companyIdArg && !mongoose.Types.ObjectId.isValid(companyIdArg)) {
    console.error("[migration] invalid --companyId. Must be a valid ObjectId.");
    process.exit(1);
  }
  console.log(
    `[migration] connected | mode=${isApply ? "APPLY" : "DRY_RUN"} | companyId=${companyIdArg || "ALL"}`
  );

  const db = mongoose.connection.db;
  const workflowCol = db.collection("projectworkflows");
  const statusCol = db.collection("workflowstatuses");
  const projectCol = db.collection("projects");
  const taskCol = db.collection("projecttasks");
  const mainTaskCol = db.collection("projectmaintasks");

  const summary = {
    companies: 0,
    workflows: 0,
    stagesCreated: 0,
    stagesSoftDeleted: 0,
    tasksRemapped: 0,
    mainTasksRemapped: 0,
    skippedCompaniesNoWorkflow: 0,
    skippedCompaniesNoStages: 0,
    failed: 0,
  };

  const companies = companyIdArg
    ? [new mongoose.Types.ObjectId(companyIdArg)]
    : await workflowCol.distinct("companyId", {
        isDeleted: false,
        companyId: { $ne: null },
      });

  for (const companyIdRaw of companies) {
    try {
      const companyId = String(companyIdRaw || "");
      if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) continue;
      summary.companies += 1;

      const workflows = await workflowCol
        .find({
          isDeleted: false,
          companyId: new mongoose.Types.ObjectId(companyId),
        })
        .toArray();

      if (!workflows.length) {
        summary.skippedCompaniesNoWorkflow += 1;
        continue;
      }

      summary.workflows += workflows.length;
      const workflowIds = workflows.map((w) => w._id);

      const allStages = await statusCol
        .find({
          isDeleted: false,
          workflow_id: { $in: workflowIds },
        })
        .toArray();

      if (!allStages.length) {
        summary.skippedCompaniesNoStages += 1;
        continue;
      }

      // Canonical source: company default workflow if present; else workflow with max stages.
      const defaultWorkflow = workflows.find((w) => Boolean(w?.isDefault));
      const stageGroups = new Map();
      allStages.forEach((s) => {
        const wid = String(s.workflow_id);
        if (!stageGroups.has(wid)) stageGroups.set(wid, []);
        stageGroups.get(wid).push(s);
      });
      const canonicalWorkflowId = defaultWorkflow?._id
        ? String(defaultWorkflow._id)
        : [...stageGroups.entries()].sort((a, b) => b[1].length - a[1].length)[0][0];
      const canonicalStagesRaw = orderBySemanticThenSequence(
        stageGroups.get(canonicalWorkflowId) || []
      );

      const canonicalByKey = new Map();
      canonicalStagesRaw.forEach((stage) => {
        const key = normalizeStageKey(stage?.title);
        if (!key || canonicalByKey.has(key)) return;
        canonicalByKey.set(key, {
          key,
          title: stage?.title || "Untitled",
          color: stage?.color || "#64748b",
          isDefault: Boolean(stage?.isDefault || DEFAULT_STAGE_ORDER.includes(key)),
        });
      });
      const canonicalStages = orderBySemanticThenSequence([...canonicalByKey.values()]);

      for (const workflow of workflows) {
        const wid = String(workflow._id);
        const existingStages = orderBySemanticThenSequence(stageGroups.get(wid) || []);
        const existingByKey = new Map();
        existingStages.forEach((s) => {
          const key = normalizeStageKey(s?.title);
          if (!key || existingByKey.has(key)) return;
          existingByKey.set(key, s);
        });

        const oldToNew = new Map();
        const desiredStageIds = [];
        let nextSequence = 1;

        // ensure canonical exists in this workflow
        for (const canonical of canonicalStages) {
          const key = canonical.key;
          let stage = existingByKey.get(key);
          if (!stage) {
            const toInsert = {
              workflow_id: workflow._id,
              title: canonical.title,
              color: canonical.color,
              sequence: nextSequence,
              isDefault: Boolean(canonical.isDefault),
              createdBy: workflow.createdBy || workflow.updatedBy,
              updatedBy: workflow.updatedBy || workflow.createdBy,
              createdAt: new Date(),
              updatedAt: new Date(),
              isDeleted: false,
            };
            if (isApply) {
              const insertRes = await statusCol.insertOne(toInsert);
              stage = { ...toInsert, _id: insertRes.insertedId };
            } else {
              stage = { ...toInsert, _id: new mongoose.Types.ObjectId() };
            }
            summary.stagesCreated += 1;
          } else if (isApply) {
            await statusCol.updateOne(
              { _id: stage._id },
              {
                $set: {
                  sequence: nextSequence,
                  color: stage.color || canonical.color,
                  updatedAt: new Date(),
                },
              }
            );
          }

          desiredStageIds.push(String(stage._id));
          oldToNew.set(String(stage._id), String(stage._id));
          nextSequence += 1;
        }

        // remap non-canonical/duplicate stage ids by semantic key
        for (const oldStage of existingStages) {
          const oldId = String(oldStage._id);
          if (oldToNew.has(oldId)) continue;
          const k = normalizeStageKey(oldStage?.title);
          const target = existingByKey.get(k) || null;
          if (target?._id) {
            oldToNew.set(oldId, String(target._id));
          }
        }

        const projectIdsForWorkflow = await projectCol.distinct("_id", {
          isDeleted: false,
          workFlow: workflow._id,
        });

        const remapFromIds = [...oldToNew.keys()].filter((id) => oldToNew.get(id) !== id);
        for (const oldId of remapFromIds) {
          const newId = oldToNew.get(oldId);
          if (!newId) continue;
          if (isApply) {
            const taskRes = await taskCol.updateMany(
              {
                isDeleted: false,
                project_id: { $in: projectIdsForWorkflow },
                task_status: new mongoose.Types.ObjectId(oldId),
              },
              {
                $set: {
                  task_status: new mongoose.Types.ObjectId(newId),
                  updatedAt: new Date(),
                },
              }
            );
            summary.tasksRemapped += Number(taskRes.modifiedCount || 0);

            const mainTaskRes = await mainTaskCol.updateMany(
              {
                isDeleted: false,
                project_id: { $in: projectIdsForWorkflow },
                task_status: new mongoose.Types.ObjectId(oldId),
              },
              {
                $set: {
                  task_status: new mongoose.Types.ObjectId(newId),
                  updatedAt: new Date(),
                },
              }
            );
            summary.mainTasksRemapped += Number(mainTaskRes.modifiedCount || 0);
          }
        }

        const desiredSet = new Set(desiredStageIds);
        const extraStageIds = existingStages
          .map((s) => String(s._id))
          .filter((id) => !desiredSet.has(id));

        if (isApply && extraStageIds.length > 0) {
          const deleteRes = await statusCol.updateMany(
            {
              _id: { $in: extraStageIds.map((id) => new mongoose.Types.ObjectId(id)) },
              isDeleted: false,
            },
            {
              $set: {
                isDeleted: true,
                deletedAt: new Date(),
                deletedBy: workflow.updatedBy || workflow.createdBy || null,
              },
            }
          );
          summary.stagesSoftDeleted += Number(deleteRes.modifiedCount || 0);
        } else if (!isApply) {
          summary.stagesSoftDeleted += extraStageIds.length;
        }
      }
    } catch (error) {
      summary.failed += 1;
      console.error("[migration] company failed:", String(companyIdRaw || ""), error.message);
    }
  }

  console.log("\n[migration] summary");
  Object.entries(summary).forEach(([key, value]) => {
    console.log(`- ${key}: ${value}`);
  });
  console.log(`\n[migration] done | mode=${isApply ? "APPLY" : "DRY_RUN"}`);

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error("[migration] fatal:", error);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
