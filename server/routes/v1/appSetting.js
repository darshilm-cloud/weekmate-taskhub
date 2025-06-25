let express = require("express");
var Router = express.Router();
var appSetting = require("../../controller/appSetting");

Router.get("/get", appSetting.getAppSetting);
Router.post("/add-edit", appSetting.addEditAppSetting);

module.exports = Router;
