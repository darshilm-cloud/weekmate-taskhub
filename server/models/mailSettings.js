const mongoose = require("mongoose");
const { commonSchema } = require("../helpers/common");

const mailsettingSchema = new mongoose.Schema({
  project_assigned: {
    type: Boolean,
    default: false,
    required: true
  },
  discussion_subscribed: {
    type: Boolean,
    default: false,
    required: true
  },
  discussion_tagged: {
    type: Boolean,
    default: false,
    required: true
  },
  maintask_subscribed: {
    type: Boolean,
    default: false,
    required: true
  },
  task_assigned: {
    type: Boolean,
    default: false,
    required: true
  },
  task_tagged_comments: {
    type: Boolean,
    default: false,
    required: true
  },
  bug_assigned: {
    type: Boolean,
    default: false,
    required: true
  },
  bug_tagged_comments: {
    type: Boolean,
    default: false,
    required: true
  },
  note_assigned: {
    type: Boolean,
    default: false,
    required: true
  },
  note_tagged_comments: {
    type: Boolean,
    default: false,
    required: true
  },
  file_subscribed: {
    type: Boolean,
    default: false,
    required: true
  },
  logged_hours: {
    type: Boolean,
    default: false,   
  },
  never: {
    type: Boolean,
    default: false,   
  },
  quarterlyMail: {
    type: Boolean,
    default: false,   
  },
  ...commonSchema(),
});

module.exports = mongoose.model("mailsettings", mailsettingSchema);
