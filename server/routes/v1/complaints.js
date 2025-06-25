let express = require("express");
var Router = express.Router();
var complaint = require("../../controller/complaints");

Router.post("/add", complaint.addComplaint);
Router.post("/get", complaint.getComplaint);
Router.put("/update/:id", complaint.updateComplaint);
Router.delete("/delete/:id", complaint.deleteComplaint);

module.exports = Router;
