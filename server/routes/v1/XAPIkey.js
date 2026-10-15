let express = require("express");
var Router = express.Router();
var xapikeys = require("../../controller/XAPIkey");
const { requirePermission } = require("../../helpers/permissionGuard");

Router.post("/add", requirePermission(["settings_manage"]), xapikeys.addXAPIkey);
Router.put("/edit", requirePermission(["settings_manage"]), xapikeys.updateXAPIkey);
Router.get("/get", xapikeys.getXAPIkey);

module.exports = Router;
