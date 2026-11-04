let express = require("express");
var Router = express.Router();
var submissions = require("../../controller/projectTimesheetSubmissions");
const { requirePermission } = require("../../helpers/permissionGuard");

// Project-wise timesheet approvals per { employee, project, periodStart, periodEnd }.
Router.post("/submit", requirePermission(["timesheet_add", "timesheet_manage"]), submissions.submit);
Router.post("/approve", requirePermission(["timesheet_manage"]), submissions.approve);
Router.post("/reject", requirePermission(["timesheet_manage"]), submissions.reject);
Router.post("/list", submissions.list);

module.exports = Router;
