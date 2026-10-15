let express = require("express");
var Router = express.Router();
var reviews = require("../../controller/reviews");
const { requirePermission } = require("../../helpers/permissionGuard");

Router.post("/add", requirePermission(["feedback_add"]), reviews.addReview);
Router.post("/get", reviews.getReview);
Router.put("/update/:id", requirePermission(["feedback_edit"]), reviews.updateReview);
Router.delete("/delete/:id", requirePermission(["feedback_delete"]), reviews.deleteReview);

module.exports = Router;
