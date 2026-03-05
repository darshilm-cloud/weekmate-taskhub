const express = require("express");
const router = express.Router();
const {
  startTimer,
  stopTimer,
  getTaskTimerStatus,
  stopMultipleTimers,
} = require("../../controller/taskTimers");

// Start timer for a task
router.post("/start", startTimer);

// Stop current active timer
router.post("/stop", stopTimer);

// Stop timers for multiple users
router.post("/stop-multiple", stopMultipleTimers);

// Get timer status and history for a specific task
router.get("/task/:task_id", getTaskTimerStatus);

module.exports = router;