const mongoose = require("mongoose");
const { utcDefault } = require("../configs");

const quarterlyhourmails = new mongoose.Schema({
  mailids: {
    type: [{ type: String }],
    default: [],
  },
  maildata: { type: Object },
  isSent: { type: Boolean, default: false },
  createdAt: { type: Date, default: utcDefault },
});

module.exports = mongoose.model("quarterlyhourmails", quarterlyhourmails);
