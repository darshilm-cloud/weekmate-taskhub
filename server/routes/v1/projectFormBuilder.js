let express = require("express");
var Router = express.Router();
var projectFormBuilder = require("../../controller/projectFormBuilder");

Router.get("/get", projectFormBuilder.getProjectFormConfig);
Router.post("/add-edit", projectFormBuilder.addEditProjectFormConfig);

module.exports = Router;
