const mongoose = require("mongoose");
const { utcDefault } = require("../configs");

const xpikey = new mongoose.Schema({
  api_key: {
    type: String,
    required: true,
  },
  key_for: {
    type: String,
    required: true
  },
  isDeleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: utcDefault },
});

module.exports = mongoose.model("xapikeys", xpikey);
