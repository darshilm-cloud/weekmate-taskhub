let express = require("express");
var Router = express.Router();
const AdminManage = require("../../controller/AdminManage");
const employeeImport = require("../../controller/employeeImport");
const multer = require("multer");
const { requirePermission } = require("../../helpers/permissionGuard");

// Memory storage for import file (converted to CSV on disk inside the service)
const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
}).single("attachment");

Router.post("/getUsersList", AdminManage.getUsersList);
Router.post("/addUser", requirePermission(["people_add"]), AdminManage.addUser);

// ── Employee bulk import (background, BullMQ) ─────────────────────────────────
Router.post("/admin/users/upload-csv", requirePermission(["people_add"]), importUpload, employeeImport.startImport);
Router.get("/admin/users/import-history", employeeImport.getAllImportHistory);
Router.get("/admin/users/import-progress/:jobId", employeeImport.getImportProgress);
Router.post("/admin/users/import-cancel/:jobId", requirePermission(["people_add"]), employeeImport.cancelImport);
Router.post("/admin/users/import-undo/:jobId", requirePermission(["people_add"]), employeeImport.undoImport);
Router.get("/admin/users/import-error-csv/:jobId", employeeImport.downloadErrorCsv);

Router.put("/editUser/:userId", requirePermission(["people_edit"]), AdminManage.editUser);
Router.delete("/deleteUser/:userId", requirePermission(["people_delete"]), AdminManage.deleteUser);

module.exports = Router;
