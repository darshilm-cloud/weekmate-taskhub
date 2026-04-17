let express = require("express");
var Router = express.Router();
var projectWorkFlow = require("../../controller/workFlowStatus");

Router.post("/add", projectWorkFlow.addProjectWorkFlowStatus);
Router.get("/list", projectWorkFlow.listProjectWorkFlowStages);
Router.get("/get/:workFlowId", projectWorkFlow.getProjectWorkFlowStatus);
Router.put("/update/:id", projectWorkFlow.updateProjectWorkFlowStatus);
Router.put("/reorder", projectWorkFlow.reorderProjectWorkFlowStatus);
Router.delete("/delete/:id", projectWorkFlow.deleteProjectWorkFlowStatus);

module.exports = Router;
