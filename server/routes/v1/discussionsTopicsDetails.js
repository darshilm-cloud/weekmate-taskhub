let express = require("express");
var Router = express.Router();
var discussionsTopicsDetails = require("../../controller/discussionsTopicsDetails");
const { requirePermission } = require("../../helpers/permissionGuard");

Router.post("/add", requirePermission(["discussion_view"]), discussionsTopicsDetails.addDiscussionsTopicsDetails);
Router.post("/get", discussionsTopicsDetails.getDiscussionsTopicsDetails);
Router.put(
  "/update/:id",
  requirePermission(["discussion_view"]),
  discussionsTopicsDetails.updateDiscussionsTopicsDetails
);
Router.delete(
  "/delete/:id",
  requirePermission(["discussion_view"]),
  discussionsTopicsDetails.deleteDiscussionsTopicsDetails
);

module.exports = Router;
