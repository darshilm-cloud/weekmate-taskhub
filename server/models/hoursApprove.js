const mongoose = require("mongoose");
const { commonSchema } = require("../helpers/common");
const Schema = mongoose.Schema;

const ApprovedHoursLogsSchema = new mongoose.Schema({
  employee_id: {
    type: Schema.Types.ObjectId,
    ref: "employees",
  },
  approved_by: {
    type: Schema.Types.ObjectId,
    ref: "employees",
  },
  notes: {
    type: String,
    default: "",
  },
  approved_hours: {
    type: String,
    default: "00",
  },
  approved_minutes: {
    type: String,
    default: "00",
  },
  hours: {
    type: String,
    default: "00",
  },
  minutes: {
    type: String,
    default: "00",
  },
  month: {
    type: String,
  },
  year: {
    type: String,
  },

  ...commonSchema(),
});

// [perf-indexes] query-driven indexes for list/aggregation endpoints
ApprovedHoursLogsSchema.index({ employee_id: 1, month: 1, year: 1 });

module.exports = mongoose.model("approvedHours", ApprovedHoursLogsSchema);
