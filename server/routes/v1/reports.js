const express = require("express");
const router = express.Router();
const reports = require("../../controller/reports");

router.post("/user-activity-summary", reports.getUserActivitySummary);
router.post("/employee-usage", reports.getEmployeeUsage);

module.exports = router;
