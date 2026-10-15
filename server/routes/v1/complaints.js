let express = require("express");
var Router = express.Router();
var complaint = require("../../controller/complaints");
const { requirePermission } = require("../../helpers/permissionGuard");

Router.post("/add", requirePermission(["feedback_add"]), complaint.addComplaint);
Router.post("/get", complaint.getComplaint);
Router.put("/update/:id", requirePermission(["feedback_edit"]), complaint.updateComplaint);
Router.delete("/delete/:id", requirePermission(["feedback_delete"]), complaint.deleteComplaint);

module.exports = Router;
