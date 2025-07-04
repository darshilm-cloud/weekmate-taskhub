const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { utcDefault } = require("../configs");

const quarterlyhourmails = new mongoose.Schema({
  companyId: { type: Schema.Types.ObjectId, ref: "companies", default: null },
  mailids: {
    type: [{ type: String }],
    default: []
  },
  maildata: { type: Object },
  isSent: { type: Boolean, default: false },
  createdAt: { type: Date, default: utcDefault }
});

module.exports = mongoose.model("quarterlyhourmails", quarterlyhourmails);
