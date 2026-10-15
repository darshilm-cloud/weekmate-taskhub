let express = require("express");
var Router = express.Router();
var taskFormBuilder = require("../../controller/taskFormBuilder");
const { requirePermission } = require("../../helpers/permissionGuard");

Router.get("/get", taskFormBuilder.getTaskFormConfig);
Router.post("/add-edit", requirePermission(["settings_edit"]), taskFormBuilder.addEditTaskFormConfig);

module.exports = Router;
