/**
 * Backfill: create the default project timesheet for existing projects that have none.
 *
 * Why:
 *   Every project is supposed to get one default timesheet at creation time
 *   (see addProjectDefaultData in controller/projects.js). Historically that save
 *   was fire-and-forget, so some projects ended up with no timesheet — which leaves
 *   the task "Log hours" dropdown empty. This script repairs those projects.
 *
 * What it does:
 *   - Finds every non-deleted project that currently has NO active (isDeleted:false)
 *     timesheet at all.
 *   - Creates a default timesheet titled `${project.title} - Timesheet` for each,
 *     mirroring exactly what project creation would have done.
 *   - createdBy/updatedBy are copied from the project (falls back to updatedBy).
 *     Projects with neither are skipped and reported (timesheet.createdBy is required).
 *   - Idempotent: a project that already has any active timesheet is left untouched,
 *     so it is safe to run more than once.
 *
 * Usage (run from the server/ directory):
 *   Dry run, all projects:   node scripts/backfill_default_timesheets.js
 *   Apply, all projects:     node scripts/backfill_default_timesheets.js --run
 *   Single project (dry):    node scripts/backfill_default_timesheets.js --project=<projectId>
 *   Single project (apply):  node scripts/backfill_default_timesheets.js --project=<projectId> --run
 *   Against production:      NODE_ENV=production node scripts/backfill_default_timesheets.js --run
 */

"use strict";

const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");

const envFile = process.env.NODE_ENV === "production" ? ".env.prod" : ".env.dev";
dotenv.config({ path: path.resolve(__dirname, `../env/${envFile}`) });

// The timesheet model's createdAt/updatedAt defaults use a global `moment`
// (set in app.js during server bootstrap). Standalone scripts must set it too,
// otherwise saving a document throws "moment is not defined".
global.moment = require("moment");

require("../models");

const Project = mongoose.model("projects");
const ProjectTimeSheet = mongoose.model("projecttimesheets");

function getProjectIdArg() {
  const arg = process.argv.find((a) => a.startsWith("--project="));
  if (!arg) return null;
  const id = arg.split("=")[1];
  if (!mongoose.Types.ObjectId.isValid(id)) {
    console.error(`Invalid project id: "${id}". Aborting.`);
    process.exit(1);
  }
  return id;
}

async function run() {
  const dryRun = !process.argv.includes("--run");
  const projectId = getProjectIdArg();

  console.log(
    dryRun
      ? "=== DRY RUN — no writes will be made. Pass --run to apply. ==="
      : "=== LIVE RUN — changes will be written to the database. ==="
  );
  console.log(
    projectId
      ? `Scope: single project ${projectId}`
      : "Scope: all projects missing a timesheet"
  );

  if (!process.env.DB_URL) {
    console.error(`DB_URL is not set (looked in env/${envFile}). Aborting.`);
    process.exit(1);
  }

  await mongoose.connect(process.env.DB_URL);
  console.log("Connected to MongoDB.");

  // Project ids that already have at least one active timesheet
  // (scoped to the target project when one is passed, for efficiency).
  const projectIdsWithTimesheet = await ProjectTimeSheet.distinct("project_id", {
    isDeleted: false,
    ...(projectId ? { project_id: projectId } : {}),
  });
  const alreadyHasTimesheet = projectIdsWithTimesheet.map(String);

  let projects;
  if (projectId) {
    // Single-project mode: surface a missing/deleted project instead of a silent no-op.
    const target = await Project.findById(projectId)
      .select("_id title createdBy updatedBy isDeleted")
      .lean();
    if (!target) {
      console.error(`Project ${projectId} not found. Aborting.`);
      await mongoose.disconnect();
      process.exit(1);
    }
    if (target.isDeleted) {
      console.warn(`Project ${projectId} is soft-deleted — nothing to do.`);
      projects = [];
    } else if (alreadyHasTimesheet.includes(String(projectId))) {
      console.log(`Project ${projectId} already has a timesheet — nothing to do.`);
      projects = [];
    } else {
      projects = [target];
    }
  } else {
    // All-projects mode: every non-deleted project with no active timesheet.
    projects = await Project.find({
      isDeleted: false,
      _id: { $nin: alreadyHasTimesheet },
    })
      .select("_id title createdBy updatedBy")
      .lean();
  }

  console.log(`Projects missing a timesheet: ${projects.length}`);

  const toCreate = [];
  const skipped = [];

  for (const project of projects) {
    const owner = project.createdBy || project.updatedBy || null;
    if (!owner) {
      skipped.push(project);
      console.warn(
        `  SKIP  ${project._id} "${project.title}" — no createdBy/updatedBy to attribute the timesheet to.`
      );
      continue;
    }

    const title = `${project.title} - Timesheet`;
    console.log(`  ${dryRun ? "WOULD CREATE" : "CREATE"}  ${project._id} → "${title}"`);

    toCreate.push({
      title,
      isDefault: true,
      project_id: project._id,
      createdBy: owner,
      updatedBy: owner,
    });
  }

  if (!dryRun && toCreate.length > 0) {
    await ProjectTimeSheet.insertMany(toCreate);
  }

  console.log("\nSummary");
  console.log(`  ${dryRun ? "Would create" : "Created"}: ${toCreate.length}`);
  console.log(`  Skipped (no owner): ${skipped.length}`);
  if (dryRun) {
    console.log("\nRe-run with --run to apply these changes.");
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
