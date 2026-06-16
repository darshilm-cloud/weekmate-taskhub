let express = require("express");
var Router = express.Router();
var PMSUsers = require("../../controller/pmsClients");
var { fileMiddleware } = require("../../middleware/filesMiddleware");
const clientImport = require("../../controller/clientImport");
const multer = require("multer");

// Memory storage for import file (converted to CSV on disk inside the service)
const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
}).single("attachment");

Router.post("/add", PMSUsers.addClients);
Router.post("/get", PMSUsers.getClients);
Router.put("/update/:id", PMSUsers.updateClientData);
Router.put("/update/status/:id", PMSUsers.updateClientStatus);
Router.delete("/delete/:id", PMSUsers.deleteClientData);
Router.get(
  "/get-project-client/:projectId",
  PMSUsers.getProjectsWiseAssignedClient
);

// ── Client bulk import (background, BullMQ) ───────────────────────────────────
Router.post("/upload-csv", importUpload, clientImport.startImport);
Router.get("/import-history", clientImport.getAllImportHistory);
Router.get("/import-progress/:jobId", clientImport.getImportProgress);
Router.post("/import-cancel/:jobId", clientImport.cancelImport);
Router.post("/import-undo/:jobId", clientImport.undoImport);
Router.get("/import-error-csv/:jobId", clientImport.downloadErrorCsv);

module.exports = Router;
