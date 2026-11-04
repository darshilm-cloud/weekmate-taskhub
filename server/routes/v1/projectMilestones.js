let express = require("express");
var Router = express.Router();
var milestones = require("../../controller/projectMilestones");
const { requirePermission } = require("../../helpers/permissionGuard");

// Read: any signed-in user of the company (tenant scoping is inside the controller).
Router.post("/get", milestones.getMilestones);
Router.post("/add", requirePermission(["project_edit", "projects_manage"]), milestones.addMilestone);
Router.put("/update/:id", requirePermission(["project_edit", "projects_manage"]), milestones.updateMilestone);
// Team Manager submits with evidence.
Router.post("/submit/:id", requirePermission(["project_edit", "projects_manage", "tasks_manage"], { allow: milestones.isProjectTeamManager }), milestones.submitMilestone);
// Project Manager (approver permission) approves or returns for rework.
Router.post("/approve/:id", requirePermission(["projects_manage"]), milestones.approveMilestone);
Router.post("/reject/:id", requirePermission(["projects_manage"]), milestones.rejectMilestone);
Router.post("/crm-resync/:id", requirePermission(["projects_manage"]), milestones.resyncMilestone);

module.exports = Router;
