let express = require("express");
var Router = express.Router();
var mailSettings = require("../../controller/mailSettings");

// Router.post("/add", mailSettings.addmailSettings);
Router.put("/edit", mailSettings.editmailSettings);
Router.get("/get", mailSettings.mailSettingsDetails);

module.exports = Router;
