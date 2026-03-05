let express = require("express");
var Router = express.Router();
var projectTech = require("../../controller/projectTech");

Router.post("/addProjectTech", projectTech.addProjectTech);
Router.post("/getProjectTech", projectTech.getProjectTech);
Router.post("/updateProjectTech", projectTech.updateProjectTech);
Router.post("/deleteProjectTech", projectTech.deleteProjectTech);

module.exports = Router;
