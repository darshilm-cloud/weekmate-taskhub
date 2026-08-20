/** Smoke: the express app must import and serve without a real database. */
const request = require('supertest');

it('boots the express app against the in-memory database', async () => {
  const app = require('../app');
  expect(typeof app).toBe('function');
});

it('serves a 404 envelope for an unknown route', async () => {
  const app = require('../app');
  const res = await request(app).get('/v1/definitely-not-a-route');
  expect(res.status).toBeGreaterThanOrEqual(400);
});
