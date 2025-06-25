const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { commonSchema } = require("../helpers/common");

const TaskUpdateHistorySchema = new mongoose.Schema({
  project_id: {
    type: Schema.Types.ObjectId,
    ref: "projects",
    required: true,
  },
  main_task_id: {
    type: Schema.Types.ObjectId,
    ref: "projectmaintasks",
    default: null,
  },
  task_id: {
    type: Schema.Types.ObjectId,
    ref: "projecttasks",
    default: null,
  },
  bug_id: {
    type: Schema.Types.ObjectId,
    ref: "projecttaskbugs",
    default: null,
  },
  subtask_id: {
    type: Schema.Types.ObjectId,
    ref: "projectsubtasks",
    default: null,
  },
  updated_key: {
    type: String,
    required: true,
  },
  pervious_value: {
    type: Schema.Types.Mixed,
    default: null,
  },
  new_value: {
    type: Schema.Types.Mixed,
    default: null,
  },
  ...commonSchema(),
});

module.exports = mongoose.model("taskupdatehistory", TaskUpdateHistorySchema);
