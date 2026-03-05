const mongoose = require("mongoose");
const { utcDefault } = require("../configs");
const { array } = require("joi");
const { commonSchema } = require("../helpers/common");
const Schema = mongoose.Schema;

const Notes = new Schema({
  title: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    required: true,
  },
  subscribers: {
    type: [{ type: Schema.Types.ObjectId, ref: "employees" }],
  },
  pms_clients: {
    type: [{ type: Schema.Types.ObjectId, ref: "pmsclients" }],
    default: [],
  },
  noteBook_id: {
    type: Schema.Types.ObjectId,
    ref: "notebook",
    // required: true,
    default: null,
  },
  project_id: {
    type: Schema.Types.ObjectId,
    ref: "projects",
    required: true,
  },
  notesInfo: {
    type: String,
    default: "",
  },
  isBookmark: { type: Boolean, default: false },
  isPrivate: { type: Boolean, default: false },
  ...commonSchema(),
});

module.exports = mongoose.model("notes_pms", Notes);
