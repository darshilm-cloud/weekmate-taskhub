let express = require("express");
var Router = express.Router();
var Note = require("../../controller/notes");
var { verification } = require("../../middleware/verification")

Router.post("/add", Note.addNotes);
Router.post("/get", verification, Note.getNotes);
Router.put("/update/:id", Note.updateNotes);
Router.put("/update/bookmark/:id", Note.updateNotesbookmark);
Router.delete("/delete/:id", Note.deleteNotes);

module.exports = Router;
