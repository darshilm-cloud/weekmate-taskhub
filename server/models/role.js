const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const configs = require("../configs");

const roleSchema = new mongoose.Schema({
  role_name: { type: String, required: true },
  role_type: { type: String, required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "users" },
  created_At: { type: Date, default: configs.utcDefault },
  updatedBy: { type: Schema.Types.ObjectId, ref: "users" },
  updated_At: { type: Date, default: configs.utcDefault },
  deletedBy: { type: Schema.Types.ObjectId, ref: "users" },
  isDeleted: { type: Boolean, default: false },
});

module.exports = mongoose.model("roles", roleSchema);
