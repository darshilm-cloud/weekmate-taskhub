let express = require("express");
var Router = express.Router();
var NoteBook = require("../../controller/noteBook");

Router.post("/add", NoteBook.addNoteBook);
Router.post("/get", NoteBook.getNoteBook);
Router.post("/getDetails", NoteBook.getNoteBookdetails);
Router.put("/update/:id", NoteBook.updateNoteBook);
Router.delete("/delete/:id", NoteBook.deleteNoteBook);
// Router.put("/update/pin/:id", NoteBook.updateNoteBookPin);
Router.put("/update/bookmark/:id", NoteBook.updateNoteBookbookmark);

module.exports = Router;
