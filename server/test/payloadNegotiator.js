/**
 * Derives a request body that a controller will actually accept.
 *
 * Every controller here validates with an inline Joi schema, and those schemas
 * both require specific fields and reject unknown ones. So a minimal {} body is
 * rejected, and a kitchen-sink body containing every field name in the codebase
 * is rejected too ("X is not allowed"). Either way the request dies in the
 * validator and the controller body - the part worth covering - never runs.
 *
 * Joi does say what is wrong, one problem at a time: '"project_id" is
 * required', '"limit" must be a number', '"labels" must be an array'. So
 * instead of guessing the schema, ask for it: send a body, read the complaint,
 * amend the body, send it again. A handful of rounds converges on a body the
 * real validator accepts, and nothing is hardcoded per route.
 *
 * This deliberately does NOT try to make a request succeed - a 404 "not found"
 * or a 403 is a fine outcome. It only tries to get PAST validation, so the
 * controller's own logic is what decides the response.
 */

// Joi phrases its complaints in a small number of shapes. Each pattern yields
// the offending key and how to amend it.
const RULES = [
  { re: /"([^"]+)" is required/, fix: (k, v) => valueFor(k, v) },
  { re: /"([^"]+)" is not allowed/, fix: () => undefined }, // remove the key
  { re: /"([^"]+)" must be a number/, fix: () => 1 },
  { re: /"([^"]+)" must be a string/, fix: () => 'test' },
  { re: /"([^"]+)" must be an array/, fix: () => [] },
  { re: /"([^"]+)" must be a boolean/, fix: () => false },
  { re: /"([^"]+)" must be of type object/, fix: () => ({}) },
  { re: /"([^"]+)" must be a valid date/, fix: () => '2026-01-15' },
  { re: /"([^"]+)" must be a valid email/, fix: () => 'sweep@elsner.com' },
  { re: /"([^"]+)" must be greater than or equal to (\d+)/,
    fix: (_k, _v, m) => Number(m[2]) },
  { re: /"([^"]+)" must be one of \[([^\]]+)\]/,
    fix: (_k, _v, m) => {
      // Pick the first literal option, skipping the empty string.
      const first = m[2].split(',').map((s) => s.trim())
        .find((s) => s && s !== '""');
      return first ? first.replace(/^"|"$/g, '') : 'all';
    } },
  { re: /"([^"]+)" length must be/, fix: () => '507f1f77bcf86cd799439011' },
  { re: /"([^"]+)" does not match/, fix: () => '507f1f77bcf86cd799439011' },
  { re: /"([^"]+)" must not be a sparse array/, fix: () => [] },
  { re: /"([^"]+)" must contain at least/, fix: (k, v) => [valueFor(k, v, true)] },
];

/**
 * A plausible value for a field, chosen from its name. Ids resolve to seeded
 * documents where the name matches one, so the controller's lookups actually
 * find something instead of returning empty.
 */
function valueFor(key, seeded = {}, singular = false) {
  const k = key.toLowerCase().replace(/\[\d+\]$/, '');

  if (seeded[k]) return seeded[k];

  if (/(^|_)(email)$/.test(k)) return 'sweep@elsner.com';
  if (/password/.test(k)) return 'Str0ng!Passw0rd';
  if (/(^|_)(date|start_date|due_date|from|to)$/.test(k)) return '2026-01-15';
  if (/(month)$/.test(k)) return 1;
  if (/(year)$/.test(k)) return 2026;
  if (/(limit|pageno|page|count|size)$/.test(k)) return 10;
  if (/^is|^has|enabled$/.test(k)) return false;
  if (/(ids|_ids)$/.test(k)) return singular ? OID : [OID];

  // Anything whose name ends in "id" is an id - including camelCase like
  // resourceId, which an underscore-only rule misses and then fills with
  // "test", producing a Cast to ObjectId failure instead of a real lookup.
  // The denylist is ordinary words that happen to end in those letters.
  const NOT_AN_ID = ['valid', 'invalid', 'paid', 'unpaid', 'void', 'grid',
    'hybrid', 'solid', 'rapid', 'avoid'];
  if (/id$/.test(k) && !NOT_AN_ID.includes(k)) return OID;
  if (/(name|title|comment|message|description|search)/.test(k)) return 'test';
  return 'test';
}

const OID = '507f1f77bcf86cd799439011';

/**
 * Repeatedly send and amend until the response is not a validation rejection.
 *
 * `send` is a function taking a body and resolving to a supertest response.
 * Returns { res, body, rounds } - the final response, the body that produced
 * it, and how many rounds it took.
 */
async function negotiate(send, { seeded = {}, maxRounds = 14, start = {} } = {}) {
  let body = { ...start };
  let res = await send(body);
  let rounds = 1;

  while (rounds < maxRounds && res.status === 400) {
    const message = String(
      res.body?.message || res.body?.error || res.text || ''
    );

    const applied = RULES.some((rule) => {
      const m = message.match(rule.re);
      if (!m) return false;
      const key = m[1];
      // Only touch top-level keys; a nested path means the shape is more
      // specific than this can usefully guess at.
      if (key.includes('.')) return false;

      const next = rule.fix(key, seeded, m);
      if (next === undefined) delete body[key];
      else body[key] = next;
      return true;
    });

    // Nothing matched, so the rejection is not something an amended body will
    // fix. Stop rather than spin.
    if (!applied) break;

    res = await send(body);
    rounds += 1;
  }

  return { res, body, rounds };
}

module.exports = { negotiate, valueFor, OID };
