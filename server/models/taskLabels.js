const mongoose = require("mongoose");
const { utcDefault } = require("../configs");
const Schema = mongoose.Schema;

const TaskLabelsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    required: true,
  },
  // If project id = null, labels added for all the projects
  project_id: { type: Schema.Types.ObjectId, ref: "projects", default: null },
  createdBy: { type: Schema.Types.ObjectId, ref: "employees", required: true },
  createdAt: { type: Date, default: utcDefault },
  updatedBy: { type: Schema.Types.ObjectId, ref: "employees", required: true },
  updatedAt: { type: Date, default: utcDefault },
  deletedBy: { type: Schema.Types.ObjectId, ref: "employees" },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
});

module.exports = mongoose.model("tasklabels", TaskLabelsSchema);
