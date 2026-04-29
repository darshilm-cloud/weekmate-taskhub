const { Queue, Worker } = require('bullmq');
const { createRedisConnection } = require('../config/queue');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const xlsx = require('xlsx');
const crypto = require('crypto');

// Mongoose models loaded lazily to avoid require-before-connect issues
const getPMSClients = () => mongoose.model('pmsclients');
const getPMSRoles = () => mongoose.model('pms_roles');
const getImportHistory = () => mongoose.model('client_import_histories');

// Per-user queue map + bootstrap dedupe map
const userQueues = new Map();
const userQueueBootstrap = new Map();

async function createUserImportQueue(userId) {
  const queueName = `client-import-user-${userId}`;
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
        await processClientImportChunked(sessionId, filePath, originalFileName, companyId, jobUserId);
        return { success: true, sessionId };
      } catch (err) {
        console.error(`ClientImportWorker failed for session ${sessionId}:`, err.message);
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

  worker.on('failed', (job, err) => console.error(`ClientImport job ${job?.id} failed:`, err.message));
  worker.on('error', (err) => console.error(`ClientImport worker error for user ${userId}:`, err));

  await worker.waitUntilReady();
  console.log(`ClientImportQueue: worker ready — ${queueName}`);
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
  if (!q) throw new Error(`ClientImportQueue: failed to create queue for user ${userId}`);
  return q;
}

// ─── Core background processor ────────────────────────────────────────────────

