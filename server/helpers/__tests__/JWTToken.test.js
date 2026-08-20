/**
 * JWT helpers. createSsoToken is the cross-product SSO token every sibling
 * WeekMate app verifies, so its claim shape is a contract.
 */
const jwt = require('jsonwebtoken');
const auth = require('../JWTToken');

const SECRET = 'test-secret';
beforeEach(() => { process.env.ACCESS_TOKEN_SECRET = SECRET; });

describe('createJWTToken', () => {
  it('signs the payload so it verifies with the shared secret', () => {
    const token = auth.createJWTToken({ sub: 'u1' });
    expect(jwt.verify(token, SECRET)).toMatchObject({ sub: 'u1' });
  });

  it('defaults to a one-hour expiry', () => {
    const d = jwt.verify(auth.createJWTToken({ sub: 'u1' }), SECRET);
    expect(d.exp - d.iat).toBe(3600);
  });

  it('honours an explicit expiry', () => {
    const d = jwt.verify(auth.createJWTToken({ sub: 'u1' }, '2h'), SECRET);
    expect(d.exp - d.iat).toBe(7200);
  });

  it('produces a token another secret cannot verify', () => {
    expect(() => jwt.verify(auth.createJWTToken({ sub: 'u1' }), 'other')).toThrow();
  });
});

describe('createSsoToken', () => {
  it('carries only the minimal identifying claims', () => {
    const d = jwt.verify(auth.createSsoToken({ email: 'a@b.com', companyId: 'c1', isAdmin: true }), SECRET);
    expect(d.user).toEqual({ email: 'a@b.com', companyId: 'c1', company_id: 'c1', isAdmin: true });
    expect(d.source).toBe('taskhub');
    // No profile blob should ride along in a cross-product token.
    expect(d.user.full_name).toBeUndefined();
  });

  it('defaults isAdmin to false', () => {
    const d = jwt.verify(auth.createSsoToken({ email: 'a@b.com', companyId: 'c1' }), SECRET);
    expect(d.user.isAdmin).toBe(false);
  });

  it('emits companyId under both spellings for sibling apps', () => {
    const d = jwt.verify(auth.createSsoToken({ email: 'a@b.com', companyId: 'c9' }), SECRET);
    expect(d.user.companyId).toBe('c9');
    expect(d.user.company_id).toBe('c9');
  });

  it('defaults to a one-year expiry', () => {
    const d = jwt.verify(auth.createSsoToken({ email: 'a@b.com', companyId: 'c1' }), SECRET);
    // jsonwebtoken parses "1y" via ms(), which uses a 365.25-day year.
    expect(d.exp - d.iat).toBe(Math.round(365.25 * 24 * 3600));
  });
});
