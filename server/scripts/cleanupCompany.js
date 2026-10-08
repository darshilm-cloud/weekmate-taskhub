/**
 * Remove a company and everything demoDataSeeder.js created for it.
 * Used to roll back a bad/test seed run without touching other tenants' data.
 *
 * Usage: node server/scripts/cleanupCompany.js <companyId>
 */

"use strict";

const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");

global.moment = require("moment");
global.chalk = require("chalk");

dotenv.config({ path: path.resolve(__dirname, "../env/.env.dev") });

const companyIdArg = process.argv[2];
if (!companyIdArg || !mongoose.Types.ObjectId.isValid(companyIdArg)) {
  throw new Error("Usage: node cleanupCompany.js <companyId>");
}

async function main() {
  await mongoose.connect(process.env.DB_URL);
  const db = mongoose.connection.db;
  const companyId = new mongoose.Types.ObjectId(companyIdArg);

  const projectIds = (await db.collection("projects").find({ companyId }).project({ _id: 1 }).toArray()).map((d) => d._id);
  const complaintIds = (await db.collection("complaints").find({ companyId }).project({ _id: 1 }).toArray()).map((d) => d._id);
  const workflowIds = (await db.collection("projectworkflows").find({ companyId }).project({ _id: 1 }).toArray()).map((d) => d._id);
  const mainTaskIds = (await db.collection("projectmaintasks").find({ project_id: { $in: projectIds } }).project({ _id: 1 }).toArray()).map((d) => d._id);

  const report = {};
  const removeMany = async (coll, filter) => {
    const r = await db.collection(coll).deleteMany(filter);
    report[coll] = r.deletedCount;
  };

  await removeMany("reviews", { project_id: { $in: projectIds } });
  await removeMany("consumer_feedback_forms", { complaint_id: { $in: complaintIds } });
  await removeMany("complaints_comments", { complaint_id: { $in: complaintIds } });
  await removeMany("complaints", { companyId });
  await removeMany("discussionstopicsdetails", { discussionTopicId: { $exists: true }, companyId });
  await removeMany("discussionstopics", { companyId });
  await removeMany("projecttaskbugs", { companyId });
  await removeMany("bugsworkflowstatuses", { companyId });
  await removeMany("notes_pms", { companyId });
  await removeMany("notebooks", { companyId });
  await removeMany("projecttasks", { companyId });
  await removeMany("projectmaintasks", { _id: { $in: mainTaskIds } });
  await removeMany("projectexpanses", { companyId });
  await removeMany("projects", { companyId });
  await removeMany("workflowstatuses", { workflow_id: { $in: workflowIds } });
  await removeMany("projectworkflows", { companyId });
  await removeMany("projectstatuses", { companyId });
  await removeMany("role_permissions", { companyId });
  await removeMany("pmsclients", { companyId });
  await removeMany("employees", { companyId });
  await removeMany("companies", { _id: companyId });

  console.log(JSON.stringify(report, null, 2));
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  mongoose.disconnect().finally(() => process.exit(1));
});
