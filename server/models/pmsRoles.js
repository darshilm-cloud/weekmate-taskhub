const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const configs = require("../configs");

const PMSRoleSchema = new mongoose.Schema({
  role_name: { type: String, required: true, unique: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "employees" },
  createdAt: { type: Date, default: configs.utcDefault },
  updatedBy: { type: Schema.Types.ObjectId, ref: "employees" },
  updatedAt: { type: Date, default: configs.utcDefault },
  deletedBy: { type: Schema.Types.ObjectId, ref: "employees" },
  deletedAt: { type: Date, default: configs.utcDefault },
  isDeleted: { type: Boolean, default: false },
});

module.exports = mongoose.model("pms_roles", PMSRoleSchema);
