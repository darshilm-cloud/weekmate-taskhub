const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { commonSchema } = require("../helpers/common");

const ProjectSchema = new mongoose.Schema({
  companyId: { type: Schema.Types.ObjectId, ref: "companies" },
  title: {
    type: String,
    required: false,
  },
  projectId: {
    type: String,
    default: "",
  },
  color: {
    type: String,
    // required: true,
    default: "",
  },
  descriptions: {
    type: String,
    default: "",
  },
  technology: {
    type: [{ type: Schema.Types.ObjectId, ref: "projecttechs" }],
    default: [],
  },
  project_type: {
    type: Schema.Types.ObjectId,
    ref: "projecttypes",
    default: null,
  },
  project_status: {
    type: Schema.Types.ObjectId,
    ref: "projectstatus",
    default: null,
  },
  manager: {
    type: Schema.Types.ObjectId,
    ref: "employees",
    default: null,
    required: false,
  },
  // Team Manager: may submit milestones for this project even without the project_edit role permission (set by the Hub on create).
  team_manager: {
    type: Schema.Types.ObjectId,
    ref: "employees",
    default: null,
  },
  acc_manager: {
    type: Schema.Types.ObjectId,
    ref: "employees",
    default: null,
  },
  assignees: {
    type: [{ type: Schema.Types.ObjectId, ref: "employees" }],
    default: [],
  },
  pms_clients: {
    type: [{ type: Schema.Types.ObjectId, ref: "pmsclients" }],
    default: [],
  },
  workFlow: {
    type: Schema.Types.ObjectId,
    ref: "projectworkflows",
    default: null,
    required: false,
  },
  estimatedHours: {
    type: String,
    default: "",
    // required: true,
  },
  isBillable: {
    type: Boolean,
    default: false,
  },
  isBugsEnabled: {
    type: Boolean,
    default: false,
  },
  start_date: { type: Date, default: null },
  end_date: { type: Date, default: null },
  recurringType: { 
    type: String, 
    default: ""
  },
  custom_fields: {
    type: Schema.Types.Mixed,
    default: {},
  },
  // Cross-product link (CRM / Workforce Hub): PRJ-YYYY-NNN, unique per company.
  externalRef: { type: String, default: null },
  projectValue: { type: Number, default: 0 },
  ...commonSchema(),
});

// projectCode (externalRef) is unique per company among live projects that carry one.
ProjectSchema.index(
  { companyId: 1, externalRef: 1 },
  {
    unique: true,
    partialFilterExpression: { externalRef: { $type: "string" }, isDeleted: false },
  }
);

ProjectSchema.index({ companyId: 1, isDeleted: 1, _id: -1 });
ProjectSchema.index({ companyId: 1, isDeleted: 1, manager: 1 });
ProjectSchema.index({ companyId: 1, isDeleted: 1, acc_manager: 1 });
ProjectSchema.index({ companyId: 1, isDeleted: 1, project_status: 1 });
ProjectSchema.index({ companyId: 1, isDeleted: 1, technology: 1 });
ProjectSchema.index({ companyId: 1, isDeleted: 1, project_type: 1 });
ProjectSchema.index({ companyId: 1, isDeleted: 1, assignees: 1 });
ProjectSchema.index({ companyId: 1, isDeleted: 1, pms_clients: 1 });

// [perf-indexes] query-driven indexes for list/aggregation endpoints
ProjectSchema.index({ companyId: 1, isDeleted: 1, createdBy: 1 });
ProjectSchema.index({ companyId: 1, isDeleted: 1, title: 1 });

module.exports = mongoose.model("projects", ProjectSchema);
