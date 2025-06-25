let express = require("express");
var Router = express.Router();
var discussionsTopics = require("../../controller/discussionsTopics");
var { verification } = require("../../middleware/verification")

Router.post("/add", discussionsTopics.addDiscussionsTopics);
Router.post("/get", verification, discussionsTopics.getDiscussionsTopics);
Router.put("/update/:id", discussionsTopics.updateDiscussionsTopics);
Router.delete("/delete/:id", discussionsTopics.deleteDiscussionsTopics);
Router.put(
  "/update-is-pin/:id",
  discussionsTopics.updateDiscussionsTopicPinToTop
);

module.exports = Router;
