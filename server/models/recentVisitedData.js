const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { commonSchema } = require("../helpers/common");

const RecentVisitedDataSchema = new mongoose.Schema({
  dataFor: {
    type: String,
    enum: [
      "project",
      "list",
      "task",
      "bug",
      "discussion",
      "note",
      "fileFolder",
      "file",
    ],
    require: true,
    default: "project",
  },
  project_id: {
    type: Schema.Types.ObjectId,
    ref: "projects",
    required: true,
  },
  main_task_id: {
    type: Schema.Types.ObjectId,
    ref: "projectmaintasks",
    default: null,
  },
  task_id: {
    type: Schema.Types.ObjectId,
    ref: "projecttasks",
    default: null,
  },
  bug_id: {
    type: Schema.Types.ObjectId,
    ref: "projecttaskbugs",
    default: null,
  },
  discussion_id: {
    type: Schema.Types.ObjectId,
    ref: "discussionstopics",
    default: null,
  },
  note_id: {
    type: Schema.Types.ObjectId,
    ref: "notes_pms",
    default: null,
  },
  folder_id: {
    type: Schema.Types.ObjectId,
    ref: "filefolders",
    default: null,
  },
  file_id: {
    type: Schema.Types.ObjectId,
    ref: "fileuploads",
    default: null,
  },
  visited_count: {
    type: Number,
    default: 0,
  },
  ...commonSchema(),
});

module.exports = mongoose.model("recent_visited_data", RecentVisitedDataSchema);
