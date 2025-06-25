let express = require("express");
var Router = express.Router();
var recentVisitedData = require("../../controller/recentVisitedData");

Router.post("/add", recentVisitedData.addRecentVisitedData);
Router.post("/get", recentVisitedData.getRecentVisitedData);

module.exports = Router;
