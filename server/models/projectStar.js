const mongoose = require("mongoose");
const { commonSchema } = require("../helpers/common");
const Schema = mongoose.Schema;

const StarProject = new Schema({
  isStarred: { type: Boolean, default: false },
  project_id: {
    type: Schema.Types.ObjectId,
    ref: "projects",
    required: true,
  },
  ...commonSchema(),
});

// [perf-indexes] query-driven indexes for list/aggregation endpoints
StarProject.index({ createdBy: 1, isDeleted: 1, project_id: 1 });

module.exports = mongoose.model("star_project", StarProject);
