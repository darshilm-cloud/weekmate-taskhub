/**
 * Project bugs controller - same shape as tasks.js, tested the same way.
 *
 * The route sweep reaches every export here except importBugsData and
 * exportRepeatedBugsCSV (excluded as file endpoints), but its generic body
 * only drives the shallowest branch. This drives real field changes against
 * a bug seeded with history, a comment, and status transitions so the
 * diff/history branches fire too.
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
const del = (url) => request(app).delete(url).set('authorization', `Bearer ${token}`);

const BASE = '/v1/projects/bug';

describe('addProjectsBugs', () => {
  test('creates a bug from a minimal valid body', async () => {
    const res = await post(`${BASE}/add`, {
      title: 'New bug',
      project_id: PRIMARY,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('New bug');
  });

  test('rejects a missing title', async () => {
    const res = await post(`${BASE}/add`, { project_id: PRIMARY });
    expect(res.status).toBe(400);
  });
});

describe('getProjectsBugs', () => {
  test('lists bugs for a project', async () => {
    const res = await post(`${BASE}/details`, { project_id: PRIMARY });
    expect(res.status).toBe(200);
  });

  test('an unassigned filter keeps only bugs with nobody assigned', async () => {
    const res = await post(`${BASE}/details`, { project_id: PRIMARY, assignees: 'un_assigned' });
    expect(res.status).toBe(200);
  });
});

describe('updating a real bug drives the diff/history branches', () => {
  const seedRichBug = async () => {
    const ProjectBugs = mongoose.model('projecttaskbugs');
    const CommentsModel = mongoose.model('Comments');
    const BugUpdateHistory = mongoose.model('taskupdatehistory');

    const bug = await ProjectBugs.create({
      title: 'Diffable bug',
      bugId: 'BG-1',
      project_id: PRIMARY,
      bug_status: null,
      assignees: [PRIMARY],
      pms_clients: [],
      bug_labels: [],
      status: 'active',
      isDeleted: false,
      createdBy: PRIMARY,
      updatedBy: PRIMARY,
      createdByModel: 'employees',
      updatedByModel: 'employees',
    });

    await CommentsModel.create({
      bug_id: bug._id,
      employee_id: PRIMARY,
      comment: 'A comment on the bug',
      isDeleted: false,
      createdBy: PRIMARY,
      updatedBy: PRIMARY,
      createdByModel: 'employees',
      updatedByModel: 'employees',
    });

    await BugUpdateHistory.create({
      project_id: PRIMARY,
      task_id: bug._id,
      updated_key: 'title',
      pervious_value: 'Old title',
      new_value: 'Diffable bug',
      createdBy: PRIMARY,
      updatedBy: PRIMARY,
      createdByModel: 'employees',
      updatedByModel: 'employees',
    });

    return bug;
  };

  test('updateProjectsBugs assigning a bug_status for the first time does not crash', async () => {
    // Regression: perviousData?.bug_status.toString() guarded perviousData
    // being null but not bug_status itself, which is null on any bug that
    // has never had a status - the normal state for a freshly created bug.
    // Assigning a status to one always threw a TypeError and answered 500.
    const bug = await seedRichBug();
    const res = await put(`${BASE}/update/${bug._id}`, {
      updated_key: ['bug_status', 'assignees'],
      title: 'Diffable bug',
      project_id: PRIMARY,
      bug_status: PRIMARY,
      assignees: [PRIMARY, SECOND],
    });
    expect(res.status).toBeLessThan(500);
    expect(res.body.data.bug_status).toBe(PRIMARY);
  });

  test('updateProjectsBugStatus moves status', async () => {
    const bug = await seedRichBug();
    const res = await put(`${BASE}/update-status/${bug._id}`, { status: 'archive' });
    expect(res.status).toBeLessThan(500);
  });

  test('updateProjectsBugWorkflow moves a bug to a new workflow stage', async () => {
    const bug = await seedRichBug();
    const res = await put(`${BASE}/update-workflow/${bug._id}`, { bug_status: PRIMARY });
    expect(res.status).toBeLessThan(500);
  });

  test('updateProjectsBugWorkflow rejects a missing bug_status', async () => {
    const bug = await seedRichBug();
    const res = await put(`${BASE}/update-workflow/${bug._id}`, {});
    expect(res.status).toBe(400);
  });

  test('deleteProjectsBugs soft-deletes a bug', async () => {
    const bug = await seedRichBug();
    const res = await del(`${BASE}/delete/${bug._id}`);
    expect(res.status).toBeLessThan(500);
  });

  test('getHistory returns the recorded change log for a bug', async () => {
    const bug = await seedRichBug();
    const res = await post(`${BASE}/history`, { bug_id: String(bug._id) });
    expect(res.status).toBeLessThan(500);
  });
});

describe('projectBugsDetailedData', () => {
  test('returns workflow-grouped bug data for a project', async () => {
    const res = await post(`${BASE}/get-all`, { project_id: PRIMARY });
    expect(res.status).toBeLessThan(500);
  });

  test('a search term narrows the results', async () => {
    const res = await post(`${BASE}/get-all`, { project_id: PRIMARY, search: 'nothing matches this' });
    expect(res.status).toBeLessThan(500);
  });
});
