const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { commonSchema } = require("../helpers/common");

const SUBMISSION_STATUS = ["Draft", "Submitted", "Approved", "Rejected"];

const ProjectTimesheetSubmissionSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: "companies" },
  employee_id: { type: Schema.Types.ObjectId, ref: "employees", required: true },
  project_id: { type: Schema.Types.ObjectId, ref: "projects", required: true },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  status: { type: String, enum: SUBMISSION_STATUS, default: "Draft" },
  // Snapshot of logged time (minutes) when the sheet was submitted.
  submittedMinutes: { type: Number, default: 0 },
  note: { type: String, default: "" },
  submittedAt: { type: Date, default: null },
  reviewedBy: { type: Schema.Types.ObjectId, ref: "employees", default: null },
  reviewedAt: { type: Date, default: null },
  reviewNote: { type: String, default: "" },
  ...commonSchema(),
});

ProjectTimesheetSubmissionSchema.index({ companyId: 1, project_id: 1, employee_id: 1, periodStart: 1, periodEnd: 1 });
ProjectTimesheetSubmissionSchema.index({ companyId: 1, status: 1, periodStart: -1 });

module.exports = mongoose.model("projecttimesheetsubmissions", ProjectTimesheetSubmissionSchema);
module.exports.SUBMISSION_STATUS = SUBMISSION_STATUS;
