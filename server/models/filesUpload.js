const mongoose = require("mongoose");
const { commonSchema } = require("../helpers/common");
const Schema = mongoose.Schema;

const FileUploadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  file_type: {
    type: String,
    required: true,
  },
  path: {
    type: String,
    required: true,
  },
  file_section: {
    type: String,
  },
  project_id: {
    type: Schema.Types.ObjectId,
    ref: "projects",
    default: null,
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "companies"
  },
  folder_id: {
    type: Schema.Types.ObjectId,
    ref: "filefolders",
    default: null,
  },
  task_id: {
    type: Schema.Types.ObjectId,
    ref: "projecttasks",
    default: null,
  },
  sub_task_id: {
    type: Schema.Types.ObjectId,
    ref: "projectsubtasks",
    default: null,
  },
  comments_id: {
    type: Schema.Types.ObjectId,
    ref: "Comments",
    default: null,
  },
  discussion_topic_id: {
    type: Schema.Types.ObjectId,
    ref: "discussionstopics",
    default: null,
  },
  discussion_topic_details_id: {
    type: Schema.Types.ObjectId,
    ref: "discussionstopicsdetails",
    default: null,
  },
  bugs_id: {
    type: Schema.Types.ObjectId,
    ref: "projecttaskbugs",
    default: null,
  },
  subscribers: {
    type: [{ type: Schema.Types.ObjectId, ref: "employees" }],
    default: [],
  },
  pms_clients: {
    type: [{ type: Schema.Types.ObjectId, ref: "pmsclients" }],
    default: [],
  },
  isBookmark: { type: Boolean, default: false },
  complaint_comment_id: {
    type: Schema.Types.ObjectId,
    ref: "complaints_comments",
    default: null,
  },
  ...commonSchema(),
});

module.exports = mongoose.model("fileuploads", FileUploadSchema);
