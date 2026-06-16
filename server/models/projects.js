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
  ...commonSchema(),
});

ProjectSchema.index({ companyId: 1, isDeleted: 1, _id: -1 });
ProjectSchema.index({ companyId: 1, isDeleted: 1, manager: 1 });
ProjectSchema.index({ companyId: 1, isDeleted: 1, acc_manager: 1 });
ProjectSchema.index({ companyId: 1, isDeleted: 1, project_status: 1 });
ProjectSchema.index({ companyId: 1, isDeleted: 1, technology: 1 });
ProjectSchema.index({ companyId: 1, isDeleted: 1, project_type: 1 });
ProjectSchema.index({ companyId: 1, isDeleted: 1, assignees: 1 });
ProjectSchema.index({ companyId: 1, isDeleted: 1, pms_clients: 1 });

module.exports = mongoose.model("projects", ProjectSchema);
