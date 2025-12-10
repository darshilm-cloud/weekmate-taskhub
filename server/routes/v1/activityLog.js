const express = require("express");
const Router = express.Router();
const activityLogController = require("../../controller/activityLog");

// Get activity logs list with filters
Router.post(
  "/list",
  activityLogController.getActivityLogList
);

// Get activity log by ID with additional data
Router.get(
  "/:id",
  activityLogController.getActivityLogById
);

module.exports = Router;

