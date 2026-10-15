const express = require("express");
const router = express.Router();
const CompanyManage = require("../../controller/CompanyManage");
const { requirePermission, requireSuperAdmin } = require("../../helpers/permissionGuard");

// POST /getCompanyList
router.post("/getCompanyList", CompanyManage.getCompanyList);

router.get("/getCompanyDetails", CompanyManage.getCompanyDetails);

// POST /addCompany
router.post("/addCompany", requireSuperAdmin(), CompanyManage.addCompany);

// PUT /editCompany/:companyId
router.put("/editCompany/:companyId", requirePermission(["settings_edit"]), CompanyManage.editCompany);

// DELETE /deleteCompany/:companyId
router.delete("/deleteCompany/:companyId", requireSuperAdmin(), CompanyManage.deleteCompany);

// PUT /file-upload-size
router.put("/file-upload-size", requirePermission(["settings_edit"]), CompanyManage.updateCompanyFileUploadSize);

module.exports = router;
