const express = require("express");
const router = express.Router();
const CompanyRegController = require('../../controller/CompanyReg');

// POST /registerAdminAndCompany
router.post("/registerAdminAndCompany", CompanyRegController.registerAdminAndCompany);

// POST /verify-registration
router.post("/verify-registration", CompanyRegController.verifyAndCompleteRegistration);

// POST /resend-verification
// router.post("/resend-verification", CompanyRegController.resendVerificationEmail);

module.exports = router;
