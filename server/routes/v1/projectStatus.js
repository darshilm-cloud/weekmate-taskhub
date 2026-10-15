let express = require("express");
var Router = express.Router();
var projectStatus = require("../../controller/projectStatus");
const { requirePermission } = require("../../helpers/permissionGuard");

Router.post("/add", requirePermission(["settings_add"]), projectStatus.addProjectStatus);
Router.post("/get", projectStatus.getProjectStatus);
Router.put("/update/:id", requirePermission(["settings_edit"]), projectStatus.updateProjectStatus);
Router.delete("/delete/:id", requirePermission(["settings_delete"]), projectStatus.deleteProjectStatus);

module.exports = Router;
