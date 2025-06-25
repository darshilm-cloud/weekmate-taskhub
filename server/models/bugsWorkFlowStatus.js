const mongoose = require("mongoose");
const { utcDefault } = require("../configs");
const Schema = mongoose.Schema;

const BugsWorkFlowStatusSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    required: true,
  },
  sequence: {
    type: Number,
    required: true,
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

module.exports = mongoose.model("bugsworkflowstatus", BugsWorkFlowStatusSchema);
