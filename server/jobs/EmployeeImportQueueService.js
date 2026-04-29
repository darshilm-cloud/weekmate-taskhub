const { Queue, Worker } = require('bullmq');
const { createRedisConnection } = require('../config/queue');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const xlsx = require('xlsx');
const nodemailer = require('nodemailer');

// Mongoose models loaded lazily to avoid require-before-connect issues
const getEmployees = () => mongoose.model('employees');
const getPMSRoles = () => mongoose.model('pms_roles');
const getImportHistory = () => mongoose.model('employee_import_histories');
const getSmtp = () => mongoose.model('smtp_configs');

// Per-user queue map + bootstrap dedupe map
const userQueues = new Map();
const userQueueBootstrap = new Map();

async function createUserImportQueue(userId) {
  const queueName = `employee-import-user-${userId}`;
  const queueConnection = createRedisConnection();
  const workerConnection = createRedisConnection();

  const queue = new Queue(queueName, {
    connection: queueConnection,
    defaultJobOptions: { removeOnComplete: 10, removeOnFail: 5 },
  });

  const worker = new Worker(
    queueName,
    async (job) => {
      const { sessionId, filePath, originalFileName, companyId, userId: jobUserId } = job.data;
      try {
        await processEmployeeImportChunked(sessionId, filePath, originalFileName, companyId, jobUserId);
        return { success: true, sessionId };
      } catch (err) {
        console.error(`Worker failed for session ${sessionId}:`, err.message);
        throw err;
      }
    },
    {
      connection: workerConnection,
      concurrency: 1,
      lockDuration: 30000,
      stalledInterval: 10000,
      maxStalledCount: 2,
    }
  );

  worker.on('failed', (job, err) => console.error(`Job ${job?.id} failed:`, err.message));
  worker.on('error', (err) => console.error(`Worker error for user ${userId}:`, err));

  await worker.waitUntilReady();
  console.log(`EmployeeImportQueue: worker ready — ${queueName}`);
  userQueues.set(userId, queue);
}

async function getUserQueueAsync(userId) {
  if (userQueues.has(userId)) return userQueues.get(userId);
  if (!userQueueBootstrap.has(userId)) {
    userQueueBootstrap.set(userId, createUserImportQueue(userId));
  }
  try {
    await userQueueBootstrap.get(userId);
  } finally {
    userQueueBootstrap.delete(userId);
  }
  const q = userQueues.get(userId);
  if (!q) throw new Error(`EmployeeImportQueue: failed to create queue for user ${userId}`);
  return q;
}

// ─── Core background processor ────────────────────────────────────────────────

