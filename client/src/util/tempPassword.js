/**
 * Temporary password generation.
 *
 * Lives here rather than inline in a page component because it produces a
 * credential: it needs the Web Crypto CSPRNG (not Math.random(), whose sequence
 * is predictable from earlier outputs), and it needs to be testable on its own.
 */
const CHARSET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export const generateTempPassword = (length = 6) => {
  const bytes = new Uint32Array(length);
  window.crypto.getRandomValues(bytes);
  // Modulo over a 32-bit draw. The bias across a 62-character set is negligible,
  // and this only seeds a password the recipient is expected to change.
  const seed = Array.from(bytes, (b) => CHARSET[b % CHARSET.length]).join("");
  return `Temp@${seed}`;
};

export default generateTempPassword;
