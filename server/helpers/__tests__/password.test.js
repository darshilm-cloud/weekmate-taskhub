const crypto = require('crypto');
const pw = require('../password');

const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');

describe('hash', () => {
  it('produces a bcrypt hash, not MD5', async () => {
    const h = await pw.hash('hunter22');
    expect(pw.isBcrypt(h)).toBe(true);
    expect(pw.isMd5(h)).toBe(false);
  });

  it('salts: the same password hashes differently every time', async () => {
    const [a, b] = [await pw.hash('hunter22'), await pw.hash('hunter22')];
    expect(a).not.toBe(b);
  });

  it('never contains the plaintext', async () => {
    expect(await pw.hash('hunter22')).not.toContain('hunter22');
  });

  it('hashSync agrees with the async form', async () => {
    const h = pw.hashSync('hunter22');
    expect(pw.isBcrypt(h)).toBe(true);
    expect((await pw.verify('hunter22', h)).ok).toBe(true);
  });
});

describe('verify against a bcrypt hash', () => {
  it('accepts the right password and asks for no rehash', async () => {
    const h = await pw.hash('hunter22');
    expect(await pw.verify('hunter22', h)).toEqual({ ok: true, needsRehash: false });
  });

  it('rejects the wrong password', async () => {
    const h = await pw.hash('hunter22');
    expect((await pw.verify('wrong', h)).ok).toBe(false);
  });
});

describe('verify against a legacy MD5 hash', () => {
  it('accepts the right password and flags it for rehash', async () => {
    expect(await pw.verify('hunter22', md5('hunter22')))
      .toEqual({ ok: true, needsRehash: true });
  });

  it('rejects the wrong password and asks for no rehash', async () => {
    expect(await pw.verify('wrong', md5('hunter22')))
      .toEqual({ ok: false, needsRehash: false });
  });

  it('matches an uppercase stored hash', async () => {
    expect((await pw.verify('hunter22', md5('hunter22').toUpperCase())).ok).toBe(true);
  });
});

describe('verify against a legacy plaintext row', () => {
  it('accepts the right password and flags it for rehash', async () => {
    expect(await pw.verify('hunter22', 'hunter22'))
      .toEqual({ ok: true, needsRehash: true });
  });

  it('rejects the wrong password', async () => {
    expect((await pw.verify('nope', 'hunter22')).ok).toBe(false);
  });
});

describe('malformed input', () => {
  it.each([
    [undefined, 'x'], ['x', undefined], [null, null], ['x', ''], [1234, 'x'],
  ])('rejects (%s, %s) without throwing', async (c, s) => {
    expect(await pw.verify(c, s)).toEqual({ ok: false, needsRehash: false });
  });

  it('rejects a candidate of a different length without a timing crash', async () => {
    expect((await pw.verify('short', 'a-much-longer-stored-value')).ok).toBe(false);
  });
});

describe('format detection', () => {
  it('recognises bcrypt prefixes', () => {
    expect(pw.isBcrypt('$2a$10$abcdefghijklmnopqrstuv')).toBe(true);
    expect(pw.isBcrypt('$2b$10$abcdefghijklmnopqrstuv')).toBe(true);
    expect(pw.isBcrypt(md5('x'))).toBe(false);
  });

  it('recognises a 32-hex MD5 and nothing else', () => {
    expect(pw.isMd5(md5('x'))).toBe(true);
    expect(pw.isMd5('plaintext')).toBe(false);
    expect(pw.isMd5('z'.repeat(32))).toBe(false);
  });
});