const processEmployeeImportChunked = async (sessionId, filePath, originalFileName, companyId, userId) => {
  const EmployeeImportHistory = getImportHistory();
  const Employees = getEmployees();
  const PMSRoles = getPMSRoles();

  const startTime = Date.now();

  let history = await EmployeeImportHistory.findOne({ jobId: sessionId });
  if (!history) {
    history = await EmployeeImportHistory.create({
      jobId: sessionId,
      companyId,
      userId,
      fileName: originalFileName,
      status: 'queued',
      startTime: new Date(),
    });
  }

  try {
    // ── Step 1: count total rows ──────────────────────────────────────────────
    await history.updateOne({ status: 'parsing' });

    let totalRows = 0;
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(parse({ columns: true, skip_empty_lines: true }))
        .on('data', () => totalRows++)
        .on('end', resolve)
        .on('error', reject);
    });

    await history.updateOne({ totalRows });

    // ── Step 2: pre-scan emails + role names ──────────────────────────────────
    const allEmails = new Set();
    const allRoleNames = new Set();

    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(parse({ columns: true, skip_empty_lines: true, trim: true }))
        .on('data', (row) => {
          if (row['Email']) allEmails.add(row['Email'].toLowerCase().trim());
          if (row['Role']) allRoleNames.add(row['Role'].trim());
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // ── Step 3: bulk-resolve existing emails + roles ──────────────────────────
    const existingEmployees = await Employees.find({
      email: { $in: Array.from(allEmails) },
      companyId,
      isDeleted: false,
    }).select('email').lean();
    const existingEmailSet = new Set(existingEmployees.map((e) => e.email.toLowerCase()));

    const defaultRole = await PMSRoles.findOne({ role_name: 'User', isDeleted: false }).lean();

    const rolesFromDb = await PMSRoles.find({
      role_name: { $in: Array.from(allRoleNames) },
      isDeleted: false,
    }).lean();
    const roleMap = new Map(rolesFromDb.map((r) => [r.role_name.toLowerCase(), r._id]));

    // ── Step 4: stream and process one record at a time ──────────────────────
    await history.updateOne({ status: 'processing' });

    let successCount = 0;
    let errorCount = 0;
    const createdEmployeeIds = [];
    const errors = [];

    await new Promise((resolve, reject) => {
      const stream = fs.createReadStream(filePath);
      const parser = parse({ columns: true, skip_empty_lines: true, trim: true });
      let cancelled = false;

      stream.pipe(parser)
        .on('data', async (row) => {
          parser.pause();

          // Check cancellation on every row
          const freshHistory = await EmployeeImportHistory.findOne({ jobId: sessionId }).select('status').lean();
          if (freshHistory?.status === 'cancelled') {
            cancelled = true;
            stream.destroy();
            return resolve();
          }

          try {
            const email = (row['Email'] || '').toLowerCase().trim();
            const firstName = (row['First Name'] || '').trim();
            const lastName = (row['Last Name'] || '').trim();
            const password = (row['Password'] || '').trim();

            if (!email) throw new Error('Missing required field: Email');
            if (!firstName) throw new Error('Missing required field: First Name');
            if (!password) throw new Error('Missing required field: Password');

            if (existingEmailSet.has(email)) {
              throw new Error('Email already exists in this company');
            }

            const roleName = (row['Role'] || '').trim();
            let resolvedRoleId = defaultRole?._id;
            if (roleName) {
              const mapped = roleMap.get(roleName.toLowerCase());
              if (mapped) resolvedRoleId = mapped;
            }

            const emp = new (getEmployees())({
              companyId,
              first_name: firstName,
              last_name: lastName,
              full_name: `${firstName} ${lastName}`.trim(),
              email,
              password,
              phone_number: (row['Phone Number'] || '').trim(),
              pms_role_id: resolvedRoleId || null,
              createdBy: userId,
              updatedBy: userId,
              isActivate: true,
              isDeleted: false,
              isSoftDeleted: false,
            });

            const saved = await emp.save();
            existingEmailSet.add(email); // prevent duplicates within same file
            createdEmployeeIds.push(saved._id);
            successCount++;
          } catch (err) {
            errorCount++;
            errors.push({ row: { ...row }, errorMessage: err.message });
          }

          // Update progress every row
          await history.updateOne({ successCount, errorCount, createdEmployeeIds });
          parser.resume();
        })
        .on('end', () => {
          if (!cancelled) resolve();
        })
        .on('error', (err) => {
          if (cancelled) return resolve();
          reject(err);
        });
    });

    // ── Step 5: generate error CSV if needed ─────────────────────────────────
    let errorCsvPath = null;
    if (errors.length > 0) {
      errorCsvPath = await generateErrorCsv(errors, sessionId, companyId);
    }

    // ── Step 6: check for late cancellation ──────────────────────────────────
    const latestHistory = await EmployeeImportHistory.findOne({ jobId: sessionId }).select('status').lean();
    if (latestHistory?.status === 'cancelled') {
      console.log(`Import ${sessionId} cancelled — skipping completion steps`);
      return;
    }

    const processingTimeMs = Date.now() - startTime;
    await history.updateOne({
      status: 'completed',
      endTime: new Date(),
      processingTimeMs,
      errorCsvPath,
    });

    // ── Step 7: send completion email ─────────────────────────────────────────
    await sendCompletionEmail(companyId, successCount, errorCount, sessionId);

  } catch (err) {
    console.error(`Import failed for session ${sessionId}:`, err.message);
    await history.updateOne({
      status: 'failed',
      endTime: new Date(),
    });
    throw err;
  } finally {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (cleanupErr) {
      console.error('File cleanup failed:', cleanupErr.message);
    }
  }
};

// ─── Error CSV generator ──────────────────────────────────────────────────────

