let express = require("express");
var Router = express.Router();
var NoteBook = require("../../controller/noteBook");
const { requirePermission } = require("../../helpers/permissionGuard");

Router.post("/add", requirePermission(["notes_add"]), NoteBook.addNoteBook);
Router.post("/get", NoteBook.getNoteBook);
Router.post("/getDetails", NoteBook.getNoteBookdetails);
Router.put("/update/:id", requirePermission(["notes_edit"]), NoteBook.updateNoteBook);
Router.delete("/delete/:id", requirePermission(["notes_delete"]), NoteBook.deleteNoteBook);
// Router.put("/update/pin/:id", NoteBook.updateNoteBookPin);
Router.put("/update/bookmark/:id", NoteBook.updateNoteBookbookmark);

module.exports = Router;
