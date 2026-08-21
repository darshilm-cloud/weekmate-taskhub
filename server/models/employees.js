const mongoose = require("mongoose");
const passwords = require("../helpers/password");
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

    // bcrypt, not MD5: salted and deliberately slow, so a leaked hash cannot be
    // reversed with a rainbow table.
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

employeeSchema.methods.comparePassword = function (candidatePassword, cb) {
  // Accepts bcrypt, plus the legacy MD5 and plaintext rows this table still
  // holds. On a successful legacy login the stored value is upgraded to bcrypt
  // in place, so accounts migrate as people sign in - no forced resets.
  passwords
    .verify(candidatePassword, this.password)
    .then(async ({ ok, needsRehash }) => {
      if (ok && needsRehash) {
        try {
          const upgraded = await passwords.hash(candidatePassword);
          // updateOne, not save(): save() would re-run the pre-save hook and
          // hash the already-hashed value a second time.
          await this.constructor.updateOne({ _id: this._id }, { password: upgraded });
          this.password = upgraded;
        } catch (err) {
          // An upgrade failure must not block a valid login.
          console.log("password rehash failed:", err?.message);
        }
      }
      cb(null, ok);
    })
    .catch((err) => cb(err));
};

employeeSchema.index({ email: 1 });
employeeSchema.index({ companyId: 1, email: 1 });
employeeSchema.index({ _id: 1, isActivate: 1, isDeleted: 1 });
employeeSchema.index({ companyId: 1, isActivate: 1, isDeleted: 1, isSoftDeleted: 1 });


module.exports = mongoose.model("employees", employeeSchema);
