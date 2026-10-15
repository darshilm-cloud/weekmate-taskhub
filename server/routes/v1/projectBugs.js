let express = require("express");
var Router = express.Router();
var projectBugs = require("../../controller/projectBugs");
var { fileMiddleware } = require("../../middleware/filesMiddleware");
var { verification } = require("../../middleware/verification")
const { requirePermission } = require("../../helpers/permissionGuard");

Router.post("/add", requirePermission(["bug_add"]), projectBugs.addProjectsBugs);
Router.post("/details", projectBugs.getProjectsBugs); // single data
Router.put("/update/:id", requirePermission(["bug_edit"]), projectBugs.updateProjectsBugs); // whole data
Router.delete("/delete/:id", requirePermission(["bug_delete"]), projectBugs.deleteProjectsBugs);
Router.put("/update-status/:id", requirePermission(["bug_edit"]), projectBugs.updateProjectsBugStatus);
Router.put("/update-workflow/:id", requirePermission(["bug_edit"]), projectBugs.updateProjectsBugWorkflow);
Router.post("/get-all", verification, projectBugs.projectBugsDetailedData); // bugs workflow wise data (all data)
Router.post("/history", projectBugs.getHistory);
Router.post("/import", requirePermission(["bug_add"]), fileMiddleware, projectBugs.importBugsData);
Router.get("/repeatedbugsCSV/:id", fileMiddleware, projectBugs.exportRepeatedBugsCSV);


module.exports = Router;
