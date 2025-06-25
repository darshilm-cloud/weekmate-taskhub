const mongoose = require("mongoose");
const { commonSchema } = require("../helpers/common");
const Schema = mongoose.Schema;

const TaskHoursLogsSchema = new mongoose.Schema({
  employee_id: {
    type: Schema.Types.ObjectId,
    ref: "employees",
  },
  project_id: {
    type: Schema.Types.ObjectId,
    ref: "projects",
  },
  // main_task_id: {
  //   type: Schema.Types.ObjectId,
  //   ref: "projectmaintasks",
  // },
  task_id: {
    type: Schema.Types.ObjectId,
    ref: "projecttasks",
    // required: true,
  },
  subtask_id: {
    type: Schema.Types.ObjectId,
    ref: "projectsubtasks",
    default: null,
  },
  timesheet_id: {
    type: Schema.Types.ObjectId,
    ref: "projecttimesheets",
  },
  bug_id: {
    type: Schema.Types.ObjectId,
    ref: "projecttaskbugs",
    default: null,
  },
  descriptions: {
    type: String,
    default: "",
  },
  logged_hours: {
    type: String,
    default: "00",
  },
  logged_minutes: {
    type: String,
    default: "00",
  },
  logged_date: { type: Date, required: true },
  isManuallyAdded: {
    type: Boolean,
    default: true,
  },
  logged_status: {
    // as of now not in use
    // billable , non billable
    type: String,
    enum: ["Billed", "Billable", "Non-billable", "Void"],
    default: "Void",
  },
  ...commonSchema(),
});

module.exports = mongoose.model("projecttaskhourlogs", TaskHoursLogsSchema);
