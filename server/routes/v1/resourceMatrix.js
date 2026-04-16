let express = require("express");
var Router = express.Router();
var resourceMatrix = require("../../controller/resourcematrix");

Router.post("/getTaskHubMatrix", resourceMatrix.getTaskHubMatrix);

module.exports = Router;