let express = require("express");
var Router = express.Router();
var taskController = require("../../controller/tasks");
var { fileMiddleware } = require("../../middleware/filesMiddleware");
const { verification } = require("../../middleware/verification");

Router.post("/add", taskController.addProjectsTask);
Router.post("/get", verification, taskController.getProjectsTask);
Router.put("/update/:id", taskController.updateProjectsTask); // whole data
Router.delete("/delete/:id", taskController.deleteProjectsTask);
Router.put("/update-status/:id", taskController.updateProjectsTaskStatus);
Router.put("/update-workflow/:id", taskController.updateProjectsTaskWorkflow);
Router.put("/props/update/:id", taskController.updateProjectsTaskProps); // With history manage ...
Router.post("/getHistory", taskController.getHistory);
Router.get("/project-wise/:projectId", taskController.getProjectsWiseTask);
Router.post("/task-wiseBugs", verification, taskController.taskwiseBugsDetailedData);
Router.post("/addProjectsTaskCopy", taskController.addProjectsTaskCopy); // copy of old data
Router.post("/import", fileMiddleware, taskController.importTasksData);
Router.post(
  "/getOverviewData",
  verification,
  taskController.getProjectsTaskOverview
);

Router.post("/update-multiple-status", taskController.updateMultipleTaskStatus);
Router.post("/delete-multiple", taskController.deleteMultipleTask);



module.exports = Router;
