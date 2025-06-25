const mongoose = require("mongoose");
const { commonSchema } = require("../helpers/common");
const Schema = mongoose.Schema;

const Comments = new Schema({
  comment: {
    type: String,
  },
  task_id: {
    type: Schema.Types.ObjectId,
    ref: "projecttasks",
    default: null,
  },
  employee_id: {
    type: Schema.Types.ObjectId,
    ref: "employees",
    required: true,
  },
  taggedUsers: {
    type: [{ type: Schema.Types.ObjectId, ref: "employees" }],
    default: [],
  },
  status_history: {
    type: [
      {
        isResolve: {
          type: Boolean,
        },
        updatedBy: { type: Schema.Types.ObjectId, ref: "employees" },
        updatedAt: { type: Date },
      },
    ],
    default: [],
  },
  isResolve: { type: Boolean, default: false },
  // isDeleted: { type: Boolean, default: false },
  // deletedAt: { type: Date, default: null },
  // createdBy: { type: Schema.Types.ObjectId, ref: "employees", required: true },
  // createdAt: { type: Date, default: utcDefault },
  // updatedBy: { type: Schema.Types.ObjectId, ref: "employees", required: true },
  // updatedAt: { type: Date, default: utcDefault },
  // deletedBy: { type: Schema.Types.ObjectId, ref: "employees" },
  ...commonSchema(),
});

module.exports = mongoose.model("Comments", Comments);
