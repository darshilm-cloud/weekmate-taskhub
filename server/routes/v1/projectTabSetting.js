let express = require("express");
var Router = express.Router();
var projectTabSetting = require("../../controller/projectTabsSetting");

Router.post("/add/tabs", projectTabSetting.addDefaultProjectTabs); // for master data...

Router.get("/get/:projectId", projectTabSetting.getProjectTabsSetting);
Router.post("/add-edit", projectTabSetting.addEditProjectTabsSetting);

module.exports = Router;
