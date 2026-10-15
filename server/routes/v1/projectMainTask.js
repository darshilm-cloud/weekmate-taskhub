let express = require("express");
var Router = express.Router();
var mainTask = require("../../controller/projectMainTask");
var { verification } = require("../../middleware/verification")
const { requirePermission } = require("../../helpers/permissionGuard");

Router.post("/add", requirePermission(["task_add"]), mainTask.addProjectsMainTask);
Router.post("/get", verification, mainTask.getProjectsMainTask);
Router.put("/update/:id", requirePermission(["task_edit"]), mainTask.updateProjectsMainTask);
Router.delete("/delete/:id", requirePermission(["task_delete"]), mainTask.deleteProjectsMainTask);

Router.put("/update-status/:id", requirePermission(["task_edit"]), mainTask.updateProjectsMainTaskStatus);
Router.put("/update-bookmark/:id", mainTask.updateProjectsMainTaskBookmark);
// For dashboard task tab..
Router.post("/details", mainTask.projectMainTaskDetailsData);
Router.post("/exporttaskCSV", mainTask.csvDataexport);

Router.post("/create-a-copy", requirePermission(["task_add"]), mainTask.createACopyOfMainTask);


Router.post("/tasks/move", requirePermission(["task_edit"]), mainTask.moveTasksInOtherList);



module.exports = Router;
