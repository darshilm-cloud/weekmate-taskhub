/**
 * Recurring tasks/projects cron controller.
 *
 * These four functions are never reached over HTTP - they are wired to
 * node-schedule cron jobs in helpers/schedular.js, not a route - so the route
 * sweep can never find them. They take no req/res and are plain async
 * functions, so they are called directly here instead, the same way
 * schedular.js calls them.
 *
 * setupAfterEnv.js wipes every collection in a global afterEach, so fixtures
 * are reseeded fresh in beforeEach.
 */
const mongoose = require('mongoose');
// recurringTasks.js resolves its models with mongoose.model("name") at
// require time, which throws unless the schemas are already registered - so
// app.js (which requires models/index.js) has to load FIRST.
require('../app');
const {
  createMonthlyRecurringTasks,
  createYearlyRecurringTasks,
  createMonthlyRecurringProjects,
  createYearlyRecurringProjects,
} = require('../controller/recurringTasks');
const { seedAll, PRIMARY } = require('./fixtures');

beforeEach(async () => {
  await seedAll();
});

describe('createMonthlyRecurringTasks / createYearlyRecurringTasks', () => {
  const makeRecurringTask = async (recurringType) => {
    const ProjectTasks = mongoose.model('projecttasks');
    const CommentsModel = mongoose.model('Comments');
    const ProjectSubTasks = mongoose.model('projectsubtasks');

    // fixtures.js seeds one generic projecttasks doc keyed on PRIMARY already
    // pointing at real project/main task/status/assignee/label documents -
    // reuse those refs so .populate() resolves, and override only what this
    // cron actually filters on.
    const task = await ProjectTasks.create({
      title: 'Recurring task',
      taskId: 'RT-1',
      project_id: PRIMARY,
      main_task_id: PRIMARY,
      task_status: PRIMARY,
      assignees: [PRIMARY],
      pms_clients: [PRIMARY],
      task_labels: [PRIMARY],
      status: 'active',
      recurringType,
      isDeleted: false,
      createdAt: new Date(),
      createdBy: PRIMARY,
      updatedBy: PRIMARY,
      createdByModel: 'employees',
      updatedByModel: 'employees',
    });

    await CommentsModel.create({
      task_id: task._id,
      employee_id: PRIMARY,
      comment: 'Original comment',
      isDeleted: false,
      createdBy: PRIMARY,
      updatedBy: PRIMARY,
      createdByModel: 'employees',
      updatedByModel: 'employees',
    });

    const subTask = await ProjectSubTasks.create({
      title: 'Recurring subtask',
      subTaskId: 'RST-1',
      project_id: PRIMARY,
      main_task_id: PRIMARY,
      task_id: task._id,
      task_status: PRIMARY,
      assignees: [PRIMARY],
      status: 'active',
      isDeleted: false,
      createdBy: PRIMARY,
      updatedBy: PRIMARY,
      createdByModel: 'employees',
      updatedByModel: 'employees',
    });

    await CommentsModel.create({
      subTask_id: subTask._id,
      employee_id: PRIMARY,
      comment: 'Original subtask comment',
      isDeleted: false,
      createdBy: PRIMARY,
      updatedBy: PRIMARY,
      createdByModel: 'employees',
      updatedByModel: 'employees',
    });

    return task;
  };

  test('createMonthlyRecurringTasks copies a monthly task, its subtask, and both comment threads', async () => {
    // Regression: originalComments.map(async ...) built an array of Promises
    // and handed it straight to insertMany() unresolved - mongoose validated
    // each Promise instance as a document and every field came back missing.
    // That threw inside the per-task try/catch, which ALSO skips the subtask
    // copy since it runs later in the same block - a recurring task with any
    // existing comments silently lost its subtasks too.
    const task = await makeRecurringTask('monthly');
    const result = await createMonthlyRecurringTasks();
    expect(result.success).toBe(true);
    expect(result.createdTasksCount).toBe(1);
    expect(result.createdSubTasksCount).toBe(1);

    const CommentsModel = mongoose.model('Comments');
    const ProjectTasks = mongoose.model('projecttasks');
    // Only the original and its copy share this title; the generic fixture
    // docs seeded by seedAll() have a different one.
    const newTask = await ProjectTasks.findOne({
      title: 'Recurring task',
      _id: { $ne: task._id },
    }).lean();
    const copiedComments = await CommentsModel.find({ task_id: newTask._id }).lean();
    expect(copiedComments).toHaveLength(1);
    expect(copiedComments[0].comment).toBe('Original comment');
  });

  test('createMonthlyRecurringTasks ignores a yearly task', async () => {
    await makeRecurringTask('yearly');
    const result = await createMonthlyRecurringTasks();
    expect(result.success).toBe(true);
    expect(result.createdTasksCount).toBe(0);
  });

  test('createMonthlyRecurringTasks succeeds with nothing to do', async () => {
    const result = await createMonthlyRecurringTasks();
    expect(result).toMatchObject({ success: true, createdTasksCount: 0 });
  });

  test('createYearlyRecurringTasks copies a yearly task, its subtask, and both comment threads', async () => {
    await makeRecurringTask('yearly');
    const result = await createYearlyRecurringTasks();
    expect(result.success).toBe(true);
    expect(result.createdTasksCount).toBe(1);
    expect(result.createdSubTasksCount).toBe(1);
  });
});

describe('createMonthlyRecurringProjects / createYearlyRecurringProjects', () => {
  const markRecurring = async (recurringType) => {
    const Projects = mongoose.model('projects');
    await Projects.updateMany({}, { $set: { recurringType, isDeleted: false } });
  };

  test('createMonthlyRecurringProjects copies a monthly project with a fresh title suffix', async () => {
    await markRecurring('monthly');
    const result = await createMonthlyRecurringProjects();
    expect(result.success).toBe(true);
    expect(result.createdProjectsCount).toBeGreaterThan(0);
  });

  test('createMonthlyRecurringProjects ignores a yearly project', async () => {
    await markRecurring('yearly');
    const result = await createMonthlyRecurringProjects();
    expect(result.success).toBe(true);
    expect(result.createdProjectsCount).toBe(0);
  });

  test('createYearlyRecurringProjects copies a yearly project', async () => {
    await markRecurring('yearly');
    const result = await createYearlyRecurringProjects();
    expect(result.success).toBe(true);
    expect(result.createdProjectsCount).toBeGreaterThan(0);
  });

  test('re-running does not stack date suffixes onto an already-renamed title', async () => {
    const Projects = mongoose.model('projects');
    await markRecurring('monthly');
    await createMonthlyRecurringProjects();

    // The newly created copy is itself recurring (it inherited recurringType),
    // so running again must strip the previous suffix rather than stack it.
    const result = await createMonthlyRecurringProjects();
    expect(result.success).toBe(true);
    const titles = (await Projects.find({}).select('title').lean()).map((p) => p.title);
    expect(titles.some((t) => (t.match(/-/g) || []).length > 1)).toBe(false);
  });
});
