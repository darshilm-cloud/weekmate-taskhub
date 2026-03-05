const mongoose = require("mongoose");
const { utcDefault } = require("../configs");
const Schema = mongoose.Schema;

const ProjectTimeSheetSchema = new mongoose.Schema({
  project_id: {
    type: Schema.Types.ObjectId,
    ref: "projects",
    required: true,
  },
  // main_task_id: {
  //   type: Schema.Types.ObjectId,
  //   ref: "projectmaintasks",
  //   required: true,
  // },
  title: {
    type: String,
    required: true,
  },
  hours: {
    type: String,
  },
  minutes: {
    type: String,
  },
  status: {
    type: String,
    enum: ["active", "archived"],
    default: "active",
  },
  isDefault: { type: Boolean, default: false },
  isBookmark: { type: Boolean, default: false },
  isPrivate: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, ref: "employees", required: true },
  createdAt: { type: Date, default: utcDefault },
  updatedBy: { type: Schema.Types.ObjectId, ref: "employees", required: true },
  updatedAt: { type: Date, default: utcDefault },
  deletedBy: { type: Schema.Types.ObjectId, ref: "employees" },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
});

module.exports = mongoose.model("projecttimesheets", ProjectTimeSheetSchema);
