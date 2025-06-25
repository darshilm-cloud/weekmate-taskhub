const mongoose = require("mongoose");
const { commonSchema } = require("../helpers/common");
const Schema = mongoose.Schema;

const ProjectTaskBugs = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  project_id: {
    type: Schema.Types.ObjectId,
    ref: "projects",
    required: true,
  },
  task_id: {
    type: Schema.Types.ObjectId,
    ref: "projecttasks",
    // required: true,
    default: null,
  },
  sub_task_id: {
    type: Schema.Types.ObjectId,
    ref: "projectsubtasks",
    default: null,
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
  bugId: {
    type: String,
    required: true,
  },
  bug_labels: {
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
  progress: {
    type: String,
    default: "0",
  },
  bug_status: {
    type: Schema.Types.ObjectId,
    ref: "bugsworkflowstatus", // todo,done,in-progress
    default: null,
  },
  bug_status_history: {
    type: [
      {
        bug_status: {
          type: Schema.Types.ObjectId,
          ref: "bugsworkflowstatus", // todo,done,in-progress
          required: true,
        },
        updatedBy: { type: Schema.Types.ObjectId, ref: "employees" },
        updatedAt: { type: Date },
      },
    ],
    default: [],
  },
  isImported: { type: Boolean, default: false },
  isRepeated: { type: Boolean, default: false },
  ...commonSchema(),
});

module.exports = mongoose.model("projecttaskbugs", ProjectTaskBugs);
