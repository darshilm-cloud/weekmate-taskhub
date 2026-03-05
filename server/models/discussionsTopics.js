const mongoose = require("mongoose");
const { commonSchema } = require("../helpers/common");
const Schema = mongoose.Schema;

const DiscussionsTopics = new Schema({
  title: {
    type: String,
    required: true,
  },
  project_id: { type: Schema.Types.ObjectId, ref: "projects", default: null },
  status: {
    type: String,
    enum: ["active", "archived"],
    default: "active",
  },
  descriptions: {
    type: String,
    default: "",
  },
  subscribers: {
    type: [{ type: Schema.Types.ObjectId, ref: "employees" }],
    default: [],
  },
  pms_clients: {
    type: [{ type: Schema.Types.ObjectId, ref: "pmsclients" }],
    default: [],
  },
  isPinToTop: { type: Boolean, default: false },
  isPrivate: { type: Boolean, default: false },
  isBookMark: { type: Boolean, default: false },
  ...commonSchema(),
});

module.exports = mongoose.model("discussionstopics", DiscussionsTopics);