const generateErrorCsv = async (errors, sessionId, companyId) => {
  try {
    const dir = path.join(process.cwd(), 'public', 'error_csvs', String(companyId));
    fs.mkdirSync(dir, { recursive: true });

    const filePath = path.join(dir, `${sessionId}_errors.csv`);
    const headers = ['Email', 'First Name', 'Last Name', 'Password', 'Phone Number', 'Role', 'Error'];

    const escape = (v) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const lines = [headers.join(',')];
    for (const { row, errorMessage } of errors) {
      lines.push([
        escape(row['Email']),
        escape(row['First Name']),
        escape(row['Last Name']),
        escape(row['Password']),
        escape(row['Phone Number']),
        escape(row['Role']),
        escape(errorMessage),
      ].join(','));
    }

    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    return `public/error_csvs/${companyId}/${sessionId}_errors.csv`;
  } catch (err) {
    console.error('Error generating error CSV:', err.message);
    return null;
  }
};

// ─── Completion email ─────────────────────────────────────────────────────────

const sendCompletionEmail = async (companyId, successCount, errorCount, sessionId) => {
  try {
    const Smtp = getSmtp();
    const smtpConfig = await Smtp.findOne({ companyId }).lean();

    let transporter;
    if (smtpConfig?.host) {
      transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port || 587,
        secure: smtpConfig.secure || false,
        auth: { user: smtpConfig.user, pass: smtpConfig.password },
      });
    } else if (process.env.SMTP_HOST) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
    } else {
      return; // No SMTP configured
    }

    const Employees = getEmployees();
    const admin = await Employees.findOne({ companyId, isAdmin: true, isDeleted: false }).lean();
    if (!admin?.email) return;

    await transporter.sendMail({
      from: smtpConfig?.user || process.env.SMTP_USER,
      to: admin.email,
      subject: 'Employee Bulk Import Completed',
      html: `
        <h2>Employee Import Report</h2>
        <p>Your bulk employee import (Job: ${sessionId}) has completed.</p>
        <ul>
          <li><strong>Successfully imported:</strong> ${successCount}</li>
          <li><strong>Failed:</strong> ${errorCount}</li>
        </ul>
        ${errorCount > 0 ? '<p>Please download the error CSV from the Import History page to review failed rows.</p>' : ''}
      `,
    });
  } catch (err) {
    console.error('Failed to send import completion email:', err.message);
  }
};

// ─── Public service class ─────────────────────────────────────────────────────

class EmployeeImportQueueService {
  static async processBulkEmployeeImport(fileBuffer, fileName, companyId, userId) {
    try {
      const sessionId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Save file to disk (convert XLSX → CSV for streaming)
      const uploadsDir = path.join(process.cwd(), 'uploads', String(companyId), 'import_employee_csvs');
      fs.mkdirSync(uploadsDir, { recursive: true });
      const filePath = path.join(uploadsDir, `${sessionId}.csv`);

      const ext = fileName.split('.').pop().toLowerCase();
      if (ext === 'xlsx' || ext === 'xls') {
        const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        fs.writeFileSync(filePath, xlsx.utils.sheet_to_csv(sheet), 'utf8');
      } else {
        fs.writeFileSync(filePath, fileBuffer);
      }

      // Create history record immediately so it appears in listing
      await getImportHistory().create({
        jobId: sessionId,
        companyId,
        userId,
        fileName,
        status: 'queued',
        startTime: new Date(),
      });

      // Get (or create) per-user queue and enqueue the job
      const queue = await getUserQueueAsync(String(userId));

      const failedJobs = await queue.getFailed();
      for (const job of failedJobs) await job.remove();

      await queue.add('processImport', { sessionId, filePath, originalFileName: fileName, companyId, userId });

      return {
        status: 202,
        data: {
          message: 'Employee import started. Processing in the background.',
          jobId: sessionId,
          status: 'queued',
        },
      };
    } catch (err) {
      console.error('processBulkEmployeeImport error:', err.message);
      return { status: 500, data: { message: err.message } };
    }
  }

  static async getJobStatus(jobId) {
    try {
      const history = await getImportHistory().findOne({ jobId }).lean();
      if (!history) return null;
      return {
        id: jobId,
        status: history.status,
        progress: {
          total: history.totalRows,
          completed: history.successCount + history.errorCount,
          successful: history.successCount,
          failed: history.errorCount,
        },
        startTime: history.startTime,
        endTime: history.endTime,
        processingTimeMs: history.processingTimeMs,
      };
    } catch (err) {
      console.error('getJobStatus error:', err.message);
      return null;
    }
  }

