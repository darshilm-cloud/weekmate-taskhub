const mongoose = require('mongoose');

// One row per background bug import (Bugs tab → Import CSV). Mirrors
// ClientImportHistory, scoped to the project imported into.
const bugImportHistorySchema = new mongoose.Schema(
  {
    jobId: { type: String, required: true, unique: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'companies', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'employees', required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'projects', required: true },
    fileName: { type: String, default: '' },
    status: {
      type: String,
      enum: ['queued', 'parsing', 'processing', 'completed', 'failed', 'cancelled', 'undone'],
      default: 'queued',
    },
    totalRows: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
    startTime: { type: Date },
    endTime: { type: Date },
    processingTimeMs: { type: Number },
    errorCsvPath: { type: String, default: null },
    failureReason: { type: String, default: null },
    createdBugIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'projecttaskbugs' }],
    isUndone: { type: Boolean, default: false },
    undoneAt: { type: Date, default: null },
    undoneBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employees', default: null },
  },
  { timestamps: true }
);

bugImportHistorySchema.index({ companyId: 1, projectId: 1, createdAt: -1 });
bugImportHistorySchema.index({ status: 1 });

module.exports = mongoose.model('bug_import_histories', bugImportHistorySchema);
