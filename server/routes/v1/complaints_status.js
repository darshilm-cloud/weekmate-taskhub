let express = require("express");
var Router = express.Router();
var complaintStatus = require("../../controller/complaints_status");
const { requirePermission } = require("../../helpers/permissionGuard");

Router.post("/add", requirePermission(["feedback_edit"]), complaintStatus.addComplaintStatus);
Router.post("/get", complaintStatus.getComplaintStatus);
Router.put("/update/:id", requirePermission(["feedback_edit"]), complaintStatus.updateComplaintStatus);
Router.delete("/delete/:id", requirePermission(["feedback_edit"]), complaintStatus.deleteComplaintStatus);

module.exports = Router;
