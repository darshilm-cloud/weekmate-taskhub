let express = require("express");
var Router = express.Router();
var taskController = require("../../controller/tasks");
var { fileMiddleware } = require("../../middleware/filesMiddleware");
const { verification } = require("../../middleware/verification");
const { requirePermission } = require("../../helpers/permissionGuard");
const multer = require("multer");
const taskImport = require("../../controller/taskImport");

// Background task import file: kept in memory, written to disk by the queue service
const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
}).single("attachment");

Router.post("/add", requirePermission(["task_add"]), taskController.addProjectsTask);
Router.post("/get", verification, taskController.getProjectsTask);
Router.put("/update/:id", requirePermission(["task_edit"]), taskController.updateProjectsTask); // whole data
Router.delete("/delete/:id", requirePermission(["task_delete"]), taskController.deleteProjectsTask);
Router.put("/update-status/:id", requirePermission(["task_edit"]), taskController.updateProjectsTaskStatus);
Router.put("/update-workflow/:id", requirePermission(["task_edit"]), taskController.updateProjectsTaskWorkflow);
Router.put("/props/update/:id", requirePermission(["task_edit"]), taskController.updateProjectsTaskProps); // With history manage ...
Router.post("/getHistory", taskController.getHistory);
Router.get("/project-wise/:projectId", taskController.getProjectsWiseTask);
Router.post("/task-wiseBugs", verification, taskController.taskwiseBugsDetailedData);
Router.post("/addProjectsTaskCopy", requirePermission(["task_add"]), taskController.addProjectsTaskCopy); // copy of old data
Router.post("/import", requirePermission(["task_add"]), fileMiddleware, taskController.importTasksData);

// ── Background task import (BullMQ) with history, cancel and undo ─────────────
Router.post("/import-bg", requirePermission(["task_add"]), importUpload, taskImport.startImport);
Router.get("/import-history", taskImport.getImportHistory);
Router.post("/import-cancel/:jobId", requirePermission(["task_add"]), taskImport.cancelImport);
Router.post("/import-undo/:jobId", requirePermission(["task_add"]), taskImport.undoImport);
Router.get("/import-error-csv/:jobId", taskImport.downloadErrorCsv);
Router.post(
  "/getOverviewData",
  verification,
  taskController.getProjectsTaskOverview
);

Router.post("/update-multiple-status", requirePermission(["task_edit"]), taskController.updateMultipleTaskStatus);
Router.post("/delete-multiple", requirePermission(["task_delete"]), taskController.deleteMultipleTask);



module.exports = Router;
