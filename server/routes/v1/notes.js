let express = require("express");
var Router = express.Router();
var Note = require("../../controller/notes");
var { verification } = require("../../middleware/verification")
const { requirePermission } = require("../../helpers/permissionGuard");

Router.post("/add", requirePermission(["notes_add"]), Note.addNotes);
Router.post("/get", verification, Note.getNotes);
Router.put("/update/:id", requirePermission(["notes_edit"]), Note.updateNotes);
Router.put("/update/bookmark/:id", requirePermission(["notes_view"]), Note.updateNotesbookmark);
Router.delete("/delete/:id", requirePermission(["notes_delete"]), Note.deleteNotes);

module.exports = Router;
