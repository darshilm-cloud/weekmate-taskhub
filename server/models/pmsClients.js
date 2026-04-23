const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const configs = require("../configs");
const crypto = require("crypto");

const PMSClientsSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: "companies" },
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  full_name: { type: String, required: true },
  client_img: { type: String, default: "" },
  email: { type: String, required: true },
  phone_number: { type: String, default: "" },
  address: { type: Schema.Types.Mixed },
  password: { type: String, required: true },
  plain_password: { type: String, required: true },
  pms_role_id: {
    type: Schema.Types.ObjectId,
    ref: "pms_roles",
    required: true,
  },
  shift: {
    type: String,
    enum: [
      "Aus Shift",
      "Early Log",
      "Early Shift",
      "General Shift",
      "Part time",
      "Part time 1",
      "US Telecaller",
      "WordPress Shift",
      "US Shift",
      "UK Shift",
    ],
    default: "General Shift",
  },
  gender: { type: String, default: "" },
  createdBy: { type: Schema.Types.ObjectId, ref: "employees" },
  updatedBy: { type: Schema.Types.ObjectId, ref: "employees" },
  deletedBy: { type: Schema.Types.ObjectId, ref: "employees" },
  createdAt: { type: Date, default: configs.utcDefault },
  updatedAt: { type: Date, default: configs.utcDefault },
  deletedAt: { type: Date, default: null },
  isDeleted: { type: Boolean, default: false },
  isSoftDeleted: { type: Boolean, default: false },
  isActivate: { type: Boolean, default: true },
  resetCode: { type: String },
  company_name: { type: String, default: "" },
  extra_details: { type: String, default: "" },
});

PMSClientsSchema.pre("save", function (next) {
  var user = this;

  if (typeof user?.password !== "undefined" && user?.password !== "") {
    if (!user?.isModified("password")) {
      return next();
    }
    const hash = crypto.createHash("md5").update(user.password).digest("hex");
    user.password = hash;
    next();
  } else {
    next();
  }
});

PMSClientsSchema.methods.comparePassword = function (candidatePassword, cb) {
  const encryptedInputPassword = crypto
    .createHash("md5")
    .update(candidatePassword)
    .digest("hex");
  cb(null, encryptedInputPassword === this.password);
};

PMSClientsSchema.index({ companyId: 1, email: 1 });

module.exports = mongoose.model("pmsclients", PMSClientsSchema);
