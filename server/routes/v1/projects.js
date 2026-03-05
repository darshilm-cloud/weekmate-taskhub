let express = require("express");
var Router = express.Router();
var project = require("../../controller/projects");
var { verification } = require("../../middleware/verification");

Router.post("/add", project.addProjects);
Router.post("/get", verification, project.getProjects);
Router.put("/update/:id", project.updateProjects);
Router.delete("/delete/:id", project.deleteProjects);
Router.put("/archive-to-active/:id", project.archivedToActiveProject);
Router.get("/overview/:id", verification, project.getProjectOverviewData);
Router.post("/getprojectReports", project.getProjectsReports);
Router.post("/getprojectReportsCSV", project.reportsCSV);
Router.put("/star/update/:id", project.updateProjectStarred);
Router.put("/managePeople/:id", project.updateProjectsManagePeople);

module.exports = Router;
