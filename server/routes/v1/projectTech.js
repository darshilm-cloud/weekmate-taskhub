let express = require("express");
var Router = express.Router();
var projectTech = require("../../controller/projectTech");
const { requirePermission } = require("../../helpers/permissionGuard");

Router.post("/addProjectTech", requirePermission(["settings_add"]), projectTech.addProjectTech);
Router.post("/getProjectTech", projectTech.getProjectTech);
Router.post("/updateProjectTech", requirePermission(["settings_edit"]), projectTech.updateProjectTech);
Router.post("/deleteProjectTech", requirePermission(["settings_delete"]), projectTech.deleteProjectTech);

module.exports = Router;
