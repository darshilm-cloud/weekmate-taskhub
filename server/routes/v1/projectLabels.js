let express = require("express");
var Router = express.Router();
var projectLabels = require("../../controller/projectLabels");
const { requirePermission } = require("../../helpers/permissionGuard");

Router.post("/add", requirePermission(["settings_add"]), projectLabels.addProjectLabels);
Router.post("/get", projectLabels.getProjectLabels);
Router.put("/update/:id", requirePermission(["settings_edit"]), projectLabels.updateProjectLabels);
Router.delete("/delete/:id", requirePermission(["settings_delete"]), projectLabels.deleteProjectLabels);

module.exports = Router;
