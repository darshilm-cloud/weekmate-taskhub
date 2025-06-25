let express = require("express");
var Router = express.Router();
var subTask = require("../../controller/subTasks");

Router.post("/add", subTask.addProjectsSubTask);
Router.post("/get", subTask.getProjectsSubTask);
Router.put("/update/:id", subTask.updateProjectsSubTask);
Router.delete("/delete/:id", subTask.deleteProjectsSubTask);
Router.put("/update-status/:id", subTask.updateProjectsSubTaskStatus);

Router.put("/props/update/:id", subTask.updateProjectsSubTaskProps);
Router.post("/get-update-history", subTask.getHistory);
module.exports = Router;
