let express = require("express");
var Router = express.Router();
var complaintStatus = require("../../controller/complaints_status");

Router.post("/add", complaintStatus.addComplaintStatus);
Router.post("/get", complaintStatus.getComplaintStatus);
Router.put("/update/:id", complaintStatus.updateComplaintStatus);
Router.delete("/delete/:id", complaintStatus.deleteComplaintStatus);

module.exports = Router;
