let express = require("express");
var Router = express.Router();
var projectWorkFlow = require("../../controller/workFlowStatus");

Router.post("/add", projectWorkFlow.addProjectWorkFlowStatus);
Router.get("/get/:workFlowId", projectWorkFlow.getProjectWorkFlowStatus);
Router.put("/update/:id", projectWorkFlow.updateProjectWorkFlowStatus);
Router.delete("/delete/:id", projectWorkFlow.deleteProjectWorkFlowStatus);

module.exports = Router;
