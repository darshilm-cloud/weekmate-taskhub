const mongoose = require('mongoose');

const employeeImportHistorySchema = new mongoose.Schema(
  {
    jobId: { type: String, required: true, unique: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'companies', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'employees', required: true },
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
    createdEmployeeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'employees' }],
    isUndone: { type: Boolean, default: false },
    undoneAt: { type: Date, default: null },
    undoneBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employees', default: null },
  },
  { timestamps: true }
);

employeeImportHistorySchema.index({ companyId: 1 });
employeeImportHistorySchema.index({ userId: 1 });
employeeImportHistorySchema.index({ status: 1 });
employeeImportHistorySchema.index({ createdAt: -1 });

module.exports = mongoose.model('employee_import_histories', employeeImportHistorySchema);
