const mongoose = require("mongoose");
const { utcDefault } = require("../configs");
const Schema = mongoose.Schema;

const ProjectTabsSettings = new Schema({
  project_id: { type: Schema.Types.ObjectId, ref: "projects", required: true },
  tab_id: { type: Schema.Types.ObjectId, ref: "project_tabs", required: true },
  isEnable: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  createdBy: { type: Schema.Types.ObjectId, ref: "employees", required: true },
  createdAt: { type: Date, default: utcDefault },
  updatedBy: { type: Schema.Types.ObjectId, ref: "employees", required: true },
  updatedAt: { type: Date, default: utcDefault },
  deletedBy: { type: Schema.Types.ObjectId, ref: "employees" },
});

module.exports = mongoose.model("project_tabs_settings", ProjectTabsSettings);
