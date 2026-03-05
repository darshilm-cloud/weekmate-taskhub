const mongoose = require("mongoose");
const configs = require("../configs");
const Schema = mongoose.Schema;

const EmpDepartmentSchema = new mongoose.Schema({
  companyId: { type: Schema.Types.ObjectId, ref: "companies" },
  org_id: { type: Schema.Types.ObjectId, ref: "org", required: true },
  department_name: { type: String, required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "employees", required: true },
  createdAt: { type: Date, default: configs.utcDefault },
  updatedBy: { type: Schema.Types.ObjectId, ref: "employees", required: true },
  updatedAt: { type: Date, default: configs.utcDefault },
  deletedBy: { type: Schema.Types.ObjectId, ref: "employees" },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
});

module.exports = mongoose.model("empdepartments", EmpDepartmentSchema);
