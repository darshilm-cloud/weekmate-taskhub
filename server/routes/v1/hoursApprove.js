let express = require("express");
var Router = express.Router();
var approvehours = require("../../controller/hoursApprove");
const { requirePermission } = require("../../helpers/permissionGuard");


Router.post("/add", requirePermission(["timesheet_manage"]), approvehours.addApprovedHours);



module.exports = Router;
