let express = require("express");
var Router = express.Router();
var mailSettings = require("../../controller/mailSettings");
const { requirePermission } = require("../../helpers/permissionGuard");

// Router.post("/add", mailSettings.addmailSettings);
Router.put("/edit", requirePermission(["settings_edit"]), mailSettings.editmailSettings);
Router.get("/get", mailSettings.mailSettingsDetails);

module.exports = Router;
