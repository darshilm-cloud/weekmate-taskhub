const mongoose = require("mongoose");
const { utcDefault } = require("../configs");
const Schema = mongoose.Schema;

const AppSetting = new Schema({
  title: {
    type: String,
    required: true,
  },
  logo_mode: {
    type: String,
    required: true,
  },
  login_logo: {
    type: String,
    required: true,
  },
  header_logo: {
    type: String,
    required: true,
  },
  fav_icon: {
    type: String,
    required: true,
  },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  createdBy: { type: Schema.Types.ObjectId, ref: "employees", required: true },
  createdAt: { type: Date, default: utcDefault },
  updatedBy: { type: Schema.Types.ObjectId, ref: "employees", required: true },
  updatedAt: { type: Date, default: utcDefault },
  deletedBy: { type: Schema.Types.ObjectId, ref: "employees" },
});

module.exports = mongoose.model("pms_app_settings", AppSetting);
