const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { commonSchema } = require("../helpers/common");

const ProjectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
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
    required: true,
  },
  project_status: {
    type: Schema.Types.ObjectId,
    ref: "projectstatus",
    default: null,
    required: true,
  },
  manager: {
    type: Schema.Types.ObjectId,
    ref: "employees",
    default: null,
    required: true,
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
    required: true,
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
  start_date: { type: Date, default: null },
  end_date: { type: Date, default: null },
  ...commonSchema(),
});

module.exports = mongoose.model("projects", ProjectSchema);
