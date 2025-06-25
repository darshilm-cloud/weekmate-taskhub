let express = require("express");
var Router = express.Router();
var approvehours = require("../../controller/hoursApprove");


Router.post("/add", approvehours.addApprovedHours);



module.exports = Router;
