const mongoose = require("mongoose");

const CompanySchema = new mongoose.Schema(
  {
    companyName: {
      type: String
    },
    companyLogoUrl: {
      type: String,
      default: ""
    },
    companyFavIcoUrl: {
      type: String,
      default: ""
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
    },
    companyDomain: {
      type: String,
      default: null
    },
    fileSize: {
      type: Number,
      default: 0 //stored in bytes
    },
    dataSize: {
      type: Number,
      default: 0 //stored in bytes
    }
  },
  {
    timestamps: true
  }
);

CompanySchema.index({ companyName: 1 });
CompanySchema.index({ companyDomain: 1 });
CompanySchema.index({ isActive: 1 });
CompanySchema.index({ isDeleted: 1 });

module.exports = mongoose.model("companies", CompanySchema);