const processClientImportChunked = async (sessionId, filePath, originalFileName, companyId, userId) => {
  const ClientImportHistory = getImportHistory();
  const PMSClients = getPMSClients();
  const PMSRoles = getPMSRoles();

  const startTime = Date.now();

  let history = await ClientImportHistory.findOne({ jobId: sessionId });
  if (!history) {
    history = await ClientImportHistory.create({
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

    // ── Step 2: pre-scan emails ───────────────────────────────────────────────
    const allEmails = new Set();

    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(parse({ columns: true, skip_empty_lines: true, trim: true }))
        .on('data', (row) => {
          if (row['Email']) allEmails.add(row['Email'].toLowerCase().trim());
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // ── Step 3: bulk-resolve existing emails + get/create CLIENT role ─────────
    const existingClients = await PMSClients.find({
      email: { $in: Array.from(allEmails) },
      companyId,
      isDeleted: false,
    }).select('email').lean();
    const existingEmailSet = new Set(existingClients.map((c) => c.email.toLowerCase()));

    let clientRole = await PMSRoles.findOne({ role_name: 'Client', isDeleted: false }).lean();
    if (!clientRole) {
      clientRole = await new (getPMSRoles())({
        role_name: 'Client',
        createdBy: userId,
        updatedBy: userId,
      }).save();
    }

    // ── Step 4: stream and process one record at a time ──────────────────────
    await history.updateOne({ status: 'processing' });

    let successCount = 0;
    let errorCount = 0;
    const createdClientIds = [];
    const errors = [];

    await new Promise((resolve, reject) => {
      const stream = fs.createReadStream(filePath);
      const parser = parse({ columns: true, skip_empty_lines: true, trim: true });
      let cancelled = false;

      stream.pipe(parser)
        .on('data', async (row) => {
          parser.pause();

          // Check cancellation on every row
          const freshHistory = await ClientImportHistory.findOne({ jobId: sessionId }).select('status').lean();
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
            if (!lastName) throw new Error('Missing required field: Last Name');
            if (!password) throw new Error('Missing required field: Password');

            if (existingEmailSet.has(email)) {
              throw new Error('Email already exists in this company');
            }

            const hashedPassword = crypto.createHash('md5').update(password).digest('hex');

            const client = new (getPMSClients())({
              companyId,
              first_name: firstName,
              last_name: lastName,
              full_name: `${firstName} ${lastName}`.trim(),
              email,
              phone_number: (row['Phone Number'] || '').trim(),
              company_name: (row['Company Name'] || '').trim(),
              password: hashedPassword,
              plain_password: password,
              pms_role_id: clientRole._id,
              createdBy: userId,
              updatedBy: userId,
              isActivate: true,
              isDeleted: false,
              isSoftDeleted: false,
            });

            // Use { validateBeforeSave: false } because password is already hashed
            const saved = await client.save({ validateBeforeSave: false });
            existingEmailSet.add(email); // prevent duplicates within same file
            createdClientIds.push(saved._id);
            successCount++;
          } catch (err) {
            errorCount++;
            errors.push({ row: { ...row }, errorMessage: err.message });
          }

          // Update progress every row
          await history.updateOne({ successCount, errorCount, createdClientIds });
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
    const latestHistory = await ClientImportHistory.findOne({ jobId: sessionId }).select('status').lean();
    if (latestHistory?.status === 'cancelled') {
      console.log(`Client import ${sessionId} cancelled — skipping completion steps`);
      return;
    }

    const processingTimeMs = Date.now() - startTime;
    await history.updateOne({
      status: 'completed',
      endTime: new Date(),
      processingTimeMs,
      errorCsvPath,
    });

  } catch (err) {
    console.error(`Client import failed for session ${sessionId}:`, err.message);
    await history.updateOne({
      status: 'failed',
      endTime: new Date(),
    });
    throw err;
  } finally {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (cleanupErr) {
      console.error('Client import file cleanup failed:', cleanupErr.message);
    }
  }
};

// ─── Error CSV generator ──────────────────────────────────────────────────────

const generateErrorCsv = async (errors, sessionId, companyId) => {
  try {
    const dir = path.join(process.cwd(), 'public', 'error_csvs', 'clients', String(companyId));
    fs.mkdirSync(dir, { recursive: true });

    const filePath = path.join(dir, `${sessionId}_errors.csv`);
    const headers = ['Email', 'First Name', 'Last Name', 'Password', 'Phone Number', 'Company Name', 'Error'];

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
        escape(row['Company Name']),
        escape(errorMessage),
      ].join(','));
    }

    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    return `public/error_csvs/clients/${companyId}/${sessionId}_errors.csv`;
  } catch (err) {
    console.error('Error generating client error CSV:', err.message);
    return null;
  }
};

// ─── Public service class ─────────────────────────────────────────────────────

class ClientImportQueueService {
  static async processBulkClientImport(fileBuffer, fileName, companyId, userId) {
    try {
      const sessionId = `client_import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Save file to disk (convert XLSX → CSV for streaming)
      const uploadsDir = path.join(process.cwd(), 'uploads', String(companyId), 'import_client_csvs');
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

      await queue.add('processClientImport', { sessionId, filePath, originalFileName: fileName, companyId, userId });

      return {
        status: 202,
        data: {
          message: 'Client import started. Processing in the background.',
          jobId: sessionId,
          status: 'queued',
        },
      };
    } catch (err) {
      console.error('processBulkClientImport error:', err.message);
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

      // Delete any already-created clients
      let deletedCount = 0;
      if (history.createdClientIds?.length > 0) {
        const result = await getPMSClients().deleteMany({ _id: { $in: history.createdClientIds } });
        deletedCount = result.deletedCount;
      }

      await history.updateOne({
        status: 'cancelled',
        endTime: new Date(),
        totalRows: 0,
        successCount: 0,
        errorCount: 0,
        createdClientIds: [],
      });

      // Wait briefly and clean up any clients created during race condition
      await new Promise((r) => setTimeout(r, 2000));
      const refreshed = await getImportHistory().findOne({ jobId }).lean();
      if (refreshed?.createdClientIds?.length > 0) {
        await getPMSClients().deleteMany({ _id: { $in: refreshed.createdClientIds } });
        await getImportHistory().updateOne({ jobId }, { createdClientIds: [], successCount: 0, errorCount: 0, totalRows: 0 });
      }

      // Delete uploaded CSV
      try {
        const filePath = path.join(process.cwd(), 'uploads', String(history.companyId), 'import_client_csvs', `${jobId}.csv`);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (_) {}

      return {
        status: 200,
        data: {
          message: deletedCount > 0
            ? `Import cancelled. ${deletedCount} partially imported client(s) removed.`
            : 'Import cancelled successfully.',
          jobId,
          status: 'cancelled',
          deletedClients: deletedCount,
        },
      };
    } catch (err) {
      console.error('cancelClientImport error:', err.message);
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

      if (!history.createdClientIds?.length) {
        return { status: 400, data: { message: 'No clients were successfully created during this import' } };
      }

      const result = await getPMSClients().deleteMany({ _id: { $in: history.createdClientIds } });

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
      console.error('undoClientImport error:', err.message);
      return { status: 500, data: { message: 'Failed to undo import', error: err.message } };
    }
  }
}

module.exports = ClientImportQueueService;
