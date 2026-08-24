/**
 * Maintenance controller.
 *
 * addDummyTestData builds a whole company's worth of demo data - a project,
 * its workflow, main tasks, tasks, bugs, notes, discussions, comments, time
 * logs - in one linear ~900-line pass. One successful call exercises nearly
 * all of it, which the route sweep's Joi-shaped negotiation never reached:
 * this controller validates by hand ("Invalid company ID"), a message shape
 * the negotiator's Joi-pattern matching doesn't recognize, so the sweep never
 * got past the first guard here.
 *
 * setupAfterEnv.js wipes every collection in a global afterEach, so fixtures
 * are reseeded before every test rather than once in beforeAll - and steps
 * that depend on each other (create, then delete what was created) live in
 * one test rather than being split across tests that would not see each
 * other's data.
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

  // addDummyTestData looks roles up BY NAME ("Admin", "Client", "TL", ...)
  // against settings/config.json's PMS_ROLES - fixtures.js has no way to know
  // that role_name needs one of those specific values (it is not a schema
  // enum, just a required unique string), so it seeds a generic placeholder.
  // Replace it with the roles this endpoint actually looks for.
  const PMSRoles = mongoose.model('pms_roles');
  await PMSRoles.deleteMany({});
  const CONFIG_JSON = require('../settings/config.json');
  await PMSRoles.insertMany(
    Object.values(CONFIG_JSON.PMS_ROLES).map((role_name) => ({ role_name }))
  );
}, 60000);

const post = (url, body = {}) =>
  request(app)
    .post(url)
    .set('authorization', `Bearer ${token}`)
    .send(body)
    .timeout({ deadline: 20000 });

describe('addDummyTestData / deleteDummyTestData', () => {
  test('rejects a missing or invalid company id', async () => {
    const res = await post('/v1/maintenance/addTestData', {});
    expect(res.status).toBe(400);
  });

  test('reports not-found for a well-formed id that matches no company', async () => {
    const res = await post('/v1/maintenance/addTestData', {
      companyId: '0123456789abcdef01234567',
    });
    expect(res.status).toBe(404);
  });

  test('builds a full project graph, then deleteDummyTestData removes exactly what it created', async () => {
    // fixtures.js seeds three documents into every collection, including
    // companies, keyed on PRIMARY/SECOND/THIRD - so PRIMARY resolves here.
    const buildRes = await post('/v1/maintenance/addTestData', { companyId: PRIMARY });
    expect(buildRes.status).toBe(201);
    const created = buildRes.body.data;

    // A sample of the collections a full run should have populated.
    expect(created.projects?.length).toBeGreaterThan(0);
    expect(created.projecttasks?.length).toBeGreaterThan(0);
    expect(created.projecttaskbugs?.length).toBeGreaterThan(0);
    expect(created.notes_pms?.length).toBeGreaterThan(0);
    expect(created.discussionstopics?.length).toBeGreaterThan(0);

    const projectId = created.projects[0];
    const delRes = await post('/v1/maintenance/deleteTestData', {
      recordIds: { projects: [projectId] },
    });
    expect(delRes.status).toBe(200);
    expect(delRes.body.data.deletionResults.projects.deleted).toBe(1);

    const Projects = mongoose.model('projects');
    expect(await Projects.findById(projectId)).toBeNull();
  });

  test('deleteDummyTestData rejects a malformed request body', async () => {
    const res = await post('/v1/maintenance/deleteTestData', { recordIds: 'not-an-object' });
    expect(res.status).toBe(400);
  });

  test('deleteDummyTestData skips collections it does not recognize', async () => {
    const res = await post('/v1/maintenance/deleteTestData', {
      recordIds: { not_a_real_collection: [PRIMARY] },
    });
    expect(res.status).toBe(200);
    expect(res.body.data.totalDeleted).toBe(0);
  });
});

describe('getEmployeeOverviewData', () => {
  test('rejects a request with no email', async () => {
    const res = await post('/v1/maintenance/getEmployeeOverviewData', {});
    expect(res.status).toBe(400);
  });

  test('reports not-found for an email that matches nobody', async () => {
    const res = await post('/v1/maintenance/getEmployeeOverviewData', {
      email: 'nobody-here@elsner.com',
    });
    expect(res.status).toBe(400);
  });

  test('returns an overview for a real employee, with or without active projects', async () => {
    // fixtures.js derives each seeded document's email from its id's last 4
    // hex digits: PRIMARY ends "9011".
    const res = await post('/v1/maintenance/getEmployeeOverviewData', {
      email: 'sweep+9011@elsner.com',
    });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('deleteCompanyData', () => {
  test('requires a private key', async () => {
    const res = await post('/v1/maintenance/delete-company-data', { companyId: PRIMARY });
    expect(res.status).toBe(401);
  });

  test('rejects the wrong private key', async () => {
    const res = await post('/v1/maintenance/delete-company-data', {
      companyId: PRIMARY,
      private_key: 'definitely-wrong',
    });
    expect(res.status).toBe(403);
  });
});
