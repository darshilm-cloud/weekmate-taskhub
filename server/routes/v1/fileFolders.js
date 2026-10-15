let express = require("express");
var Router = express.Router();
var fileFolders = require("../../controller/fileFolders");
var { verification } = require("../../middleware/verification")
const { requirePermission } = require("../../helpers/permissionGuard");

Router.post("/add", requirePermission(["files_add"]), fileFolders.addFileFolders);
Router.post("/get", verification, fileFolders.getFileFolders);
Router.put("/update/:id", requirePermission(["files_edit"]), fileFolders.updateFileFolders);
Router.delete("/delete/:id", requirePermission(["files_delete"]), fileFolders.deleteFileFolders);
Router.put("/update-bookmark/:id", fileFolders.updateFileFoldersBookmark);

// Get all file of project...
Router.post("/getAll/files", fileFolders.getProjectAllFiles);
Router.get("/get/file/:fileId", fileFolders.getFileDetails);  // Get file details
Router.post("/upload/files", requirePermission(["files_add"]), fileFolders.projectFilesUploads);   // upload new files..
Router.post("/rename/files", requirePermission(["files_edit"]), fileFolders.projectFileRename);   // rename files..
Router.post(
  "/update/file/subscribers", requirePermission(["files_edit"]),
  fileFolders.projectFileUpdateSubscribers
);  
Router.delete("/delete/file/:id", requirePermission(["files_delete"]), fileFolders.projectFileDelete);   // delete files..


module.exports = Router;
