const mongoose = require("mongoose");

const MailToken = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "companies"
    },
    userID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users"
    },
    isActive: { type: Boolean, default: true }
  },
  {
    timestamps: true
  }
);

MailToken.index({ createdAt: 1 }, { expireAfterSeconds: 600 });

module.exports = mongoose.model("mail_token", MailToken);
