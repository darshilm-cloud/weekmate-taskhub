const mongoose = require("mongoose");
const { utcDefault } = require("../configs");
const Schema = mongoose.Schema;

const noteBook = new Schema({
  title: {
    type: String,
    required: true,
  },
  isPinned: {
    value: { type: Boolean, default: false },
    date: { type: Date, default: null }
  },
  project_id: {
    type: Schema.Types.ObjectId,
    ref: "projects",
    required: true,
  },
  isBookmark: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  createdBy: { type: Schema.Types.ObjectId, ref: "employees", required: true },
  createdAt: { type: Date, default: utcDefault },
  updatedBy: { type: Schema.Types.ObjectId, ref: "employees", required: true },
  updatedAt: { type: Date, default: utcDefault },
  deletedBy: { type: Schema.Types.ObjectId, ref: "employees" },
});

// [perf-indexes] query-driven indexes for list/aggregation endpoints
noteBook.index({ project_id: 1, isDeleted: 1 });

module.exports = mongoose.model("notebook", noteBook);