  static async cancelImport(jobId, requestingUserId) {
    try {
      const history = await getImportHistory().findOne({ jobId });
      if (!history) return { status: 404, data: { message: 'Import job not found' } };

      const cancellable = ['queued', 'parsing', 'processing'];
      if (!cancellable.includes(history.status)) {
        return {
          status: 400,
          data: {
            message: `Cannot cancel import with status: ${history.status}. Only queued/parsing/processing imports can be cancelled.`,
            current_status: history.status,
          },
        };
      }

      // Try to remove from BullMQ queue (non-blocking best-effort)
      try {
        const queue = await getUserQueueAsync(String(history.userId));
        const jobs = await queue.getJobs(['waiting', 'active', 'delayed']);
        for (const job of jobs) {
          if (job.data.sessionId === jobId) {
            try { await job.remove(); } catch (_) { /* locked – worker will detect cancelled status */ }
            break;
          }
        }
      } catch (_) { /* queue may not exist yet */ }

      // Delete any already-created employees
      let deletedCount = 0;
      if (history.createdEmployeeIds?.length > 0) {
        const result = await getEmployees().deleteMany({ _id: { $in: history.createdEmployeeIds } });
        deletedCount = result.deletedCount;
      }

      await history.updateOne({
        status: 'cancelled',
        endTime: new Date(),
        totalRows: 0,
        successCount: 0,
        errorCount: 0,
        createdEmployeeIds: [],
      });

      // Wait briefly and clean up any employees created during race condition
      await new Promise((r) => setTimeout(r, 2000));
      const refreshed = await getImportHistory().findOne({ jobId }).lean();
      if (refreshed?.createdEmployeeIds?.length > 0) {
        await getEmployees().deleteMany({ _id: { $in: refreshed.createdEmployeeIds } });
        await getImportHistory().updateOne({ jobId }, { createdEmployeeIds: [], successCount: 0, errorCount: 0, totalRows: 0 });
      }

      // Delete uploaded CSV
      try {
        const filePath = path.join(process.cwd(), 'uploads', String(history.companyId), 'import_employee_csvs', `${jobId}.csv`);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (_) {}

      return {
        status: 200,
        data: {
          message: deletedCount > 0
            ? `Import cancelled. ${deletedCount} partially imported employee(s) removed.`
            : 'Import cancelled successfully.',
          jobId,
          status: 'cancelled',
          deletedEmployees: deletedCount,
        },
      };
    } catch (err) {
      console.error('cancelImport error:', err.message);
      return { status: 500, data: { message: 'Failed to cancel import', error: err.message } };
    }
  }

  static async undoImport(jobId, requestingUserId) {
    try {
      const history = await getImportHistory().findOne({ jobId });
      if (!history) return { status: 404, data: { message: 'Import history not found' } };

      if (history.isUndone) {
        return { status: 400, data: { message: 'This import has already been undone', undoneAt: history.undoneAt } };
      }

      if (history.status !== 'completed') {
        return { status: 400, data: { message: 'Can only undo completed imports' } };
      }

      const hoursDiff = (Date.now() - new Date(history.createdAt).getTime()) / (1000 * 60 * 60);
      if (hoursDiff > 24) {
        return {
          status: 400,
          data: { message: 'Undo is only available within 24 hours of import', hoursElapsed: Math.round(hoursDiff) },
        };
      }

      if (!history.createdEmployeeIds?.length) {
        return { status: 400, data: { message: 'No employees were successfully created during this import' } };
      }

      const result = await getEmployees().deleteMany({ _id: { $in: history.createdEmployeeIds } });

      await history.updateOne({
        status: 'undone',
        isUndone: true,
        undoneAt: new Date(),
        undoneBy: requestingUserId,
      });

      return {
        status: 200,
        data: { message: 'Import undone successfully', deletedCount: result.deletedCount },
      };
    } catch (err) {
      console.error('undoImport error:', err.message);
      return { status: 500, data: { message: 'Failed to undo import', error: err.message } };
    }
  }
}

module.exports = EmployeeImportQueueService;
