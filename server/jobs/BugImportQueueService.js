const { Queue, Worker } = require('bullmq');
const { createRedisConnection, getQueuePrefix } = require('../config/queue');
const mongoose = require('mongoose');
const moment = require('moment');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const xlsx = require('xlsx');
const { DEFAULT_DATA } = require('../helpers/constant');
const { generateRandomId, getRefModelFromLoginUser } = require('../helpers/common');

/*
 * Background bug import (project → Bugs tab → Import CSV), same design as
 * BugImportQueueService: the file is saved, a history row is created at once,
 * and a per-user BullMQ worker imports one row at a time so progress, cancel and
 * undo work while it runs.
 *
 * Columns (header names, case-sensitive like the sample file):
 *   Issue*                     bug title
 *   Assignees Email*           one or more emails, comma / semicolon separated
 *   Descriptions               optional
 *   Estimated Hours            optional number
 *   Estimated Minutes          optional 0-59
 *   Start Date, Due Date       optional, YYYY-MM-DD or DD-MM-YYYY
 *   Created By Email           optional, defaults to the person importing
 */

const getBugs = () => mongoose.model('projecttaskbugs');
const getEmployees = () => mongoose.model('employees');
const getProjects = () => mongoose.model('projects');
const getBugStatus = () => mongoose.model('bugsworkflowstatus');
const getImportHistory = () => mongoose.model('bug_import_histories');

const DATE_FORMATS = ['YYYY-MM-DD', 'DD-MM-YYYY', 'DD/MM/YYYY', 'YYYY/MM/DD', 'M/D/YYYY', 'MM/DD/YYYY'];
const ERROR_CSV_HEADERS = [
  'Issue',
  'Assignees Email',
  'Descriptions',
  'Estimated Hours',
  'Estimated Minutes',
  'Start Date',
  'Due Date',
  'Created By Email',
  'Error',
];

const userQueues = new Map();
const userQueueBootstrap = new Map();

async function createUserImportQueue(userId) {
  const queueName = `bug-import-user-${userId}`;
  const queue = new Queue(queueName, {
    prefix: getQueuePrefix(),
    connection: createRedisConnection(),
    defaultJobOptions: { removeOnComplete: 10, removeOnFail: 5 },
  });

  const worker = new Worker(
    queueName,
    async (job) => {
      await processBugImport(job.data);
      return { success: true, sessionId: job.data.sessionId };
    },
    {
      prefix: getQueuePrefix(),
      connection: createRedisConnection(),
      concurrency: 1,
      lockDuration: 30000,
      stalledInterval: 10000,
      maxStalledCount: 2,
    }
  );

  worker.on('failed', (job, err) => console.error(`BugImport job ${job?.id} failed:`, err.message));
  worker.on('error', (err) => console.error(`BugImport worker error for user ${userId}:`, err));

  await worker.waitUntilReady();
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
  const queue = userQueues.get(userId);
  if (!queue) throw new Error(`BugImportQueue: failed to create queue for user ${userId}`);
  return queue;
}

// ─── Row helpers ──────────────────────────────────────────────────────────────

const cell = (row, ...names) => {
  for (const name of names) {
    const value = row[name];
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
  }
  return '';
};

const parseDate = (value, label) => {
  if (!value) return null;
  const parsed = moment(value, DATE_FORMATS, true);
  if (!parsed.isValid()) throw new Error(`${label} must be a date like 2026-10-31`);
  return parsed.startOf('day').toDate();
};

const parseWholeNumber = (value, label, max) => {
  if (!value) return '00';
  if (!/^\d+$/.test(value)) throw new Error(`${label} must be a whole number`);
  const n = Number(value);
  if (max !== undefined && n > max) throw new Error(`${label} must be ${max} or less`);
  return String(n).padStart(2, '0');
};

