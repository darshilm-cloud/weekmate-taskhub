/**
 * Spreads an existing company's tasks across the last ~6 months (instead of
 * all sharing one createdAt) and varies their workflow status, so the
 * Project Statistics dashboard chart shows a realistic distribution instead
 * of a single spike on the day they were seeded.
 *
 * Usage: node server/scripts/spreadTaskStatisticsDemoData.js <companyId>
 */

"use strict";

const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../env/.env.dev") });

const companyIdArg = process.argv[2];
if (!companyIdArg || !mongoose.Types.ObjectId.isValid(companyIdArg)) {
  throw new Error("Usage: node spreadTaskStatisticsDemoData.js <companyId>");
}

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pickWeighted = (weightedItems) => {
  const total = weightedItems.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [item, w] of weightedItems) {
    if (roll < w) return item;
    roll -= w;
  }
  return weightedItems[weightedItems.length - 1][0];
};

async function main() {
  await mongoose.connect(process.env.DB_URL);
  const db = mongoose.connection.db;
  const companyId = new mongoose.Types.ObjectId(companyIdArg);

  const workflow = await db.collection("projectworkflows").findOne({ companyId, isDefault: true, isDeleted: false });
  if (!workflow) throw new Error("No default workflow found for this company");

  const statuses = await db.collection("workflowstatuses").find({ workflow_id: workflow._id, isDeleted: false }).toArray();
  const statusByTitle = Object.fromEntries(statuses.map((s) => [s.title, s._id]));
  const requiredTitles = ["To-Do", "In Progress", "Ready for Review", "On Hold", "Done"];
  for (const title of requiredTitles) {
    if (!statusByTitle[title]) throw new Error(`Missing workflow status "${title}" for this company`);
  }

  const projects = await db.collection("projects").find({ companyId, isDeleted: false }).project({ _id: 1 }).toArray();
  const projectIds = projects.map((p) => p._id);

  const tasks = await db.collection("projecttasks").find({ project_id: { $in: projectIds } }).project({ _id: 1 }).toArray();

  const now = new Date();
  const ops = tasks.map((task) => {
    // Bias recent: half the tasks land in the last 30 days, the rest spread
    // across the prior 5 months, so weekly/monthly/quarterly views all have
    // something to show.
    const daysAgo = Math.random() < 0.5 ? randInt(0, 30) : randInt(31, 180);
    const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    createdAt.setHours(randInt(8, 18), randInt(0, 59), 0, 0);

    const statusTitle = pickWeighted([
      ["Done", 35],
      ["In Progress", 25],
      ["To-Do", 20],
      ["Ready for Review", 12],
      ["On Hold", 8],
    ]);

    return {
      updateOne: {
        filter: { _id: task._id },
        update: {
          $set: {
            createdAt,
            task_status: statusByTitle[statusTitle],
          },
        },
      },
    };
  });

  const result = await db.collection("projecttasks").bulkWrite(ops);
  console.log(`Updated ${result.modifiedCount} of ${tasks.length} tasks across ${projectIds.length} projects.`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  mongoose.disconnect().finally(() => process.exit(1));
});
