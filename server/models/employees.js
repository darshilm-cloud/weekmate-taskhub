const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const configs = require("../configs");
const crypto = require("crypto");

const employeeSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: "companies" },
  first_name: { type: String },
  last_name: { type: String },
  full_name: { type: String },
  emp_img: { type: String, default: "" },
  email: { type: String },
  phone_number: { type: String },
  phone_number: { type: String, default: "" },
  password: { type: String },
  pms_role_id: { type: Schema.Types.ObjectId, ref: "pms_roles", default: null },
  createdBy: { type: Schema.Types.ObjectId, ref: "employees" },
  updatedBy: { type: Schema.Types.ObjectId, ref: "employees" },
  deletedBy: { type: Schema.Types.ObjectId, ref: "employees" },
  createdAt: { type: Date, default: configs.utcDefault },
  updatedAt: { type: Date, default: configs.utcDefault },
  loginActivity: {
    type: [Date],
    default: []
  },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  isSoftDeleted: { type: Boolean, default: false },
  isActivate: { type: Boolean, default: true },
  isAdmin: { type: Boolean, default: false },
  resetCode: { type: String }
});

employeeSchema.pre("save", function (next) {
  var user = this;
  user.email =
    user.email && user.email != "" ? user.email.toLowerCase() : undefined;

  if (typeof user.password !== "undefined" && user.password !== "") {
    if (!user.isModified("password")) {
      return next();
    }

    const hash = crypto.createHash("md5").update(user.password).digest("hex");
    user.password = hash;
    next();
  } else {
    next();
  }
});

employeeSchema.methods.comparePassword = function (candidatePassword, cb) {
  const encryptedInputPassword = crypto
    .createHash("md5")
    .update(candidatePassword)
    .digest("hex");
  cb(null, encryptedInputPassword === this.password);
};

employeeSchema.index({ email: 1 });
employeeSchema.index({ _id: 1, isActivate: 1, isDeleted: 1 });
employeeSchema.index({ companyId: 1, isActivate: 1, isDeleted: 1 });

module.exports = mongoose.model("employees", employeeSchema);
