let express = require("express");
var Router = express.Router();
var trashData = require("../../controller/trashData");

Router.post("/get/projects", trashData.getTrashProjects);
Router.post("/get/discussion", trashData.getTrashDiscussion);
Router.post("/get/tasks", trashData.getTrashTasks);
Router.post("/get/bugs", trashData.getTrashBugs);
Router.post("/get/notes", trashData.getTrashNotes);
Router.post("/get/logged-time", trashData.getTrashLoggedHours);
Router.post("/delete", trashData.deleteData);
Router.post("/restore", trashData.restoreData);

module.exports = Router;