const countRows = (filePath) =>
  new Promise((resolve, reject) => {
    let total = 0;
    fs.createReadStream(filePath)
      .pipe(parse({ columns: true, skip_empty_lines: true, bom: true }))
      .on('data', () => total++)
      .on('end', () => resolve(total))
      .on('error', reject);
  });

// ─── Core background processor ────────────────────────────────────────────────

const processBugImport = async ({ sessionId, filePath, companyId, userId, userRoleName, projectId }) => {
  const History = getImportHistory();
  const Bugs = getBugs();
  const startTime = Date.now();
  const history = await History.findOne({ jobId: sessionId });
  if (!history || history.status === 'cancelled') return;

  try {
    await history.updateOne({ status: 'parsing' });

    // Project and the bug workflow's To-Do stage - both must belong to this company.
    const project = await getProjects().findOne({ _id: projectId, companyId, isDeleted: false }).select('_id manager assignees').lean();
    if (!project) throw new Error('Project not found');
    const todoStatus = await getBugStatus()
      .findOne({ title: DEFAULT_DATA.BUG_WORKFLOW_STATUS.TODO, companyId, isDeleted: false })
      .select('_id')
      .lean();
    if (!todoStatus) throw new Error(`The bug workflow has no "${DEFAULT_DATA.BUG_WORKFLOW_STATUS.TODO}" stage`);

    const totalRows = await countRows(filePath);
    if (totalRows === 0) throw new Error('The file has no rows');
    await history.updateOne({ totalRows });

    // Active employees of this company, by email.
    const employees = await getEmployees()
      .find({ companyId, isDeleted: false, isActivate: true })
      .select('_id email')
      .lean();
    const employeeByEmail = new Map(employees.map((e) => [String(e.email).toLowerCase().trim(), e._id]));

    // Only the project's manager and assignees can be assigned (same list the Add form offers).
    const projectMemberIds = new Set([project.manager, ...(project.assignees || [])].filter(Boolean).map(String));

    // Bug titles already in this project (and those added from this file) can't repeat.
    const existing = await Bugs.find({ project_id: projectId, isDeleted: false }).select('title').lean();
    const titlesInList = new Set(existing.map((t) => String(t.title).toLowerCase().trim()));

    const refModel = await getRefModelFromLoginUser({ pms_role_id: { role_name: userRoleName } });

    await history.updateOne({ status: 'processing' });

    let successCount = 0;
    let errorCount = 0;
    const createdBugIds = [];
    const errors = [];
    let cancelled = false;

    await new Promise((resolve, reject) => {
      const stream = fs.createReadStream(filePath);
      const parser = parse({ columns: true, skip_empty_lines: true, trim: true, bom: true });
      // The parser can emit "end" while the last row is still being saved -
      // finish only after the row in flight has been handled.
      let rowInFlight = Promise.resolve();

      stream
        .pipe(parser)
        .on('data', (row) => {
          rowInFlight = handleRow(row);
        })
        .on('end', () => {
          rowInFlight.then(() => {
            if (!cancelled) resolve();
          }, reject);
        })
        .on('error', (err) => {
          if (cancelled) return resolve();
          reject(err);
        });

      async function handleRow(row) {
          parser.pause();

          const fresh = await History.findOne({ jobId: sessionId }).select('status').lean();
          if (fresh?.status === 'cancelled') {
            cancelled = true;
            stream.destroy();
            return resolve();
          }

          try {
            const title = cell(row, 'Issue');
            if (!title) throw new Error('Missing required field: Issue');
            if (titlesInList.has(title.toLowerCase())) throw new Error('An issue with this title already exists in this project');

            const assigneeEmails = cell(row, 'Assignees Email')
              .split(/[,;]/)
              .map((e) => e.toLowerCase().trim())
              .filter(Boolean);
            if (!assigneeEmails.length) throw new Error('Missing required field: Assignees Email');
            const unknown = assigneeEmails.filter((e) => !employeeByEmail.has(e));
            if (unknown.length) throw new Error(`No active user with email: ${unknown.join(', ')}`);
            const notInProject = assigneeEmails.filter((e) => !projectMemberIds.has(String(employeeByEmail.get(e))));
            if (notInProject.length) throw new Error(`Not a member of this project: ${notInProject.join(', ')}`);

            const createdByEmail = cell(row, 'Created By Email').toLowerCase();
            let createdBy = userId;
            if (createdByEmail) {
              if (!employeeByEmail.has(createdByEmail)) throw new Error(`Created By user not found: ${createdByEmail}`);
              createdBy = employeeByEmail.get(createdByEmail);
            }

            const startDate = parseDate(cell(row, 'Start Date'), 'Start Date');
            const dueDate = parseDate(cell(row, 'Due Date'), 'Due Date');
            if (startDate && dueDate && startDate > dueDate) throw new Error('Start Date must not be after Due Date');

            const bug = await new Bugs({
              title,
              project_id: projectId,
              descriptions: cell(row, 'Descriptions', 'Description'),
              start_date: startDate,
              due_date: dueDate,
              estimated_hours: parseWholeNumber(cell(row, 'Estimated Hours'), 'Estimated Hours'),
              estimated_minutes: parseWholeNumber(cell(row, 'Estimated Minutes', 'Estimated Mintues'), 'Estimated Minutes', 59),
              bug_status: todoStatus._id,
              bug_status_history: [{ bug_status: todoStatus._id, updatedBy: userId, updatedAt: new Date() }],
              assignees: [...new Set(assigneeEmails)].map((e) => employeeByEmail.get(e)),
              bugId: generateRandomId(),
              isImported: true,
              createdBy,
              updatedBy: createdBy,
              ...refModel,
            }).save();

            titlesInList.add(title.toLowerCase());
            createdBugIds.push(bug._id);
            successCount++;
          } catch (err) {
            errorCount++;
            errors.push({ row: { ...row }, errorMessage: err.message });
          }

          await history.updateOne({ successCount, errorCount, createdBugIds });
          parser.resume();
      }
    });

    const errorCsvPath = errors.length ? generateErrorCsv(errors, sessionId, companyId) : null;

    const latest = await History.findOne({ jobId: sessionId }).select('status').lean();
    if (latest?.status === 'cancelled') return;

    await history.updateOne({
      status: 'completed',
      endTime: new Date(),
      processingTimeMs: Date.now() - startTime,
      errorCsvPath,
    });
  } catch (err) {
    console.error(`Bug import failed for session ${sessionId}:`, err.message);
    await history.updateOne({ status: 'failed', endTime: new Date(), failureReason: err.message });
    throw err;
  } finally {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (cleanupErr) {
      console.error('Bug import file cleanup failed:', cleanupErr.message);
    }
  }
};

