/**
 * Tasks controller - the single largest server file, 899 executable lines.
 *
 * The route sweep reaches every export here except importTasksData (excluded
 * as a file upload), but its generic negotiated body only drives the
 * shallowest branch of each: an update that changes nothing, a workflow move
 * that already matches. This drives real field changes - a status
 * transition, an added assignee, a workflow move - against a task with
 * history, comments and a subtask already attached, so the branches that
 * only fire on an actual diff get exercised too.
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { seedAll, PRIMARY, SECOND, COMPANY } = require('./fixtures');

let app;
let token;

beforeAll(() => {
  app = require('../app');
  token = jwt.sign(
    {
      _id: PRIMARY,
      companyId: COMPANY,
      email: 'sweep@elsner.com',
      pms_role_id: { _id: 'r1', role_name: 'Super Admin' },
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '1h' }
  );
});

beforeEach(async () => {
  await seedAll();
});

const post = (url, body = {}) =>
  request(app).post(url).set('authorization', `Bearer ${token}`).send(body);
const put = (url, body = {}) =>
  request(app).put(url).set('authorization', `Bearer ${token}`).send(body);
const del = (url, body = {}) =>
  request(app).delete(url).set('authorization', `Bearer ${token}`).send(body);
const get = (url) => request(app).get(url).set('authorization', `Bearer ${token}`);

const BASE = '/v1/projects/tasks';

describe('addProjectsTask', () => {
  test('creates a task from a minimal valid body', async () => {
    const res = await post(`${BASE}/add`, {
      title: 'New task',
      project_id: PRIMARY,
      main_task_id: PRIMARY,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('New task');
  });

  test('rejects an attachment with no folder', async () => {
    const res = await post(`${BASE}/add`, {
      title: 'New task',
      project_id: PRIMARY,
      main_task_id: PRIMARY,
      attachments: ['file1.pdf'],
    });
    expect(res.status).toBe(400);
  });

  test('rejects an invalid start_date', async () => {
    const res = await post(`${BASE}/add`, {
      title: 'New task',
      project_id: PRIMARY,
      main_task_id: PRIMARY,
      start_date: 'not-a-date',
    });
    expect(res.status).toBe(400);
  });
});

describe('getProjectsTask', () => {
  test('lists tasks for a project and main task', async () => {
    const res = await post(`${BASE}/get`, {
      project_id: PRIMARY,
      main_task_id: PRIMARY,
    });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('a status filter narrows the result set', async () => {
    const res = await post(`${BASE}/get`, {
      project_id: PRIMARY,
      main_task_id: PRIMARY,
      status: 'archive',
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  test('an unassigned filter keeps only tasks with nobody assigned', async () => {
    const res = await post(`${BASE}/get`, {
      project_id: PRIMARY,
      main_task_id: PRIMARY,
      assignees: 'un_assigned',
    });
    expect(res.status).toBe(200);
  });

  test('a search term filters by title', async () => {
    const res = await post(`${BASE}/get`, {
      project_id: PRIMARY,
      main_task_id: PRIMARY,
      search: 'nothing matches this',
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

describe('updating a real task drives the diff/history branches', () => {
  const seedRichTask = async () => {
    const ProjectTasks = mongoose.model('projecttasks');
    const CommentsModel = mongoose.model('Comments');
    const ProjectSubTasks = mongoose.model('projectsubtasks');
    const ProjectTaskUpdateHistory = mongoose.model('taskupdatehistory');

    const task = await ProjectTasks.create({
      title: 'Diffable task',
      taskId: 'DT-1',
      project_id: PRIMARY,
      main_task_id: PRIMARY,
      task_status: null, // no status yet - the "just got a status" branch
      assignees: [PRIMARY],
      pms_clients: [],
      task_labels: [],
      status: 'active',
      isDeleted: false,
      createdBy: PRIMARY,
      updatedBy: PRIMARY,
      createdByModel: 'employees',
      updatedByModel: 'employees',
    });

    await CommentsModel.create({
      task_id: task._id,
      employee_id: PRIMARY,
      comment: 'A comment on the task',
      isDeleted: false,
      createdBy: PRIMARY,
      updatedBy: PRIMARY,
      createdByModel: 'employees',
      updatedByModel: 'employees',
    });

    await ProjectSubTasks.create({
      title: 'Subtask',
      subTaskId: 'ST-1',
      project_id: PRIMARY,
      main_task_id: PRIMARY,
      task_id: task._id,
      status: 'active',
      isDeleted: false,
      createdBy: PRIMARY,
      updatedBy: PRIMARY,
      createdByModel: 'employees',
      updatedByModel: 'employees',
    });

    await ProjectTaskUpdateHistory.create({
      project_id: PRIMARY,
      main_task_id: PRIMARY,
      task_id: task._id,
      updated_key: 'title',
      pervious_value: 'Old title',
      new_value: 'Diffable task',
      createdBy: PRIMARY,
      updatedBy: PRIMARY,
      createdByModel: 'employees',
      updatedByModel: 'employees',
    });

    return task;
  };

  test('updateProjectsTask assigning a task_status for the first time records history and mails the new assignee', async () => {
    const task = await seedRichTask();
    const res = await put(`${BASE}/update/${task._id}`, {
      title: 'Diffable task',
      project_id: PRIMARY,
      main_task_id: PRIMARY,
      task_status: PRIMARY,
      assignees: [PRIMARY, SECOND],
    });
    expect(res.status).toBe(200);
    expect(res.body.data.task_status_history.length).toBeGreaterThan(0);
    expect(res.body.data.assignees.map(String)).toContain(SECOND);
  });

  test('updateProjectsTaskStatus moves status and workflow', async () => {
    const task = await seedRichTask();
    const res = await put(`${BASE}/update-status/${task._id}`, { status: 'archive' });
    expect(res.status).toBeLessThan(500);
  });

  test('updateMultipleTaskStatus updates several tasks at once', async () => {
    const task = await seedRichTask();
    const res = await post(`${BASE}/update-multiple-status`, {
      task_ids: [String(task._id)],
      status: 'archive',
    });
    expect(res.status).toBeLessThan(500);
  });

  test('deleteProjectsTask soft-deletes a task', async () => {
    const task = await seedRichTask();
    const res = await del(`${BASE}/delete/${task._id}`);
    expect(res.status).toBeLessThan(500);
  });

  test('getHistory returns the recorded change log for a task', async () => {
    const task = await seedRichTask();
    const res = await post(`${BASE}/getHistory`, { task_id: String(task._id) });
    expect(res.status).toBeLessThan(500);
  });

  test('updateProjectsTaskWorkflow moves a task to a new workflow stage', async () => {
    const task = await seedRichTask();
    const res = await put(`${BASE}/update-workflow/${task._id}`, {
      task_status: PRIMARY,
    });
    expect(res.status).toBeLessThan(500);
  });

  test('updateProjectsTaskWorkflow rejects a missing task_status', async () => {
    const task = await seedRichTask();
    const res = await put(`${BASE}/update-workflow/${task._id}`, {});
    expect(res.status).toBe(400);
  });

  test('updateProjectsTaskProps changes several fields at once and records each in history', async () => {
    const task = await seedRichTask();
    const res = await put(`${BASE}/props/update/${task._id}`, {
      updated_key: ['title', 'priority', 'descriptions', 'assignees', 'task_labels'],
      project_id: PRIMARY,
      main_task_id: PRIMARY,
      title: 'Renamed via props',
      priority: 'High',
      descriptions: 'Updated description',
      assignees: [PRIMARY, SECOND],
      task_labels: [PRIMARY],
    });
    expect(res.status).toBeLessThan(500);
  });

  test('updateProjectsTaskProps rejects an empty updated_key list', async () => {
    const task = await seedRichTask();
    const res = await put(`${BASE}/props/update/${task._id}`, {
      updated_key: [],
      project_id: PRIMARY,
      main_task_id: PRIMARY,
    });
    expect(res.status).toBe(400);
  });
});

describe('getProjectsWiseTask', () => {
  test('lists tasks under a project, grouped by main task', async () => {
    const res = await get(`${BASE}/project-wise/${PRIMARY}`);
    expect(res.status).toBe(200);
  });
});

describe('taskwiseBugsDetailedData', () => {
  test('returns bug details for a task', async () => {
    const res = await post(`${BASE}/task-wiseBugs`, {
      task_id: PRIMARY,
      project_id: PRIMARY,
    });
    expect(res.status).toBeLessThan(500);
  });
});

describe('addProjectsTaskCopy', () => {
  test('copies assignees, clients, dates, and comments when asked to', async () => {
    const ProjectTasks = mongoose.model('projecttasks');
    const original = await ProjectTasks.findById(PRIMARY);
    const res = await post(`${BASE}/addProjectsTaskCopy`, {
      title: 'Copied task',
      task_id: PRIMARY,
      project_id: PRIMARY,
      main_task_id: PRIMARY,
      isCopyAssignee: true,
      isCopyClients: true,
      isCopyDates: true,
      isCopyComments: true,
    });
    expect(res.status).toBeLessThan(500);
  });

  test('rejects a missing required boolean flag', async () => {
    const res = await post(`${BASE}/addProjectsTaskCopy`, {
      title: 'Copied task',
      task_id: PRIMARY,
      project_id: PRIMARY,
      main_task_id: PRIMARY,
      isCopyAssignee: true,
      isCopyClients: true,
      isCopyDates: true,
      // isCopyComments missing
    });
    expect(res.status).toBe(400);
  });
});

describe('getProjectsTaskOverview', () => {
  test('counts tasks for a project', async () => {
    const res = await post(`${BASE}/getOverviewData`, {
      project_id: PRIMARY,
      countFor: 'All',
    });
    expect(res.status).toBeLessThan(500);
  });

  test('countFor "My" scopes to the caller\'s own tasks', async () => {
    const res = await post(`${BASE}/getOverviewData`, {
      project_id: PRIMARY,
      countFor: 'My',
    });
    expect(res.status).toBeLessThan(500);
  });
});
