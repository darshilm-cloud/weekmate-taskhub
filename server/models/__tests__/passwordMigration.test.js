/**
 * Password storage migration, end to end against a real (in-memory) database.
 *
 * Existing rows hold unsalted MD5 - and some hold plaintext, because the old
 * comparePassword fell back to a direct string match. This proves those users
 * can still log in, that their stored hash is upgraded to bcrypt when they do,
 * and that a wrong password is still rejected in every format.
 */
const mongoose = require('mongoose');
const crypto = require('crypto');
const pw = require('../../helpers/password');

const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');
const compare = (doc, candidate) =>
  new Promise((res, rej) => doc.comparePassword(candidate, (e, ok) => (e ? rej(e) : res(ok))));

let Employees;
beforeAll(() => {
  require('../../app');            // registers the models against the test database
  Employees = mongoose.model('employees');
});

/** Insert a row with a raw stored value, bypassing the hashing pre-save hook. */
const seedRaw = async (email, storedPassword) => {
  await Employees.collection.insertOne({
    first_name: 'Legacy', last_name: 'User', email,
    password: storedPassword, isActivate: true,
  });
  return Employees.findOne({ email });
};

describe('new passwords', () => {
  it('are stored as bcrypt, never as MD5 or plaintext', async () => {
    const u = await Employees.create({
      first_name: 'New', last_name: 'User',
      email: 'new@elsner.com', password: 'hunter22', isActivate: true,
    });
    expect(pw.isBcrypt(u.password)).toBe(true);
    expect(u.password).not.toBe('hunter22');
    expect(u.password).not.toBe(md5('hunter22'));
  });

  it('verify correctly', async () => {
    const u = await Employees.create({
      first_name: 'New', last_name: 'User',
      email: 'new2@elsner.com', password: 'hunter22', isActivate: true,
    });
    expect(await compare(u, 'hunter22')).toBe(true);
    expect(await compare(u, 'wrong')).toBe(false);
  });

  it('are re-hashed only when actually changed', async () => {
    const u = await Employees.create({
      first_name: 'N', last_name: 'U', email: 'new3@elsner.com',
      password: 'hunter22', isActivate: true,
    });
    const first = u.password;
    u.first_name = 'Renamed';
    await u.save();
    expect(u.password).toBe(first);
  });
});

describe('legacy MD5 rows', () => {
  it('still accept the correct password', async () => {
    const u = await seedRaw('md5@elsner.com', md5('hunter22'));
    expect(await compare(u, 'hunter22')).toBe(true);
  });

  it('are upgraded to bcrypt in the database after a successful login', async () => {
    const u = await seedRaw('md5b@elsner.com', md5('hunter22'));
    expect(pw.isMd5(u.password)).toBe(true);
    await compare(u, 'hunter22');
    const after = await Employees.findOne({ email: 'md5b@elsner.com' });
    expect(pw.isBcrypt(after.password)).toBe(true);
    expect(pw.isMd5(after.password)).toBe(false);
  });

  it('still verify after the upgrade', async () => {
    const u = await seedRaw('md5c@elsner.com', md5('hunter22'));
    await compare(u, 'hunter22');
    const after = await Employees.findOne({ email: 'md5c@elsner.com' });
    expect(await compare(after, 'hunter22')).toBe(true);
    expect(await compare(after, 'wrong')).toBe(false);
  });

  it('reject a wrong password and are left untouched', async () => {
    const u = await seedRaw('md5d@elsner.com', md5('hunter22'));
    expect(await compare(u, 'wrong')).toBe(false);
    const after = await Employees.findOne({ email: 'md5d@elsner.com' });
    expect(pw.isMd5(after.password)).toBe(true);
  });
});

describe('legacy plaintext rows', () => {
  it('still accept the correct password', async () => {
    const u = await seedRaw('plain@elsner.com', 'hunter22');
    expect(await compare(u, 'hunter22')).toBe(true);
  });

  it('are upgraded to bcrypt, removing the plaintext from the database', async () => {
    const u = await seedRaw('plain2@elsner.com', 'hunter22');
    await compare(u, 'hunter22');
    const after = await Employees.findOne({ email: 'plain2@elsner.com' });
    expect(after.password).not.toBe('hunter22');
    expect(pw.isBcrypt(after.password)).toBe(true);
  });

  it('reject a wrong password', async () => {
    const u = await seedRaw('plain3@elsner.com', 'hunter22');
    expect(await compare(u, 'wrong')).toBe(false);
  });
});

describe('malformed rows', () => {
  it('reject rather than throw when the stored password is empty', async () => {
    const u = await seedRaw('empty@elsner.com', '');
    expect(await compare(u, 'anything')).toBe(false);
  });
});
