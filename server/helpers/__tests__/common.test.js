/**
 * Pure helpers from CommonHelpers.
 *
 * generatePassword is the important one: it produces a credential, so it must
 * draw from a CSPRNG rather than Math.random(). These tests pin its shape and
 * check the output actually varies.
 */
const common = require('../common');

describe('generatePassword', () => {
  it.each([1, 8, 16, 64])('returns exactly %i characters', async (n) => {
    expect(await common.generatePassword(n)).toHaveLength(n);
  });

  it('draws only from the documented alphanumeric charset', async () => {
    expect(await common.generatePassword(200)).toMatch(/^[a-zA-Z0-9]+$/);
  });

  it('does not repeat itself across calls', async () => {
    const seen = new Set();
    for (let i = 0; i < 25; i++) seen.add(await common.generatePassword(24));
    // 25 independent 24-char draws colliding would mean the source is broken.
    expect(seen.size).toBe(25);
  });

  it('uses more than a handful of distinct characters', async () => {
    // A stuck or constant generator would show up as a tiny alphabet.
    const chars = new Set((await common.generatePassword(500)).split(''));
    expect(chars.size).toBeGreaterThan(30);
  });

  it('returns an empty string for zero length', async () => {
    expect(await common.generatePassword(0)).toBe('');
  });
});

describe('generateRandomId', () => {
  it('returns a #-prefixed six digit reference', () => {
    expect(common.generateRandomId()).toMatch(/^#\d{6}$/);
  });

  it('varies between calls', () => {
    const ids = new Set(Array.from({ length: 20 }, () => common.generateRandomId()));
    expect(ids.size).toBeGreaterThan(1);
  });
});

describe('arraysAreEqual', () => {
  it('is true for the same members regardless of order', () => {
    expect(common.arraysAreEqual(['a', 'b'], ['b', 'a'])).toBe(true);
  });

  it('is false when membership differs', () => {
    expect(common.arraysAreEqual(['a'], ['a', 'b'])).toBe(false);
    expect(common.arraysAreEqual(['a', 'b'], ['a', 'c'])).toBe(false);
  });

  it('is true for two empty arrays', () => {
    expect(common.arraysAreEqual([], [])).toBe(true);
  });
});

describe('getArrayChanges', () => {
  it('reports what was added and removed', () => {
    const out = common.getArrayChanges(['a', 'b'], ['b', 'c']);
    expect(JSON.stringify(out)).toContain('c');
    expect(JSON.stringify(out)).toContain('a');
  });

  it('reports nothing for an unchanged list', () => {
    const out = common.getArrayChanges(['a', 'b'], ['a', 'b']);
    const flat = JSON.stringify(out);
    expect(flat === '{}' || flat.includes('[]')).toBe(true);
  });
});
