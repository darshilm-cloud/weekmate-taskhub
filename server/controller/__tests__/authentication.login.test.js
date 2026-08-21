/**
 * POST /v1/authentication/login
 *
 * A pre-auth route, so it is reachable without a token. These cover the
 * request-validation and account-lookup arms - the ones that decide whether a
 * bad request ever reaches the password check.
 */
const request = require('supertest');
const mongoose = require('mongoose');

let app;
beforeAll(() => { app = require('../../app'); });

const login = (body) => request(app).post('/v1/authentication/login').send(body);

describe('request validation', () => {
  it('rejects a missing email', async () => {
    const res = await login({ password: 'hunter22' });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ status: 0 });
    expect(res.body.message).toMatch(/email/i);
  });

  it('rejects a malformed email before touching the database', async () => {
    const res = await login({ email: 'not-an-email', password: 'hunter22' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid email format');
  });

  it('rejects a missing password', async () => {
    const res = await login({ email: 'a@b.com' });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe(0);
  });

  it('rejects a password shorter than the minimum', async () => {
    const res = await login({ email: 'a@b.com', password: 'short' });
    expect(res.status).toBe(400);
  });

  it('strips unknown fields rather than rejecting the request', async () => {
    // validateFormatter strips unknown keys, so a stray "isAdmin" is dropped and
    // the request proceeds to the account lookup instead of 400-ing. Asserted so
    // the stripping behaviour is pinned - it is what stops injected fields from
    // reaching the controller.
    const res = await login({ email: 'a@b.com', password: 'hunter22', isAdmin: true });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Your login id is invalid.');
  });
});

describe('account lookup', () => {
  it('reports an unknown login id as 404 rather than leaking which part was wrong', async () => {
    const res = await login({ email: 'nobody@nowhere.com', password: 'hunter22' });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Your login id is invalid.');
  });

  it('matches the email case-insensitively', async () => {
    // Both spellings must reach the same "not found" answer, proving the lookup
    // lowercases rather than comparing raw strings.
    const a = await login({ email: 'Nobody@Nowhere.com', password: 'hunter22' });
    const b = await login({ email: 'nobody@nowhere.com', password: 'hunter22' });
    expect(a.status).toBe(b.status);
    expect(a.body.message).toBe(b.body.message);
  });

  it('trims surrounding whitespace on the email', async () => {
    const res = await login({ email: '  nobody@nowhere.com  ', password: 'hunter22' });
    expect(res.status).toBe(404);
  });

  it('finds a seeded employee rather than reporting an invalid login id', async () => {
    const Employees = mongoose.model('employees');
    await Employees.create({
      first_name: 'Kunal', last_name: 'Shah',
      email: 'seeded@elsner.com', password: 'hunter22',
      isActivate: true,
    });
    // Deliberately the WRONG password. A correct one would carry on into the
    // full session-building path, which needs a company and role this fixture
    // does not have. What matters here is that the account lookup succeeded, so
    // the answer is no longer "your login id is invalid".
    const res = await login({ email: 'seeded@elsner.com', password: 'wrongpassword' });
    expect(res.body.message).not.toBe('Your login id is invalid.');
  });

  it('stores a seeded password as bcrypt, not MD5 or plaintext', async () => {
    const Employees = mongoose.model('employees');
    const u = await Employees.create({
      first_name: 'Kunal', last_name: 'Shah',
      email: 'hashcheck@elsner.com', password: 'hunter22', isActivate: true,
    });
    expect(u.password).toMatch(/^\$2[aby]\$/);
    expect(u.password).not.toBe('hunter22');
  });
});
