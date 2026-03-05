let express = require("express");
var Router = express.Router();
var xapikeys = require("../../controller/XAPIkey");

Router.post("/add", xapikeys.addXAPIkey);
Router.put("/edit", xapikeys.updateXAPIkey);
Router.get("/get", xapikeys.getXAPIkey);

module.exports = Router;
