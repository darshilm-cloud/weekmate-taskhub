const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { commonSchema, notificationCommonSchema } = require("../helpers/common");

const NotificationsSchema = new mongoose.Schema({
  ...notificationCommonSchema(),
  message: { type: String, default: "" },
  type: { type: String, default: "" },
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
  logged_hours_id: {
    type: Schema.Types.ObjectId,
    ref: "projecttaskhourlogs",
    default: null,
  },
  // expireAt: { type: Date, default: Date.now, index: { expires: "1m" } }, // TTL index for 1 minute
  ...commonSchema(true, true),
  // is_seen: { type: Boolean, default: false },
});

// NotificationsSchema.index(
//   { createdAt: 1 },
//   { expireAfterSeconds: 10 * 24 * 60 * 60 }
// );

module.exports = mongoose.model("notifications", NotificationsSchema);
