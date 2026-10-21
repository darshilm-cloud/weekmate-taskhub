const express = require("express");
const router = express.Router();
const SmtpController = require("../../controller/verifyAndSaveSmtp");
const { requirePermission } = require("../../helpers/permissionGuard");

// POST /verifyAndSaveSMTP
router.post("/verifyAndSaveSMTP", requirePermission(["settings_edit"]), SmtpController.configureSmtp);

// GET /getSmtpConfig
router.get("/getSmtpConfig", SmtpController.getSmtpConfig);

// GET /verifySmtp - live check of the saved settings
router.get("/verifySmtp", SmtpController.verifySmtp);

module.exports = router;
