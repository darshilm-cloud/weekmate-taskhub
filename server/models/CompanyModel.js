const mongoose = require("mongoose");

const CompanySchema = new mongoose.Schema(
  {
    companyName: {
      type: String
    },
    companyEmail: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    companyLogoUrl: {
      type: String
    },
    companyFavIcoUrl: {
      type: String
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    plan: {
      type: String,
      enum: ["free", "basic", "premium", "enterprise"],
      default: "free"
    },
    maxUsers: {
      type: Number,
      default: 200
    },
    fileUploadSize: {
      type: Number,
      default: 1 * 1024 // 10 MB, stored in KB
    }
  },
  {
    timestamps: true
  }
);

CompanySchema.index({ companyName: 1 });
CompanySchema.index({ companyEmail: 1 });
CompanySchema.index({ isActive: 1 });
CompanySchema.index({ isDeleted: 1 });

module.exports = mongoose.model("companies", CompanySchema);
