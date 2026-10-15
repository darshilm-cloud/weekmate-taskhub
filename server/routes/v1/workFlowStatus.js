let express = require("express");
var Router = express.Router();
var projectWorkFlow = require("../../controller/workFlowStatus");
const { requirePermission } = require("../../helpers/permissionGuard");

Router.post("/add", requirePermission(["task_add", "settings_add"]), projectWorkFlow.addProjectWorkFlowStatus);
Router.get("/list", projectWorkFlow.listProjectWorkFlowStages);
Router.get("/get/:workFlowId", projectWorkFlow.getProjectWorkFlowStatus);
Router.put("/update/:id", requirePermission(["task_edit", "settings_edit"]), projectWorkFlow.updateProjectWorkFlowStatus);
Router.put("/reorder", requirePermission(["task_edit", "settings_edit"]), projectWorkFlow.reorderProjectWorkFlowStatus);
Router.delete("/delete/:id", requirePermission(["task_delete", "settings_delete"]), projectWorkFlow.deleteProjectWorkFlowStatus);

module.exports = Router;
