const mongoose = require("mongoose");
const { commonSchema } = require("../helpers/common");
const Schema = mongoose.Schema;

const DiscussionsTopicsDetails = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: "companies" },
  title: {
    type: String,
    // required: true,
  },
  project_id: { type: Schema.Types.ObjectId, ref: "projects", required: true },
  topic_id: {
    type: Schema.Types.ObjectId,
    ref: "discussionstopics",
    required: true,
  },
  taggedUsers: {
    type: [{ type: Schema.Types.ObjectId, ref: "employees" }],
    default: [],
  },
  // attachment: { type: String, default: "" },
  isDefault: { type: Boolean, default: false },
  ...commonSchema(),
});

// [perf-indexes] query-driven indexes for list/aggregation endpoints
DiscussionsTopicsDetails.index({ topic_id: 1, isDeleted: 1, createdAt: 1 });

module.exports = mongoose.model(
  "discussionstopicsdetails",
  DiscussionsTopicsDetails
);