const generateErrorCsv = (errors, sessionId, companyId) => {
  try {
    const dir = path.join(process.cwd(), 'public', 'error_csvs', 'bugs', String(companyId));
    fs.mkdirSync(dir, { recursive: true });
    const escape = (v) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [ERROR_CSV_HEADERS.join(',')];
    for (const { row, errorMessage } of errors) {
      lines.push(
        [
          row['Issue'],
          row['Assignees Email'],
          row['Descriptions'] ?? row['Description'],
          row['Estimated Hours'],
          row['Estimated Minutes'] ?? row['Estimated Mintues'],
          row['Start Date'],
          row['Due Date'],
          row['Created By Email'],
          errorMessage,
        ]
          .map(escape)
          .join(',')
      );
    }
    fs.writeFileSync(path.join(dir, `${sessionId}_errors.csv`), lines.join('\n'), 'utf8');
    return `public/error_csvs/bugs/${companyId}/${sessionId}_errors.csv`;
  } catch (err) {
    console.error('Error generating bug error CSV:', err.message);
    return null;
  }
};

// Imported bugs are soft-deleted on cancel / undo, like any other bug delete.
const softDeleteBugs = async (bugIds, userId) => {
  if (!bugIds?.length) return 0;
  const result = await getBugs().updateMany(
    { _id: { $in: bugIds }, isDeleted: false },
    { $set: { isDeleted: true, deletedBy: userId, deletedAt: new Date() } }
  );
  return result.modifiedCount || 0;
};

