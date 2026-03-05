let express = require("express");
var Router = express.Router();
var complaintComments = require("../../controller/complaints_comments");

Router.post("/add", complaintComments.addComplaintComments);
Router.get("/get/:complaintID", complaintComments.getComplaintComments);
Router.put("/update/:id", complaintComments.updateComplaintComments);
Router.delete("/delete/:id", complaintComments.deleteComplaintComments);

module.exports = Router;
