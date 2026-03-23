let express = require("express");
var Router = express.Router();
var recentVisitedData = require("../../controller/recentVisitedData");

Router.post("/add", recentVisitedData.addRecentVisitedData);
Router.post("/get", recentVisitedData.getRecentVisitedData);
Router.post("/remove", recentVisitedData.removeRecentVisitedData);

module.exports = Router;
