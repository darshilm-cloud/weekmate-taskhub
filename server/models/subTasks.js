const mongoose = require("mongoose");
const { utcDefault } = require("../configs");
const Schema = mongoose.Schema;

const SubTaskSchema = new mongoose.Schema({
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
  task_id: {
    type: Schema.Types.ObjectId,
    ref: "projecttasks",
    required: true,
  },
  descriptions: {
    type: String,
    default: "",
  },
  subTaskId: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["active", "archived"],
    default: "active",
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
  comments: {
    type: [
      {
        comment: String,
        createdBy: {
          type: Schema.Types.ObjectId,
          ref: "employees",
          default: null,
        },
        date: Date,
      },
    ],
    default: [],
  },
  createdBy: { type: Schema.Types.ObjectId, ref: "employees", required: true },
  createdAt: { type: Date, default: utcDefault },
  updatedBy: { type: Schema.Types.ObjectId, ref: "employees", required: true },
  updatedAt: { type: Date, default: utcDefault },
  deletedBy: { type: Schema.Types.ObjectId, ref: "employees" },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
});

module.exports = mongoose.model("projectsubtasks", SubTaskSchema);
