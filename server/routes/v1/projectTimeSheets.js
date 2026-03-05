let express = require("express");
var Router = express.Router();
var project = require("../../controller/projectTimeSheets");

Router.post("/add", project.addProjectsTimeSheet);
Router.post("/get", project.getProjectsTimeSheet);
Router.post("/getSummary/:id", project.getSummary);
Router.put("/update/:id", project.updateProjectsTimeSheet);
Router.delete("/delete/:id", project.deleteProjectsTimeSheet);

module.exports = Router;
