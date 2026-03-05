// models/smtpConfig.js
const mongoose = require("mongoose");

const smtpConfigSchema = new mongoose.Schema(
  {
    smtpHost: { type: String, required: true },
    smtpPort: { type: Number, required: true },
    smtpEmail: { type: String, required: true },
    smtpPassword: { type: String, required: true },
    smtpSecure: { type: Boolean, required: true }, // true for port 465, false for 587/25
    fromName: { type: String, required: true },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "companies",
      required: true,
      unique: true // Each company has only one SMTP config
    }
  },
  { timestamps: true }
);
smtpConfigSchema.index(
  { companyId: 1 },
  {
    partialFilterExpression: { isDeleted: false }
  }
);

module.exports = mongoose.model("smtp_configs", smtpConfigSchema);
