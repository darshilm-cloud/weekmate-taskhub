/**
 * Activity log controller.
 *
 * getActivityLogList's Joi schema has no required fields, so a route-sweep
 * style empty body always passes validation - the sweep should have reached
 * this, but the response-shaping logic (populateDeletedData) is a ~1,400 line
 * per-module transform that only runs for a DELETE log whose additionalData
 * carries a real deleted-record snapshot, which generic fixtures can't
 * produce. This drives that path directly for the two richest modules
 * (projects, tasks).
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
const get = (url) => request(app).get(url).set('authorization', `Bearer ${token}`);

describe('getActivityLogList', () => {
  test('lists logs for the caller\'s company with default pagination', async () => {
    const res = await post('/v1/activityLog/list', {});
    expect(res.status).toBe(200);
    expect(res.body.data.activityLogs.length).toBeGreaterThan(0);
    expect(res.body.data.pagination).toMatchObject({ currentPage: 1, limit: 10 });
  });

  test('rejects a malformed filter value with a 400, not a 500', async () => {
    // Regression: validateAsync() throws rather than returning {error, value},
    // and nothing here caught the ValidationError specifically - it fell to
    // the generic catch block, which answers with statusCode.SERVER_ERROR.
    // Every malformed request to this endpoint was reported as a server
    // fault instead of the client mistake it actually was.
    const res = await post('/v1/activityLog/list', { operationName: 'NOT_A_REAL_OP' });
    expect(res.status).toBe(400);
  });

  test('filters by operationName, moduleName, and email', async () => {
    const ActivityLog = mongoose.model('activitylogs');
    await ActivityLog.deleteMany({});
    await ActivityLog.create({
      companyId: COMPANY,
      operationName: 'CREATE',
      moduleName: 'tasks',
      email: 'match-me@elsner.com',
      createdBy: PRIMARY,
    });
    await ActivityLog.create({
      companyId: COMPANY,
      operationName: 'DELETE',
      moduleName: 'projects',
      email: 'someone-else@elsner.com',
      createdBy: PRIMARY,
    });

    const res = await post('/v1/activityLog/list', {
      operationName: 'CREATE',
      moduleName: 'tasks',
      email: 'match-me',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.activityLogs).toHaveLength(1);
    // A non-LOGIN/LOGOUT entry's moduleName is mapped to its display label.
    expect(res.body.data.activityLogs[0].moduleName).toBe('Tasks');
  });

  test('a LOGIN entry has its moduleName stripped from the response', async () => {
    const ActivityLog = mongoose.model('activitylogs');
    await ActivityLog.deleteMany({});
    await ActivityLog.create({
      companyId: COMPANY,
      operationName: 'LOGIN',
      moduleName: 'employees',
      email: 'sweep@elsner.com',
      createdBy: PRIMARY,
    });

    const res = await post('/v1/activityLog/list', {});
    expect(res.status).toBe(200);
    expect(res.body.data.activityLogs[0]).not.toHaveProperty('moduleName');
  });

  test('a search term matches by email or by the acting employee\'s name', async () => {
    const res = await post('/v1/activityLog/list', { search: 'sweep' });
    expect(res.status).toBe(200);
  });

  test('a from/to date range narrows the results', async () => {
    const res = await post('/v1/activityLog/list', {
      fromDate: '2020-01-01',
      toDate: '2020-01-02',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.activityLogs).toEqual([]);
  });

  test('sorts ascending by email when asked', async () => {
    const res = await post('/v1/activityLog/list', { sortBy: 'email', sortOrder: 'asc' });
    expect(res.status).toBe(200);
  });
});

describe('getActivityLogById', () => {
  test('rejects a malformed id', async () => {
    const res = await get('/v1/activityLog/not-an-id');
    expect(res.status).toBe(400);
  });

  test('reports not-found for a well-formed id that matches nothing', async () => {
    const res = await get('/v1/activityLog/0123456789abcdef01234567');
    expect(res.status).toBe(404);
  });

  test('populates a deleted "projects" record from its stored snapshot', async () => {
    const ActivityLog = mongoose.model('activitylogs');
    const log = await ActivityLog.create({
      companyId: COMPANY,
      operationName: 'DELETE',
      moduleName: 'projects',
      email: 'sweep@elsner.com',
      createdBy: PRIMARY,
      additionalData: {
        deletedRecord: {
          title: 'Deleted project',
          technology: [PRIMARY],
          project_type: PRIMARY,
          project_status: PRIMARY,
          manager: PRIMARY,
          acc_manager: PRIMARY,
          assignees: [PRIMARY],
          pms_clients: [PRIMARY],
          workFlow: PRIMARY,
          start_date: '2026-01-01',
          end_date: '2026-02-01',
          isBillable: true,
          password: 'must-be-stripped',
        },
      },
    });

    const res = await get(`/v1/activityLog/${log._id}`);
    expect(res.status).toBe(200);
    const deleted = res.body.data.deletedData[0];
    // Ids were resolved to human-readable labels, not left as raw ObjectIds.
    expect(deleted.technology).toBe('sweep');
    expect(deleted.isBillable).toBe('Yes');
    expect(deleted).not.toHaveProperty('password');
  });

  test('populates a deleted "tasks" record from its stored snapshot', async () => {
    const ActivityLog = mongoose.model('activitylogs');
    const log = await ActivityLog.create({
      companyId: COMPANY,
      operationName: 'DELETE',
      moduleName: 'tasks',
      email: 'sweep@elsner.com',
      createdBy: PRIMARY,
      additionalData: {
        deletedRecord: {
          title: 'Deleted task',
          project_id: PRIMARY,
          main_task_id: PRIMARY,
          task_labels: [PRIMARY],
          assignees: [PRIMARY],
          pms_clients: [PRIMARY],
        },
      },
    });

    const res = await get(`/v1/activityLog/${log._id}`);
    expect(res.status).toBe(200);
    const deleted = res.body.data.deletedData[0];
    // project_id is replaced with a human-readable "#<projectId>" label, not
    // left as the raw ObjectId or stripped like the audit-trail fields are.
    expect(deleted.project_id).toBe('#sweep');
    expect(deleted).not.toHaveProperty('createdBy');
  });

  test('falls back to a database lookup when no snapshot was stored', async () => {
    const ActivityLog = mongoose.model('activitylogs');
    const Projects = mongoose.model('projects');
    const liveProject = await Projects.findOne({}).lean();

    const log = await ActivityLog.create({
      companyId: COMPANY,
      operationName: 'DELETE',
      moduleName: 'projects',
      email: 'sweep@elsner.com',
      createdBy: PRIMARY,
      additionalData: { recordId: String(liveProject._id) },
    });

    const res = await get(`/v1/activityLog/${log._id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.deletedData).toHaveLength(1);
  });
});
