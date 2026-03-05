const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const configs = require("../configs");

const EmpoyeeInOutSchema = new Schema({
  employee_id: { type: Schema.Types.ObjectId, ref: "employees" },
  inTime: { type: String, default: "" },
  outTime: { type: String, default: "" },
  PMSTime: { type: String, default: "" },
  workedTime: { type: String, default: "" },
  WFH_tracker_time: { type: String, default: "" },
  on_duty: {
    time: { type: String, default: "" },
    regularization_type: { type: String, default: "" },
    // default: null,
  },
  record_type: {
    type: String,
    enum: [
      "Leave",
      "Weekoff",
      "Holiday",
      "Working Day",
      "First-Half",
      "Second-Half",
      "Flexy-Leave",
      "Optional Holiday",
      "Part-Day-WFH",
      "WFH"
    ],
    default: "Working Day",
  },
  leave_type: {
    type: String,
    // enum: ['', 'Leave', 'LWP', 'Birthday Leave', 'Paternity Leave', 'Maternity Leave', "Flexy-Leave", 'First-Half', 'Second-Half', 'Compoff Leave', 'First & Second Half'],
    default: "",
  },
  regularized: {
    status: {
      type: String,
      enum: ["false", "approved", "rejected", "pending"],
      default: "false",
    },
    reason: {
      type: String,
      enum: [
        "Forget To Sign In",
        "Working From Home(Temp)",
        "Was On Training",
        "System/Network Is Down",
        "Could Not Sign In",
        "Travel On Duty",
        "",
      ],
      default: "",
    },
    dayType: {
      type: String,
      enum: ["Full Day", "First Half", "Second Half", ""],
      default: "",
    },
    appliedDate: { type: Date, default: null },
    LateIn: {
      type: Boolean,
      default: false,
    },
    EarlyOut: {
      type: Boolean,
      default: false,
    },
    approveDate:{type: Date, default: null }
  },
  createdBy: { type: Schema.Types.ObjectId, ref: "users" },
  updatedBy: { type: Schema.Types.ObjectId, ref: "users" },
  deletedBy: { type: Schema.Types.ObjectId, ref: "users" },
  updated_At: { type: Date, default: configs.utcDefault },
  created_At: { type: Date, default: configs.utcDefault },
  isDeleted: { type: Boolean, default: false },
});

module.exports = mongoose.model("employeeInOutTimes", EmpoyeeInOutSchema);
