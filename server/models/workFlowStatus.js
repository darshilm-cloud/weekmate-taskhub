const mongoose = require("mongoose");
const { utcDefault } = require("../configs");
const Schema = mongoose.Schema;

const WorkFlowStatusSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  workflow_id: {
    type: Schema.Types.ObjectId,
    ref: "projectworkflows",
    required: true,
  },
  companyId: { type: Schema.Types.ObjectId, ref: "companies" },
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

// [perf-indexes] query-driven indexes for list/aggregation endpoints
WorkFlowStatusSchema.index({ workflow_id: 1, isDeleted: 1, sequence: 1 });
WorkFlowStatusSchema.index({ title: 1, isDeleted: 1 });

module.exports = mongoose.model("workflowstatus", WorkFlowStatusSchema);
