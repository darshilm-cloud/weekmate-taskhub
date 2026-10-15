let express = require("express");
var Router = express.Router();
var appSetting = require("../../controller/appSetting");
const { requirePermission } = require("../../helpers/permissionGuard");

Router.get("/get", appSetting.getAppSetting);
Router.post("/add-edit", requirePermission(["settings_edit"]), appSetting.addEditAppSetting);

module.exports = Router;
