const mongoose = require("mongoose");
const { utcDefault } = require("../configs");
const Schema = mongoose.Schema;

const projectWorkFlowSchema = new mongoose.Schema({
  project_workflow: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["draft", "active"],
    default: "active",
  },
  isDefault: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, ref: "employees", required: true },
  createdAt: { type: Date, default: utcDefault },
  updatedBy: { type: Schema.Types.ObjectId, ref: "employees", required: true },
  updatedAt: { type: Date, default: utcDefault },
  deletedBy: { type: Schema.Types.ObjectId, ref: "employees" },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
});

module.exports = mongoose.model("projectworkflows", projectWorkFlowSchema);
