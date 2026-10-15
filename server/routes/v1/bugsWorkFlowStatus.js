let express = require("express");
var Router = express.Router();
var bugsWorkFlowStatus = require("../../controller/bugsWorkFlowStatus");
const { requirePermission } = require("../../helpers/permissionGuard");

Router.post("/add", requirePermission(["bug_add", "settings_add"]), bugsWorkFlowStatus.addBugsWorkFlowStatus);
Router.get("/get", bugsWorkFlowStatus.getBugsWorkFlowStatus);
Router.put("/update/:id", requirePermission(["bug_edit", "settings_edit"]), bugsWorkFlowStatus.updateBugsWorkFlowStatus);
Router.put("/reorder", requirePermission(["bug_edit", "settings_edit"]), bugsWorkFlowStatus.reorderBugsWorkFlowStatus);
Router.delete("/delete/:id", requirePermission(["bug_delete", "settings_delete"]), bugsWorkFlowStatus.deleteBugsWorkFlowStatus);

module.exports = Router;
