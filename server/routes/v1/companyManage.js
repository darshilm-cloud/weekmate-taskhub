const express = require("express");
const router = express.Router();
const CompanyManage = require("../../controller/CompanyManage");

// POST /getCompanyList
router.post("/getCompanyList", CompanyManage.getCompanyList);

router.get("/getCompanyDetails", CompanyManage.getCompanyDetails);

// POST /addCompany
router.post("/addCompany", CompanyManage.addCompany);

// PUT /editCompany/:companyId
router.put("/editCompany/:companyId", CompanyManage.editCompany);

// DELETE /deleteCompany/:companyId
router.delete("/deleteCompany/:companyId", CompanyManage.deleteCompany);

// PUT /file-upload-size
router.put("/file-upload-size", CompanyManage.updateCompanyFileUploadSize);

module.exports = router;
