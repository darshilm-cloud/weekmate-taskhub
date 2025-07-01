const express = require("express");
const router = express.Router();
const SmtpController = require("../../controller/verifyAndSaveSmtp");

// POST /verifyAndSaveSMTP
router.post("/verifyAndSaveSMTP", SmtpController.configureSmtp);

// GET /getSmtpConfig
router.get("/getSmtpConfig", SmtpController.getSmtpConfig);

module.exports = router;
