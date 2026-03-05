const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { commonSchema } = require("../helpers/common");

const TaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  project_id: {
    type: Schema.Types.ObjectId,
    ref: "projects",
    required: true,
  },
  main_task_id: {
    type: Schema.Types.ObjectId,
    ref: "projectmaintasks",
    required: true,
  },
  status: {
    type: String,
    enum: ["active", "archived"],
    default: "active",
  },
  descriptions: {
    type: String,
    default: "",
  },
  taskId: {
    type: String,
    required: true,
  },
  task_labels: {
    type: [
      {
        type: Schema.Types.ObjectId,
        ref: "tasklabels", // high ,low
      },
    ],
    default: [],
  },
  start_date: { type: Date, default: null },
  due_date: { type: Date, default: null },
  assignees: {
    type: [{ type: Schema.Types.ObjectId, ref: "employees" }],
    default: [],
  },
  pms_clients: {
    type: [{ type: Schema.Types.ObjectId, ref: "pmsclients" }],
    default: [],
  },
  estimated_hours: {
    type: String,
    default: "00",
  },
  estimated_minutes: {
    type: String,
    default: "00",
  },
  // attachments: {
  //   type: [{ type: String }],
  //   default: [],
  // },
  task_progress: {
    type: String,
    default: "0",
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
          required: true,
        },
        updatedBy: { type: Schema.Types.ObjectId, ref: "employees" },
        updatedAt: { type: Date },
      },
    ],
    default: [],
  },
  isImported: { type: Boolean, default: false },
  recurringType: { 
    type: String, 
    default: ""
  },
  // comments: {
  //   type: [
  //     {
  //       comment: String,
  //       attachment: String,
  //       createdBy: {
  //         type: Schema.Types.ObjectId,
  //         ref: "employees",
  //         default: null,
  //       },
  //       date: Date,
  //     },
  //   ],
  //   default: [],
  // },
  ...commonSchema(),
});

module.exports = mongoose.model("projecttasks", TaskSchema);
