let express = require("express");
var Router = express.Router();
var project = require("../../controller/projects");
var { verification } = require("../../middleware/verification");
const { requirePermission } = require("../../helpers/permissionGuard");

Router.post("/add", requirePermission(["project_add"]), project.addProjects);
Router.post("/get", verification, project.getProjects);
Router.put("/update/:id", requirePermission(["project_edit"]), project.updateProjects);
Router.delete("/delete/:id", requirePermission(["project_delete"]), project.deleteProjects);
Router.put("/archive-to-active/:id", requirePermission(["project_edit"]), project.archivedToActiveProject);
Router.get("/overview/:id", verification, project.getProjectOverviewData);
Router.post("/getprojectReports", project.getProjectsReports);
Router.post("/getprojectReportsCSV", project.reportsCSV);
Router.put("/star/update/:id", project.updateProjectStarred);
Router.put("/managePeople/:id", requirePermission(["project_edit", "projects_manage"]), project.updateProjectsManagePeople);

module.exports = Router;
