const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const configs = require("../configs");

const SubDepartmentSchema = Schema({
  sub_department_name: { type: String },
  createdBy: { type: Schema.Types.ObjectId, ref: "employees" },
  updatedBy: { type: Schema.Types.ObjectId, ref: "employees" },
  deletedBy: { type: Schema.Types.ObjectId, ref: "employees" },
  createdAt: { type: Date, default: configs.utcDefault },
  updatedAt: { type: Date, default: configs.utcDefault },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
});

module.exports = mongoose.model("subdepartments", SubDepartmentSchema);
