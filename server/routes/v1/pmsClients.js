let express = require("express");
var Router = express.Router();
var PMSUsers = require("../../controller/pmsClients");
var { fileMiddleware } = require("../../middleware/filesMiddleware");
const clientImport = require("../../controller/clientImport");
const multer = require("multer");
const { requirePermission } = require("../../helpers/permissionGuard");

// Memory storage for import file (converted to CSV on disk inside the service)
const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
}).single("attachment");

Router.post("/add", requirePermission(["people_add"]), PMSUsers.addClients);
Router.post("/get", PMSUsers.getClients);
Router.put("/update/:id", requirePermission(["people_edit"]), PMSUsers.updateClientData);
Router.put("/update/status/:id", requirePermission(["people_edit"]), PMSUsers.updateClientStatus);
Router.delete("/delete/:id", requirePermission(["people_delete"]), PMSUsers.deleteClientData);
Router.get(
  "/get-project-client/:projectId",
  PMSUsers.getProjectsWiseAssignedClient
);

// ── Client bulk import (background, BullMQ) ───────────────────────────────────
Router.post("/upload-csv", requirePermission(["people_add"]), importUpload, clientImport.startImport);
Router.get("/import-history", clientImport.getAllImportHistory);
Router.get("/import-progress/:jobId", clientImport.getImportProgress);
Router.post("/import-cancel/:jobId", requirePermission(["people_add"]), clientImport.cancelImport);
Router.post("/import-undo/:jobId", requirePermission(["people_add"]), clientImport.undoImport);
Router.get("/import-error-csv/:jobId", clientImport.downloadErrorCsv);

module.exports = Router;
