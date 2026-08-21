const mongoose = require("mongoose");
const passwords = require("../helpers/password");
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
    passwords
      .hash(user.password)
      .then((hash) => {
        user.password = hash;
        next();
      })
      .catch(next);
  } else {
    next();
  }
});

PMSClientsSchema.methods.comparePassword = function (candidatePassword, cb) {
  // Same migration path as employees: verify legacy formats, then upgrade the
  // stored hash to bcrypt on a successful legacy login.
  passwords
    .verify(candidatePassword, this.password)
    .then(async ({ ok, needsRehash }) => {
      if (ok && needsRehash) {
        try {
          const upgraded = await passwords.hash(candidatePassword);
          await this.constructor.updateOne({ _id: this._id }, { password: upgraded });
          this.password = upgraded;
        } catch (err) {
          console.log("password rehash failed:", err?.message);
        }
      }
      cb(null, ok);
    })
    .catch((err) => cb(err));
};

PMSClientsSchema.index({ companyId: 1, email: 1 });

module.exports = mongoose.model("pmsclients", PMSClientsSchema);
