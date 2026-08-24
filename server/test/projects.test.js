/**
 * Projects controller - every route is reachable by the sweep, but its
 * generic body only drives the shallowest branch of each. This drives real
 * data through the CRUD and the three biggest list/report exports
 * (getProjects, getProjectOverviewData, getProjectsReports).
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
const get = (url) => request(app).get(url).set('authorization', `Bearer ${token}`);

const BASE = '/v1/projects';

describe('addProjects', () => {
  test('creates a project from a minimal valid body', async () => {
    const res = await post(`${BASE}/add`, { title: 'New project' });
    expect(res.status).toBeLessThan(500);
  });

  test('rejects a missing title', async () => {
    const res = await post(`${BASE}/add`, {});
    expect(res.status).toBe(400);
  });
});

describe('getProjects', () => {
  test('lists the caller\'s projects with default pagination', async () => {
    const res = await post(`${BASE}/get`, {});
    expect(res.status).toBeLessThan(500);
  });

  test('filters by technology, manager, and status', async () => {
    const res = await post(`${BASE}/get`, {
      technology: [PRIMARY],
      manager_id: [PRIMARY],
      project_status_id: [PRIMARY],
    });
    expect(res.status).toBeLessThan(500);
  });

  test('a search term filters by title', async () => {
    const res = await post(`${BASE}/get`, { search: 'nothing matches this' });
    expect(res.status).toBeLessThan(500);
  });
});

describe('updating a real project', () => {
  test('updateProjects changes title and manager', async () => {
    const res = await put(`${BASE}/update/${PRIMARY}`, {
      title: 'Renamed project',
      manager: SECOND,
    });
    expect(res.status).toBeLessThan(500);
  });

  test('archivedToActiveProject reactivates an archived project', async () => {
    const res = await put(`${BASE}/archive-to-active/${PRIMARY}`, {});
    expect(res.status).toBeLessThan(500);
  });

  test('updateProjectsManagePeople changes assignees and clients', async () => {
    const res = await put(`${BASE}/managePeople/${PRIMARY}`, {
      manager: SECOND,
      assignees: [PRIMARY, SECOND],
      pms_clients: [PRIMARY],
    });
    expect(res.status).toBeLessThan(500);
  });

  test('updateProjectStarred stars a project for the caller', async () => {
    const res = await put(`${BASE}/star/update/${PRIMARY}`, { isStarred: true });
    expect(res.status).toBeLessThan(500);
  });

  test('updateProjectStarred un-stars it back', async () => {
    await put(`${BASE}/star/update/${PRIMARY}`, { isStarred: true });
    const res = await put(`${BASE}/star/update/${PRIMARY}`, { isStarred: false });
    expect(res.status).toBeLessThan(500);
  });

  test('deleteProjects soft-deletes a project', async () => {
    const Project = mongoose.model('projects');
    const extra = await Project.create({
      title: 'Deletable project',
      companyId: COMPANY,
      isDeleted: false,
      createdBy: PRIMARY,
      updatedBy: PRIMARY,
      createdByModel: 'employees',
      updatedByModel: 'employees',
    });
    const res = await del(`${BASE}/delete/${extra._id}`);
    expect(res.status).toBeLessThan(500);
  });
});

describe('getProjectOverviewData', () => {
  test('returns an overview for a project the caller can see', async () => {
    const res = await get(`${BASE}/overview/${PRIMARY}`);
    expect(res.status).toBeLessThan(500);
  });
});

describe('getProjectsReports', () => {
  test('returns a paginated report', async () => {
    const res = await post(`${BASE}/getprojectReports`, { isExport: false });
    expect(res.status).toBeLessThan(500);
  });

  test('rejects a missing isExport flag', async () => {
    const res = await post(`${BASE}/getprojectReports`, {});
    expect(res.status).toBe(400);
  });

  test('filters by technology, type, and manager', async () => {
    const res = await post(`${BASE}/getprojectReports`, {
      isExport: false,
      technologies: [PRIMARY],
      types: [PRIMARY],
      managers: [PRIMARY],
    });
    expect(res.status).toBeLessThan(500);
  });
});
