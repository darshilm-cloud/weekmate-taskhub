let express = require("express");
var Router = express.Router();
var quarterlymailSettings = require("../../controller/quarterlyMails");
const { requirePermission } = require("../../helpers/permissionGuard");

Router.post("/add", requirePermission(["settings_manage"]), quarterlymailSettings.mailsToQuarterHours);
Router.put("/edit", requirePermission(["settings_manage"]), quarterlymailSettings.updateSentMails);
Router.get("/get", quarterlymailSettings.getQuarterlyMails);

module.exports = Router;
