const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { commonSchema } = require("../helpers/common");

const TaskTimersSchema = new Schema({
  task_id: {
    type: Schema.Types.ObjectId,
    ref: "projecttasks",
    required: true,
  },
  user_id: {
    type: Schema.Types.ObjectId,
    ref: "employees",
    required: true,
  },
  start_time: {
    type: Date,
    required: true,
  },
  stop_time: {
    type: Date,
    default: null,
  },
  duration_minutes: {
    type: Number,
    default: 0,
  },
  duration_seconds: {
    type: Number,
    default: 0,
  },
  is_active: {
    type: Boolean,
    default: true,
  },
  ...commonSchema(),
});

// Index for efficient queries
TaskTimersSchema.index({ user_id: 1, is_active: 1 });
TaskTimersSchema.index({ task_id: 1, user_id: 1 });

module.exports = mongoose.model("tasktimers", TaskTimersSchema);

