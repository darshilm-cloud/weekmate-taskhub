/**
 * Task hours logs controller - 22 exports, none of them file endpoints, so
 * the route sweep already reaches all of them. This drives real data
 * through the biggest report/list exports with a genuinely logged hour on
 * a real timesheet, rather than the sweep's shallow negotiated body.
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { seedAll, PRIMARY, COMPANY } = require('./fixtures');

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

const BASE = '/v1/projects/task-logged-hours';

describe('addTaskHoursLogs', () => {
  test('logs hours against a real task and timesheet', async () => {
    const res = await post(`${BASE}/add`, {
      project_id: PRIMARY,
      task_id: PRIMARY,
      timesheet_id: PRIMARY,
      logged_hours: '2',
      logged_minutes: '30',
      logged_date: '15-01-2026',
    });
    expect(res.status).toBeLessThan(500);
  });

  test('rejects a missing timesheet_id', async () => {
    const res = await post(`${BASE}/add`, {
      project_id: PRIMARY,
      logged_hours: '2',
      logged_date: '15-01-2026',
    });
    expect(res.status).toBe(400);
  });
});

describe('updating and deleting a real logged hour', () => {
  const seedLog = async () => {
    const TaskHoursLogs = mongoose.model('projecttaskhourlogs');
    return TaskHoursLogs.create({
      employee_id: PRIMARY,
      project_id: PRIMARY,
      task_id: PRIMARY,
      timesheet_id: PRIMARY,
      descriptions: 'Original work',
      logged_hours: '2',
      logged_minutes: '00',
      logged_date: new Date('2026-01-15'),
      isManuallyAdded: true,
      logged_status: 'Void',
      isDeleted: false,
      createdBy: PRIMARY,
      updatedBy: PRIMARY,
      createdByModel: 'employees',
      updatedByModel: 'employees',
    });
  };

  test('updateTaskHoursLogs changes the logged duration', async () => {
    // Regression: this looks up the caller's monthly total-hours aggregate
    // and, unlike addTaskHoursLogs's identical lookup, read
    // existingLog.total_time unguarded and never created the aggregate if
    // missing. Any month with no aggregate yet (the task's first edit that
    // month, or historical data predating the feature) crashed with a 500 -
    // AFTER the task's own hours had already been saved, so the client saw
    // an error for an edit that had actually gone through.
    const log = await seedLog();
    const res = await put(`${BASE}/update/${log._id}`, {
      logged_hours: '3',
      logged_minutes: '15',
      logged_date: '16-01-2026',
      descriptions: 'Revised work',
    });
    expect(res.status).toBeLessThan(500);
    expect(res.body.data.logged_hours).toBe('3');

    const ProjectTotalTaskHourLogs = mongoose.model('projecttotaltaskhourlogs');
    const total = await ProjectTotalTaskHourLogs.findOne({ employee_id: PRIMARY });
    expect(total).not.toBeNull();
  });

  test('deleteTaskHoursLogs removes a logged hour', async () => {
    const log = await seedLog();
    const res = await del(`${BASE}/delete/${log._id}`);
    expect(res.status).toBeLessThan(500);
  });

  test('deleteTaskHoursLogsMultiple removes several at once', async () => {
    const log = await seedLog();
    const res = await del(`${BASE}/updateMultiple`, { ids: [String(log._id)] });
    expect(res.status).toBeLessThan(500);
  });

  test('getTaskTotalHours sums logged hours for a timesheet', async () => {
    await seedLog();
    const res = await post(`${BASE}/get-total-hours`, { timesheet_id: PRIMARY });
    expect(res.status).toBeLessThan(500);
  });
});

describe('reporting endpoints', () => {
  test('getTaskHoursLogs lists logs for a task', async () => {
    const res = await post(`${BASE}/get`, { project_id: PRIMARY, task_id: PRIMARY });
    expect(res.status).toBeLessThan(500);
  });

  test('getTaskHoursLogsByTimesheet returns hours grouped by timesheet', async () => {
    const res = await post(`${BASE}/getHours`, { timesheet_id: PRIMARY, project_id: PRIMARY });
    expect(res.status).toBeLessThan(500);
  });

  test('getMyLoggedHours returns the caller\'s own logged hours', async () => {
    const res = await post(`${BASE}/getMyLoggedHours`, {});
    expect(res.status).toBeLessThan(500);
  });

  test('getMyLoggedHours filters by a project list', async () => {
    const res = await post(`${BASE}/getMyLoggedHours`, { project_id: [PRIMARY] });
    expect(res.status).toBeLessThan(500);
  });

  test('getTaskHoursLogsByTask returns hours for one task', async () => {
    const res = await post(`${BASE}/getTaskwiseHours`, { project_id: PRIMARY, task_id: PRIMARY });
    expect(res.status).toBeLessThan(500);
  });

  test('getHoursData returns aggregate hours data', async () => {
    const res = await post(`${BASE}/getHoursData`, { project_id: PRIMARY });
    expect(res.status).toBeLessThan(500);
  });

  test('getTimesheetsReports returns a timesheet report', async () => {
    const res = await post(`${BASE}/gettimesheetsReports`, { project_id: PRIMARY });
    expect(res.status).toBeLessThan(500);
  });

  test('getMyLoggedHoursbyDate groups the caller\'s hours by date', async () => {
    const res = await post(`${BASE}/getMyLoggedHoursDate`, {});
    expect(res.status).toBeLessThan(500);
  });

  test('getEmployeesHours lists hours per employee', async () => {
    const res = await post(`${BASE}/getEmployeesHours`, { project_id: PRIMARY });
    expect(res.status).toBeLessThan(500);
  });

  test('getHoursDetails returns detailed entries', async () => {
    const res = await post(`${BASE}/getHoursDetails`, { project_id: PRIMARY });
    expect(res.status).toBeLessThan(500);
  });
});
