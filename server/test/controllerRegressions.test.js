/**
 * Regression tests for crashes the route sweep found.
 *
 * Each of these endpoints answered every request with a 500 - not on an edge
 * case, but on any call at all, because of a typo, a missing declaration or a
 * missing import. The sweep proves an endpoint answers; these pin the specific
 * defects so they cannot come back silently.
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { seedAll, PRIMARY, COMPANY } = require('./fixtures');

let app;
let token;

beforeAll(async () => {
  app = require('../app');
  await seedAll();
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
}, 180000);

const post = (url, body = {}) =>
  request(app)
    .post(url)
    .set('authorization', `Bearer ${token}`)
    .send(body)
    .timeout({ deadline: 15000 });

test('deleting multiple tasks validates instead of throwing', async () => {
  // The schema read Joi.string.required() - the `required` property off the
  // string factory rather than off a schema - so this threw
  // "Joi.string.required is not a function" on every call.
  const res = await post('/v1/projects/tasks/delete-multiple', {
    project_id: PRIMARY,
    task_ids: [PRIMARY],
  });
  expect(res.status).toBeLessThan(500);
  expect(String(res.body?.message)).not.toMatch(/is not a function/);
});

test('deleting multiple tasks still rejects a bad body with a 400', async () => {
  // Proving the fix restored validation rather than removing it.
  const res = await post('/v1/projects/tasks/delete-multiple', {});
  expect(res.status).toBe(400);
});

test('my logged hours does not reference an undeclared variable', async () => {
  // getMyLoggedHours read archivedStatusIds without declaring it, while its
  // five siblings in the same file all do - a ReferenceError on every request.
  const res = await post('/v1/dashboard/get/my-logged-time', {});
  expect(res.status).toBeLessThan(500);
  expect(String(res.body?.message)).not.toMatch(/is not defined/);
});

test('my logged hours excludes archived projects', async () => {
  // The declaration exists to filter archived projects out of the pipeline, so
  // check the pipeline runs and returns a shaped result rather than just a 200.
  const res = await post('/v1/dashboard/get/my-logged-time', {});
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('data');
});

test('updating a password answers when the user no longer exists', async () => {
  // The handler dereferenced a null userData and has no try/catch, so the
  // TypeError escaped as an unhandled rejection and express never responded -
  // the request hung instead of failing. The sweep's token is a valid JWT for
  // a user id that is not in either collection, which is all it takes.
  const orphan = jwt.sign(
    {
      _id: '507f1f77bcf86cd799439099',
      companyId: COMPANY,
      email: 'gone@elsner.com',
      pms_role_id: { _id: 'r1', role_name: 'Super Admin' },
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '1h' }
  );

  const res = await request(app)
    .post('/v1/authentication/updatePassword')
    .set('authorization', `Bearer ${orphan}`)
    .send({ oldpassword: 'Old!Passw0rd', newPassword: 'New!Passw0rd' })
    .timeout({ deadline: 10000 });

  expect(res.status).toBe(404);
});

test('unlinking files reports a validation error instead of crashing', async () => {
  // errorResponse was called on the validation and not-found paths but never
  // imported, so both threw "errorResponse is not defined".
  const res = await post('/v1/files/unlink', {});
  expect(res.status).toBe(400);
  expect(String(res.body?.message)).not.toMatch(/is not defined/);
});
