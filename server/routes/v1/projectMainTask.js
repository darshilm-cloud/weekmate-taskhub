let express = require("express");
var Router = express.Router();
var mainTask = require("../../controller/projectMainTask");
var { verification } = require("../../middleware/verification")

Router.post("/add", mainTask.addProjectsMainTask);
Router.post("/get", verification, mainTask.getProjectsMainTask);
Router.put("/update/:id", mainTask.updateProjectsMainTask);
Router.delete("/delete/:id", mainTask.deleteProjectsMainTask);

Router.put("/update-status/:id", mainTask.updateProjectsMainTaskStatus);
Router.put("/update-bookmark/:id", mainTask.updateProjectsMainTaskBookmark);
// For dashboard task tab..
Router.post("/details", mainTask.projectMainTaskDetailsData);
Router.post("/exporttaskCSV", mainTask.csvDataexport);

Router.post("/create-a-copy", mainTask.createACopyOfMainTask);


Router.post("/tasks/move", mainTask.moveTasksInOtherList);



module.exports = Router;
