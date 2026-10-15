let express = require("express");
var Router = express.Router();
var subTask = require("../../controller/subTasks");
const { requirePermission } = require("../../helpers/permissionGuard");

Router.post("/add", requirePermission(["task_add"]), subTask.addProjectsSubTask);
Router.post("/get", subTask.getProjectsSubTask);
Router.put("/update/:id", requirePermission(["task_edit"]), subTask.updateProjectsSubTask);
Router.delete("/delete/:id", requirePermission(["task_delete"]), subTask.deleteProjectsSubTask);
Router.put("/update-status/:id", requirePermission(["task_edit"]), subTask.updateProjectsSubTaskStatus);

Router.put("/props/update/:id", requirePermission(["task_edit"]), subTask.updateProjectsSubTaskProps);
Router.post("/get-update-history", subTask.getHistory);
module.exports = Router;
