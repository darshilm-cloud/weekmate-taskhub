const mongoose = require("mongoose");
const { utcDefault } = require("../configs");
const Schema = mongoose.Schema;

const RolePermissionsSchema = new mongoose.Schema({
  companyId: { type: Schema.Types.ObjectId, ref: "companies" },
  pms_role_id: {
    type: Schema.Types.ObjectId,
    ref: "pms_roles",
    required: true,
  },
  resource_id: {
    type: Schema.Types.ObjectId,
    ref: "resource",
    required: true,
  },
  createdBy: { type: Schema.Types.ObjectId, ref: "employees", required: true },
  createdAt: { type: Date, default: utcDefault },
  updatedBy: { type: Schema.Types.ObjectId, ref: "employees", required: true },
  updatedAt: { type: Date, default: utcDefault },
  deletedBy: { type: Schema.Types.ObjectId, ref: "employees" },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
});

// [perf-indexes] permission lookup runs on every API response
RolePermissionsSchema.index({ companyId: 1, pms_role_id: 1, isDeleted: 1 });

module.exports = mongoose.model("role_permissions", RolePermissionsSchema);
