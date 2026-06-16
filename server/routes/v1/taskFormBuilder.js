let express = require("express");
var Router = express.Router();
var taskFormBuilder = require("../../controller/taskFormBuilder");

Router.get("/get", taskFormBuilder.getTaskFormConfig);
Router.post("/add-edit", taskFormBuilder.addEditTaskFormConfig);

module.exports = Router;
