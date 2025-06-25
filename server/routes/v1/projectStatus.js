let express = require("express");
var Router = express.Router();
var projectStatus = require("../../controller/projectStatus");

Router.post("/add", projectStatus.addProjectStatus);
Router.post("/get", projectStatus.getProjectStatus);
Router.put("/update/:id", projectStatus.updateProjectStatus);
Router.delete("/delete/:id", projectStatus.deleteProjectStatus);

module.exports = Router;
