let express = require("express");
var Router = express.Router();
var projectFormBuilder = require("../../controller/projectFormBuilder");
const { requirePermission } = require("../../helpers/permissionGuard");

Router.get("/get", projectFormBuilder.getProjectFormConfig);
Router.post("/add-edit", requirePermission(["settings_edit"]), projectFormBuilder.addEditProjectFormConfig);

module.exports = Router;
