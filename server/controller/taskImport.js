const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const TaskImportQueueService = require('../jobs/TaskImportQueueService');
const { successResponse, errorResponse, catchBlockErrorResponse } = require('../helpers/response');
const { statusCode } = require('../helpers/constant');

const getImportHistory = () => mongoose.model('task_import_histories');
const ALLOWED_EXTENSIONS = ['csv', 'xlsx', 'xls'];

// The history row for :jobId, only if it belongs to the caller's company.
const findOwnHistory = async (req, res) => {
  const history = await getImportHistory().findOne({ jobId: req.params.jobId }).lean();
  if (!history || String(history.companyId) !== String(req.user?.companyId)) {
    errorResponse(res, statusCode.NOT_FOUND, 'Import not found');
    return null;
  }
  return history;
};

// POST /projects/tasks/import-bg  (multipart: attachment, project_id, main_task_id)
exports.startImport = async (req, res) => {
  try {
    const { companyId } = req.user || {};
    const { project_id: projectId, main_task_id: mainTaskId } = req.body || {};

    if (!req.file?.buffer?.length) return errorResponse(res, statusCode.BAD_REQUEST, 'No file uploaded');
    const ext = req.file.originalname.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return errorResponse(res, statusCode.BAD_REQUEST, 'Invalid file type. Use CSV, XLSX or XLS');
    }
    if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(mainTaskId)) {
      return errorResponse(res, statusCode.BAD_REQUEST, 'Select a project and task list to import into');
    }

    const { jobId } = await TaskImportQueueService.startImport({
      fileBuffer: req.file.buffer,
      fileName: req.file.originalname,
      companyId,
      user: req.user,
      projectId,
      mainTaskId,
    });

    return res.status(202).json({
      message: 'Task import started. Processing in the background.',
      jobId,
      status: 'queued',
    });
  } catch (err) {
    return catchBlockErrorResponse(res, err.message);
  }
};

// GET /projects/tasks/import-history?projectId=&page=&limit=&status=
exports.getImportHistory = async (req, res) => {
  try {
    const { companyId } = req.user || {};
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);

    const filter = { companyId };
    if (mongoose.Types.ObjectId.isValid(req.query.projectId)) filter.projectId = req.query.projectId;
    if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;

    const [records, total] = await Promise.all([
      getImportHistory()
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('userId', 'first_name last_name full_name email')
        .populate('mainTaskId', 'title')
        .select('-createdTaskIds')
        .lean(),
      getImportHistory().countDocuments(filter),
    ]);

    return successResponse(res, statusCode.SUCCESS, 'Task import history fetched', records, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    return catchBlockErrorResponse(res, err.message);
  }
};

// POST /projects/tasks/import-cancel/:jobId
exports.cancelImport = async (req, res) => {
  try {
    const history = await findOwnHistory(req, res);
    if (!history) return undefined;
    const result = await TaskImportQueueService.cancelImport(history, req.user._id);
    return res.status(result.status).json({ message: result.message });
  } catch (err) {
    return catchBlockErrorResponse(res, err.message);
  }
};

// POST /projects/tasks/import-undo/:jobId
exports.undoImport = async (req, res) => {
  try {
    const history = await findOwnHistory(req, res);
    if (!history) return undefined;
    const result = await TaskImportQueueService.undoImport(history, req.user._id);
    return res.status(result.status).json({ message: result.message });
  } catch (err) {
    return catchBlockErrorResponse(res, err.message);
  }
};

// GET /projects/tasks/import-error-csv/:jobId
exports.downloadErrorCsv = async (req, res) => {
  try {
    const history = await findOwnHistory(req, res);
    if (!history) return undefined;
    if (!history.errorCsvPath) return errorResponse(res, statusCode.NOT_FOUND, 'This import has no error file');

    const filePath = path.join(process.cwd(), history.errorCsvPath);
    if (!fs.existsSync(filePath)) return errorResponse(res, statusCode.NOT_FOUND, 'Error file not found');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="task_import_errors_${history.jobId}.csv"`);
    return fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    return catchBlockErrorResponse(res, err.message);
  }
};
