const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const EmployeeImportQueueService = require('../jobs/EmployeeImportQueueService');
const { successResponse, errorResponse, catchBlockErrorResponse } = require('../helpers/response');
const { statusCode } = require('../helpers/constant');

const getImportHistory = () => mongoose.model('employee_import_histories');

// Start a new background import
exports.startImport = async (req, res) => {
  try {
    const { _id: userId, companyId } = req.user || {};

    if (!req.file) {
      return errorResponse(res, statusCode.BAD_REQUEST, 'No file uploaded');
    }

    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return errorResponse(res, statusCode.BAD_REQUEST, 'Invalid file type. Must be CSV, XLSX, or XLS');
    }

    if (!req.file.buffer || req.file.buffer.length === 0) {
      return errorResponse(res, statusCode.BAD_REQUEST, 'Empty file uploaded');
    }

    const response = await EmployeeImportQueueService.processBulkEmployeeImport(
      req.file.buffer,
      req.file.originalname,
      companyId,
      userId
    );

    return res.status(response.status).json(response.data);
  } catch (err) {
    console.error('startImport error:', err);
    return catchBlockErrorResponse(res, err.message);
  }
};

// Get paginated import history for the company
exports.getAllImportHistory = async (req, res) => {
  try {
    const { _id: userId, companyId } = req.user || {};
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const skip = (page - 1) * limit;

    const filter = { companyId };
    if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;

    const [records, total] = await Promise.all([
      getImportHistory()
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'first_name last_name full_name email')
        .lean(),
      getImportHistory().countDocuments(filter),
    ]);

    return successResponse(res, statusCode.SUCCESS, 'Import history fetched', records, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    return catchBlockErrorResponse(res, err.message);
  }
};

// Get progress of a single import job
exports.getImportProgress = async (req, res) => {
  try {
    const { jobId } = req.params;
    if (!jobId) return errorResponse(res, statusCode.BAD_REQUEST, 'Job ID is required');

    const jobStatus = await EmployeeImportQueueService.getJobStatus(jobId);
    if (!jobStatus) return errorResponse(res, statusCode.NOT_FOUND, 'Job not found');

    return res.status(statusCode.SUCCESS).json({ data: jobStatus });
  } catch (err) {
    return catchBlockErrorResponse(res, err.message);
  }
};

// Cancel an in-progress import
exports.cancelImport = async (req, res) => {
  try {
    const { _id: userId } = req.user || {};
    const { jobId } = req.params;
    if (!jobId) return errorResponse(res, statusCode.BAD_REQUEST, 'Job ID is required');

    const response = await EmployeeImportQueueService.cancelImport(jobId, userId);
    return res.status(response.status).json(response.data);
  } catch (err) {
    return catchBlockErrorResponse(res, err.message);
  }
};

// Undo a completed import (within 24 h)
exports.undoImport = async (req, res) => {
  try {
    const { _id: userId, companyId } = req.user || {};
    const { jobId } = req.params;
    if (!jobId) return errorResponse(res, statusCode.BAD_REQUEST, 'Job ID is required');

    // Verify ownership
    const history = await getImportHistory().findOne({ jobId }).lean();
    if (!history) return errorResponse(res, statusCode.NOT_FOUND, 'Import history not found');
    if (String(history.companyId) !== String(companyId)) {
      return errorResponse(res, statusCode.FORBIDDEN, 'Access denied');
    }

    const response = await EmployeeImportQueueService.undoImport(jobId, userId);
    return res.status(response.status).json(response.data);
  } catch (err) {
    return catchBlockErrorResponse(res, err.message);
  }
};

// Download the error CSV for a completed import — streams the file directly
exports.downloadErrorCsv = async (req, res) => {
  try {
    const { companyId } = req.user || {};
    const { jobId } = req.params;
    if (!jobId) return errorResponse(res, statusCode.BAD_REQUEST, 'Job ID is required');

    const history = await getImportHistory().findOne({ jobId }).lean();
    if (!history) return errorResponse(res, statusCode.NOT_FOUND, 'Import history not found');
    if (String(history.companyId) !== String(companyId)) {
      return errorResponse(res, statusCode.FORBIDDEN, 'Access denied');
    }
    if (!history.errorCsvPath) {
      return errorResponse(res, statusCode.NOT_FOUND, 'No error CSV available for this import');
    }

    const filePath = path.join(process.cwd(), history.errorCsvPath);
    if (!fs.existsSync(filePath)) {
      return errorResponse(res, statusCode.NOT_FOUND, 'Error CSV file not found on disk');
    }

    const fileName = `errors_${jobId}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    return catchBlockErrorResponse(res, err.message);
  }
};
