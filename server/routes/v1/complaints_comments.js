let express = require("express");
var Router = express.Router();
var complaintComments = require("../../controller/complaints_comments");
const { requirePermission } = require("../../helpers/permissionGuard");

Router.post("/add", requirePermission(["feedback_view"]), complaintComments.addComplaintComments);
Router.get("/get/:complaintID", complaintComments.getComplaintComments);
Router.put("/update/:id", requirePermission(["feedback_view"]), complaintComments.updateComplaintComments);
Router.delete("/delete/:id", requirePermission(["feedback_view"]), complaintComments.deleteComplaintComments);

module.exports = Router;
