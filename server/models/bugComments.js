const mongoose = require("mongoose");
const { commonSchema } = require("../helpers/common");
const Schema = mongoose.Schema;

const bugComments = new Schema({
  comment: {
    type: String,
  },
  bug_id: {
    type: Schema.Types.ObjectId,
    ref: "projecttaskbugs",
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
  ...commonSchema(),
});

module.exports = mongoose.model("bugscomments", bugComments);
