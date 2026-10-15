let express = require("express");
var Router = express.Router();
var projectTabSetting = require("../../controller/projectTabsSetting");
const { requirePermission } = require("../../helpers/permissionGuard");

Router.post("/add/tabs", requirePermission(["settings_manage"]), projectTabSetting.addDefaultProjectTabs); // for master data...

Router.get("/get/:projectId", projectTabSetting.getProjectTabsSetting);
Router.post("/add-edit", requirePermission(["settings_edit"]), projectTabSetting.addEditProjectTabsSetting);

module.exports = Router;
