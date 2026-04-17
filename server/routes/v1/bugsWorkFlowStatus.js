let express = require("express");
var Router = express.Router();
var bugsWorkFlowStatus = require("../../controller/bugsWorkFlowStatus");

Router.post("/add", bugsWorkFlowStatus.addBugsWorkFlowStatus);
Router.get("/get", bugsWorkFlowStatus.getBugsWorkFlowStatus);
Router.put("/update/:id", bugsWorkFlowStatus.updateBugsWorkFlowStatus);
Router.put("/reorder", bugsWorkFlowStatus.reorderBugsWorkFlowStatus);
Router.delete("/delete/:id", bugsWorkFlowStatus.deleteBugsWorkFlowStatus);

module.exports = Router;
