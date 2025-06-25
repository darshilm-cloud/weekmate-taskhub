let express = require("express");
var Router = express.Router();
var fileFolders = require("../../controller/fileFolders");
var { verification } = require("../../middleware/verification")

Router.post("/add", fileFolders.addFileFolders);
Router.post("/get", verification, fileFolders.getFileFolders);
Router.put("/update/:id", fileFolders.updateFileFolders);
Router.delete("/delete/:id", fileFolders.deleteFileFolders);
Router.put("/update-bookmark/:id", fileFolders.updateFileFoldersBookmark);

// Get all file of project...
Router.post("/getAll/files", fileFolders.getProjectAllFiles);
Router.get("/get/file/:fileId", fileFolders.getFileDetails);  // Get file details
Router.post("/upload/files", fileFolders.projectFilesUploads);   // upload new files..
Router.post("/rename/files", fileFolders.projectFileRename);   // rename files..
Router.post(
  "/update/file/subscribers",
  fileFolders.projectFileUpdateSubscribers
);  
Router.delete("/delete/file/:id", fileFolders.projectFileDelete);   // delete files..


module.exports = Router;
