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
  logged_seconds: {
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

// [perf-indexes] query-driven indexes for list/aggregation endpoints
TaskHoursLogsSchema.index({ isDeleted: 1, project_id: 1, timesheet_id: 1, subtask_id: 1, logged_date: -1 });
TaskHoursLogsSchema.index({ isDeleted: 1, employee_id: 1, project_id: 1 });
TaskHoursLogsSchema.index({ isDeleted: 1, project_id: 1, task_id: 1, employee_id: 1 });
TaskHoursLogsSchema.index({ employee_id: 1, isDeleted: 1, logged_date: -1 });
TaskHoursLogsSchema.index({ createdBy: 1, isDeleted: 1, logged_date: -1 });
TaskHoursLogsSchema.index({ isDeleted: 1, logged_date: 1 });
TaskHoursLogsSchema.index({ task_id: 1, isDeleted: 1 });
TaskHoursLogsSchema.index({ bug_id: 1, isDeleted: 1 });
// covers the per-project logged-hours $group in getProjectsReports (index-only)
TaskHoursLogsSchema.index({
  isDeleted: 1,
  project_id: 1,
  logged_status: 1,
  logged_hours: 1,
  logged_minutes: 1,
  logged_seconds: 1
});

module.exports = mongoose.model("projecttaskhourlogs", TaskHoursLogsSchema);
