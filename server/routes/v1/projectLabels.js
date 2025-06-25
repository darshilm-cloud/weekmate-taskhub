let express = require("express");
var Router = express.Router();
var projectLabels = require("../../controller/projectLabels");

Router.post("/add", projectLabels.addProjectLabels);
Router.post("/get", projectLabels.getProjectLabels);
Router.put("/update/:id", projectLabels.updateProjectLabels);
Router.delete("/delete/:id", projectLabels.deleteProjectLabels);

module.exports = Router;
