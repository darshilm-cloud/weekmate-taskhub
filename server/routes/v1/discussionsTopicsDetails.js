let express = require("express");
var Router = express.Router();
var discussionsTopicsDetails = require("../../controller/discussionsTopicsDetails");

Router.post("/add", discussionsTopicsDetails.addDiscussionsTopicsDetails);
Router.post("/get", discussionsTopicsDetails.getDiscussionsTopicsDetails);
Router.put(
  "/update/:id",
  discussionsTopicsDetails.updateDiscussionsTopicsDetails
);
Router.delete(
  "/delete/:id",
  discussionsTopicsDetails.deleteDiscussionsTopicsDetails
);

module.exports = Router;
