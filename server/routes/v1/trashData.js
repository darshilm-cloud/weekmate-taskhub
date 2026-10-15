let express = require("express");
var Router = express.Router();
var trashData = require("../../controller/trashData");
const { requirePermission } = require("../../helpers/permissionGuard");

Router.post("/get/projects", trashData.getTrashProjects);
Router.post("/get/discussion", trashData.getTrashDiscussion);
Router.post("/get/tasks", trashData.getTrashTasks);
Router.post("/get/bugs", trashData.getTrashBugs);
Router.post("/get/notes", trashData.getTrashNotes);
Router.post("/get/logged-time", trashData.getTrashLoggedHours);
Router.post("/delete", requirePermission(["settings_delete"]), trashData.deleteData);
Router.post("/restore", requirePermission(["settings_edit"]), trashData.restoreData);

module.exports = Router;
