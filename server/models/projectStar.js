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

module.exports = mongoose.model("star_project", StarProject);
