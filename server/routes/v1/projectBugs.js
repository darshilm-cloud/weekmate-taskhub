let express = require("express");
var Router = express.Router();
var projectBugs = require("../../controller/projectBugs");
var { fileMiddleware } = require("../../middleware/filesMiddleware");
var { verification } = require("../../middleware/verification")

Router.post("/add", projectBugs.addProjectsBugs);
Router.post("/details", projectBugs.getProjectsBugs); // single data
Router.put("/update/:id", projectBugs.updateProjectsBugs); // whole data
Router.delete("/delete/:id", projectBugs.deleteProjectsBugs);
Router.put("/update-status/:id", projectBugs.updateProjectsBugStatus);
Router.put("/update-workflow/:id", projectBugs.updateProjectsBugWorkflow);
Router.post("/get-all", verification, projectBugs.projectBugsDetailedData); // bugs workflow wise data (all data)
Router.post("/history", projectBugs.getHistory);
Router.post("/import", fileMiddleware, projectBugs.importBugsData);
Router.get("/repeatedbugsCSV/:id", fileMiddleware, projectBugs.exportRepeatedBugsCSV);


module.exports = Router;
