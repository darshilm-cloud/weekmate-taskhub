/**
 * Password hashing.
 *
 * History: passwords were stored as UNSALTED MD5, and the comparison fell back
 * to a PLAINTEXT match when the stored value was not 32 hex characters. Both are
 * unsafe - MD5 is fast and broken, unsalted means one rainbow table covers every
 * account, and plaintext needs no attack at all.
 *
 * New passwords are bcrypt. Existing ones are migrated transparently: verify()
 * still accepts the legacy formats and reports needsRehash, so a user's stored
 * hash is upgraded the next time they log in successfully. Nobody is forced to
 * reset, and no deployment step is required.
 */
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const ROUNDS = 10;

const isBcrypt = (stored) => typeof stored === "string" && /^\$2[aby]\$/.test(stored);
const isMd5 = (stored) => typeof stored === "string" && /^[a-f0-9]{32}$/i.test(stored);

const md5 = (plain) => crypto.createHash("md5").update(plain).digest("hex");

/** Hash a new password. Always bcrypt. */
const hash = (plain) => bcrypt.hash(plain, ROUNDS);

/** Synchronous variant, for call sites that cannot await. */
const hashSync = (plain) => bcrypt.hashSync(plain, ROUNDS);

/**
 * Verify a candidate against whatever format is stored.
 * -> { ok, needsRehash }  needsRehash is true when the stored value was legacy
 *    and should be replaced with a bcrypt hash of the same password.
 */
const verify = async (candidate, stored) => {
  if (typeof candidate !== "string" || typeof stored !== "string" || stored === "") {
    return { ok: false, needsRehash: false };
  }
  if (isBcrypt(stored)) {
    return { ok: await bcrypt.compare(candidate, stored), needsRehash: false };
  }
  if (isMd5(stored)) {
    // Constant-time compare so the legacy path does not leak the hash by timing.
    const a = Buffer.from(md5(candidate));
    const b = Buffer.from(stored.toLowerCase());
    const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
    return { ok, needsRehash: ok };
  }
  // Legacy plaintext row.
  const a = Buffer.from(candidate);
  const b = Buffer.from(stored);
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  return { ok, needsRehash: ok };
};

module.exports = { hash, hashSync, verify, isBcrypt, isMd5, ROUNDS };
