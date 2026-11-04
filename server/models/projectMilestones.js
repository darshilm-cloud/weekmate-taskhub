const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { commonSchema } = require("../helpers/common");

const MILESTONE_STATUS = ["Not Started", "In Progress", "Submitted", "Approved", "Rework Required"];
const CRM_SYNC_STATUS = ["none", "pending", "synced", "failed"];

const EvidenceSchema = new Schema(
  {
    name: { type: String, default: "" },
    url: { type: String, default: "" },
    type: { type: String, default: "link" },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ProjectMilestoneSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: "companies" },
  project_id: { type: Schema.Types.ObjectId, ref: "projects", required: true },
  // M1..M7 - stable key shared with CRM (billing triggers are decided by key there).
  key: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  sequence: { type: Number, default: 0 },
  // Share of the project value (percent). Value INR = projectValue * weight / 100.
  weight: { type: Number, default: 0 },
  // Share of the project value invoiced when this milestone is approved (0 = not a billing trigger).
  billingPercent: { type: Number, default: 0 },
  dueDate: { type: Date, default: null },
  status: { type: String, enum: MILESTONE_STATUS, default: "Not Started" },

  evidence: { type: [EvidenceSchema], default: [] },
  submitNote: { type: String, default: "" },
  submittedBy: { type: Schema.Types.ObjectId, ref: "employees", default: null },
  submittedAt: { type: Date, default: null },

  reviewNote: { type: String, default: "" },
  reviewedBy: { type: Schema.Types.ObjectId, ref: "employees", default: null },
  reviewedAt: { type: Date, default: null },
  reworkCount: { type: Number, default: 0 },

  approvedBy: { type: Schema.Types.ObjectId, ref: "employees", default: null },
  approvedAt: { type: Date, default: null },

  // Push of an approval to the CRM (outbox): none -> pending -> synced | failed
  crmSyncStatus: { type: String, enum: CRM_SYNC_STATUS, default: "none" },
  crmSyncedAt: { type: Date, default: null },
  crmSyncAttempts: { type: Number, default: 0 },
  crmSyncError: { type: String, default: "" },

  history: {
    type: [
      {
        _id: false,
        action: String,
        status: String,
        by: { type: Schema.Types.ObjectId, ref: "employees" },
        at: { type: Date, default: Date.now },
        note: { type: String, default: "" },
      },
    ],
    default: [],
  },
  ...commonSchema(),
});

ProjectMilestoneSchema.index({ project_id: 1, isDeleted: 1, sequence: 1 });
ProjectMilestoneSchema.index({ companyId: 1, project_id: 1, key: 1 });

module.exports = mongoose.model("projectmilestones", ProjectMilestoneSchema);
module.exports.MILESTONE_STATUS = MILESTONE_STATUS;
