const mongoose = require('mongoose');

// One row per background task import (Tasks tab → Import CSV). Mirrors
// ClientImportHistory, scoped to the project and task list imported into.
const taskImportHistorySchema = new mongoose.Schema(
  {
    jobId: { type: String, required: true, unique: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'companies', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'employees', required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'projects', required: true },
    mainTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'projectmaintasks', required: true },
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
    createdTaskIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'projecttasks' }],
    isUndone: { type: Boolean, default: false },
    undoneAt: { type: Date, default: null },
    undoneBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employees', default: null },
  },
  { timestamps: true }
);

taskImportHistorySchema.index({ companyId: 1, projectId: 1, createdAt: -1 });
taskImportHistorySchema.index({ status: 1 });

module.exports = mongoose.model('task_import_histories', taskImportHistorySchema);
