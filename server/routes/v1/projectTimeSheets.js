let express = require("express");
var Router = express.Router();
var project = require("../../controller/projectTimeSheets");
const { requirePermission } = require("../../helpers/permissionGuard");

Router.post("/add", requirePermission(["timesheet_add"]), project.addProjectsTimeSheet);
Router.post("/get", project.getProjectsTimeSheet);
Router.post("/getSummary/:id", project.getSummary);
Router.put("/update/:id", requirePermission(["timesheet_edit"]), project.updateProjectsTimeSheet);
Router.delete("/delete/:id", requirePermission(["timesheet_delete"]), project.deleteProjectsTimeSheet);

module.exports = Router;
