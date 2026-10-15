let express = require("express");
var Router = express.Router();
var discussionsTopics = require("../../controller/discussionsTopics");
var { verification } = require("../../middleware/verification")
const { requirePermission } = require("../../helpers/permissionGuard");

Router.post("/add", requirePermission(["discussion_add"]), discussionsTopics.addDiscussionsTopics);
Router.post("/get", verification, discussionsTopics.getDiscussionsTopics);
Router.put("/update/:id", requirePermission(["discussion_edit"]), discussionsTopics.updateDiscussionsTopics);
Router.delete("/delete/:id", requirePermission(["discussion_delete"]), discussionsTopics.deleteDiscussionsTopics);
Router.put(
  "/update-is-pin/:id", requirePermission(["discussion_edit"]),
  discussionsTopics.updateDiscussionsTopicPinToTop
);

module.exports = Router;
