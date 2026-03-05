let express = require("express");
var Router = express.Router();
var quarterlymailSettings = require("../../controller/quarterlyMails");

Router.post("/add", quarterlymailSettings.mailsToQuarterHours);
Router.put("/edit", quarterlymailSettings.updateSentMails);
Router.get("/get", quarterlymailSettings.getQuarterlyMails);

module.exports = Router;
