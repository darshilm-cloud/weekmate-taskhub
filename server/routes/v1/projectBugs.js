let express = require("express");
var Router = express.Router();
var projectBugs = require("../../controller/projectBugs");
var { fileMiddleware } = require("../../middleware/filesMiddleware");
var { verification } = require("../../middleware/verification")
const { requirePermission } = require("../../helpers/permissionGuard");
const multer = require("multer");
const bugImport = require("../../controller/bugImport");

// Background bug import file: kept in memory, written to disk by the queue service
const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
}).single("attachment");

Router.post("/add", requirePermission(["bug_add"]), projectBugs.addProjectsBugs);
Router.post("/details", projectBugs.getProjectsBugs); // single data
Router.put("/update/:id", requirePermission(["bug_edit"]), projectBugs.updateProjectsBugs); // whole data
Router.delete("/delete/:id", requirePermission(["bug_delete"]), projectBugs.deleteProjectsBugs);
Router.put("/update-status/:id", requirePermission(["bug_edit"]), projectBugs.updateProjectsBugStatus);
Router.put("/update-workflow/:id", requirePermission(["bug_edit"]), projectBugs.updateProjectsBugWorkflow);
Router.post("/get-all", verification, projectBugs.projectBugsDetailedData); // bugs workflow wise data (all data)
Router.post("/history", projectBugs.getHistory);
Router.post("/import", requirePermission(["bug_add"]), fileMiddleware, projectBugs.importBugsData);

// ── Background bug import (BullMQ) with history, cancel and undo ──────────────
Router.post("/import-bg", requirePermission(["bug_add"]), importUpload, bugImport.startImport);
Router.get("/import-history", bugImport.getImportHistory);
Router.post("/import-cancel/:jobId", requirePermission(["bug_add"]), bugImport.cancelImport);
Router.post("/import-undo/:jobId", requirePermission(["bug_add"]), bugImport.undoImport);
Router.get("/import-error-csv/:jobId", bugImport.downloadErrorCsv);
Router.get("/repeatedbugsCSV/:id", fileMiddleware, projectBugs.exportRepeatedBugsCSV);


module.exports = Router;
