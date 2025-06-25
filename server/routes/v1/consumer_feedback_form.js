let express = require("express");
var Router = express.Router();
var feedbackForm = require("../../controller/consumer_feedback_form");

Router.post("/add", feedbackForm.addConsumerFeedBack);
Router.post("/get", feedbackForm.getConsumerFeedBack);

module.exports = Router;
