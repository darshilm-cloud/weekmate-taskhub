const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { commonSchema } = require("../helpers/common");

const ProjectMainTaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  project_id: {
    type: Schema.Types.ObjectId,
    ref: "projects",
    required: true,
  },
  // workflow_id: {
  //   type: Schema.Types.ObjectId,
  //   ref: "projectworkflows",
  //   default: null,
  // },
  subscribers: {
    type: [{ type: Schema.Types.ObjectId, ref: "employees" }],
    default: [],
  },
  pms_clients: {
    type: [{ type: Schema.Types.ObjectId, ref: "pmsclients" }],
    default: [],
  },
  subscriber_stages: {
    type: [
      {
        subscriber_id: {
          type: Schema.Types.ObjectId,
          ref: "employees",
          default: null,
        },
        stages: {
          type: Schema.Types.ObjectId,
          ref: "workflowstatus",
          default: null,
        },
      },
    ],
    default: [],
  },
  status: {
    type: String,
    enum: ["active", "archived"],
    default: "active",
  },
  task_status: {
    type: Schema.Types.ObjectId,
    ref: "workflowstatus", // todo,done,in-progress
    default: null,
  },
  task_status_history: {
    type: [
      {
        task_status: {
          type: Schema.Types.ObjectId,
          ref: "workflowstatus", // todo,done,in-progress
          default: null,
        },
        updatedBy: { type: Schema.Types.ObjectId, ref: "employees" },
        updatedAt: { type: Date },
      },
    ],
    default: [],
  },
  isPrivateList: { type: Boolean, default: false },
  isBookmark: { type: Boolean, default: false },
  isDisplayInGantt: { type: Boolean, default: false },
  ...commonSchema(),
});

module.exports = mongoose.model("projectmaintasks", ProjectMainTaskSchema);
