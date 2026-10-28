let express = require("express");
var Router = express.Router();
var mailSettings = require("../../controller/mailSettings");
const { requirePermission } = require("../../helpers/permissionGuard");

// Router.post("/add", mailSettings.addmailSettings);
Router.put("/edit", requirePermission(["settings_edit"]), mailSettings.editmailSettings);
Router.get("/get", mailSettings.mailSettingsDetails);

// Email Preferences - each user manages their own, so no extra permission.
Router.get("/my-preferences", mailSettings.getMyEmailPreferences);
Router.put("/my-preferences", mailSettings.updateMyEmailPreferences);

module.exports = Router;