// ─── Public service ───────────────────────────────────────────────────────────

class BugImportQueueService {
  static async startImport({ fileBuffer, fileName, companyId, user, projectId }) {
    const sessionId = `bug_import_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    const uploadsDir = path.join(process.cwd(), 'uploads', String(companyId), 'import_bug_csvs');
    fs.mkdirSync(uploadsDir, { recursive: true });
    const filePath = path.join(uploadsDir, `${sessionId}.csv`);

    const ext = fileName.split('.').pop().toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') {
      const workbook = xlsx.read(fileBuffer, { type: 'buffer', cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      fs.writeFileSync(filePath, xlsx.utils.sheet_to_csv(sheet, { dateNF: 'yyyy-mm-dd' }), 'utf8');
    } else {
      fs.writeFileSync(filePath, fileBuffer);
    }

    await getImportHistory().create({
      jobId: sessionId,
      companyId,
      userId: user._id,
      projectId,
      fileName,
      status: 'queued',
      startTime: new Date(),
    });

    const queue = await getUserQueueAsync(String(user._id));
    for (const job of await queue.getFailed()) await job.remove();
    await queue.add('processBugImport', {
      sessionId,
      filePath,
      companyId: String(companyId),
      userId: String(user._id),
      userRoleName: user?.pms_role_id?.role_name || '',
      projectId: String(projectId),
    });

    return { jobId: sessionId };
  }

  static async cancelImport(history, userId) {
    if (!['queued', 'parsing', 'processing'].includes(history.status)) {
      return { status: 400, message: `Only running imports can be cancelled (this one is ${history.status}).` };
    }

    try {
      const queue = await getUserQueueAsync(String(history.userId));
      const jobs = await queue.getJobs(['waiting', 'active', 'delayed']);
      const job = jobs.find((j) => j.data.sessionId === history.jobId);
      if (job) await job.remove().catch(() => {}); // locked → the worker sees "cancelled" on its next row
    } catch (_) {
      /* queue not created yet */
    }

    await getImportHistory().updateOne({ jobId: history.jobId }, { status: 'cancelled', endTime: new Date() });
    let removed = await softDeleteBugs(history.createdBugIds, userId);

    // A row may have been saving while we cancelled - sweep once more.
    await new Promise((r) => setTimeout(r, 2000));
    const refreshed = await getImportHistory().findOne({ jobId: history.jobId }).lean();
    removed += await softDeleteBugs(refreshed?.createdBugIds, userId);

    try {
      const filePath = path.join(process.cwd(), 'uploads', String(history.companyId), 'import_bug_csvs', `${history.jobId}.csv`);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (_) {
      /* already cleaned up */
    }

    return {
      status: 200,
      message: removed ? `Import cancelled. ${removed} bug(s) already imported were removed.` : 'Import cancelled.',
    };
  }

  static async undoImport(history, userId) {
    if (history.isUndone) return { status: 400, message: 'This import has already been undone' };
    if (history.status !== 'completed') return { status: 400, message: 'Only completed imports can be undone' };
    const hours = (Date.now() - new Date(history.createdAt).getTime()) / 36e5;
    if (hours > 24) return { status: 400, message: 'Undo is only available within 24 hours of the import' };
    if (!history.createdBugIds?.length) return { status: 400, message: 'This import did not add any bugs' };

    const removed = await softDeleteBugs(history.createdBugIds, userId);
    await getImportHistory().updateOne(
      { jobId: history.jobId },
      { status: 'undone', isUndone: true, undoneAt: new Date(), undoneBy: userId }
    );
    return { status: 200, message: `Import undone. ${removed} bug(s) removed.` };
  }
}

module.exports = BugImportQueueService;
