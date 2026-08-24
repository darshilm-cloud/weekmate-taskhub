/**
 * Seeds every registered collection so controllers have something to find.
 *
 * The route sweep can negotiate its way past validation, but that only reaches
 * the query. With an empty database every aggregation returns [], so each
 * controller takes its "nothing found" path and all the result handling -
 * mapping, permission decoration, totals, formatting, the bulk of the code -
 * never runs. Seeding is what turns a passing request into an exercised one.
 *
 * Documents are generated from the mongoose schemas rather than written out by
 * hand. 58 hand-written fixtures would drift the moment a schema changed,
 * whereas walking schema.paths adapts on its own and cannot miss a field.
 *
 * Three ids matter, and they are shared across every collection on purpose:
 * the sweep's token carries PRIMARY as the user id and COMPANY as the company,
 * and the payload negotiator fills every *_id field with PRIMARY. Seeding the
 * same id everywhere means whichever collection a controller looks in, it
 * finds a document - without the fixture needing to know which.
 */
const mongoose = require('mongoose');

const PRIMARY = '507f1f77bcf86cd799439011';
const COMPANY = '507f1f77bcf86cd799439012';
const SECOND = '507f1f77bcf86cd799439013';
const THIRD = '507f1f77bcf86cd799439014';

const oid = (v) => new mongoose.Types.ObjectId(v);

// Booleans drive the visibility guards nearly every query applies. Getting
// these backwards silently hides every seeded document.
const BOOLEAN_DEFAULTS = {
  isdeleted: false,
  issoftdeleted: false,
  isarchived: false,
  isblocked: false,
  isactivate: true,
  isactive: true,
  isverified: true,
  isapproved: true,
  isdeletable: true,
  iseditable: true,
};

/** A plausible value for one schema path, from its declared type. */
function valueForPath(name, type, id) {
  const key = name.toLowerCase();
  const kind = type.instance || (type.$isMongooseArray ? 'Array' : 'Mixed');

  if (name === '_id') return oid(id);
  if (key === 'companyid') return oid(COMPANY);

  if (kind === 'ObjectId') return oid(PRIMARY);
  if (kind === 'Date') return new Date('2026-01-15T00:00:00.000Z');
  if (kind === 'Number') {
    if (/month/.test(key)) return 1;
    if (/year/.test(key)) return 2026;
    return 1;
  }
  if (kind === 'Boolean') {
    for (const [frag, val] of Object.entries(BOOLEAN_DEFAULTS)) {
      if (key.includes(frag)) return val;
    }
    return false;
  }
  if (kind === 'Array' || type.$isMongooseArray) {
    // An array of refs should hold the primary id, so "assignees contains me"
    // style filters match. Anything else is safer left empty.
    const caster = type.caster || type.$embeddedSchemaType;
    if (caster?.instance === 'ObjectId') return [oid(PRIMARY)];
    if (caster?.instance === 'String') return [];
    return [];
  }
  if (kind === 'String') {
    // Enums must be honoured or the document is unreadable by any query that
    // filters on them.
    const enumValues = type.enumValues || type.options?.enum;
    if (Array.isArray(enumValues) && enumValues.length) return enumValues[0];

    if (/email/.test(key)) return `sweep+${id.slice(-4)}@elsner.com`;
    if (/password/.test(key)) return 'Str0ng!Passw0rd';
    if (/(colour|color)/.test(key)) return '#3366ff';
    if (/(status|type|role_type)$/.test(key)) return 'active';

    // Several aggregations $convert these to numbers, and $convert with no
    // onError aborts the whole pipeline on a value it cannot parse - so a
    // duration stored as a string still has to be numeric. "2:30" here made
    // every task query fail with "Did not consume whole string".
    if (
      /(hours|minutes|seconds|progress|percent|amount|rate|cost|price|total|experience|count|qty|quantity|duration|score|weight|days|weeks|months|years|num)/.test(
        key
      )
    ) {
      return '2';
    }
    if (/(^|_)time$/.test(key)) return '02:30';
    if (/(name|title)/.test(key)) return 'Sweep fixture';
    return 'sweep';
  }
  return 'sweep';
}

/** Build one document for a model, keyed on the given id. */
function documentFor(Model, id) {
  const doc = {};
  Model.schema.eachPath((name, type) => {
    // Nested paths ("a.b") and version keys are left to mongoose.
    if (name.includes('.') || name === '__v') return;
    doc[name] = valueForPath(name, type, id);
  });
  doc._id = oid(id);
  return doc;
}

/**
 * Insert three documents into every registered collection.
 *
 * Three rather than one so list endpoints return a real page: pagination,
 * totals and per-row mapping all behave differently for an empty result, a
 * single row, and several.
 */
async function seedAll() {
  require('../models/index');
  const models = Object.values(mongoose.models);
  let inserted = 0;

  for (const Model of models) {
    const docs = [PRIMARY, SECOND, THIRD].map((id) => documentFor(Model, id));
    try {
      // Raw collection writes on purpose: this bypasses schema validation and
      // pre-save hooks. Hooks here hash passwords and stamp timestamps, which
      // would be wasted work, and one strict validator failing must not stop
      // the other 57 collections from being seeded.
      await Model.collection.insertMany(docs, { ordered: false });
      inserted += docs.length;
    } catch (error) {
      // Duplicate keys are expected when a suite seeds more than once.
      if (error.code !== 11000) {
        console.log(`  fixtures: ${Model.collection.name}: ${error.message}`);
      }
      inserted += error.result?.nInserted || 0;
    }
  }

  return { collections: models.length, inserted };
}

async function wipeAll() {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
}

module.exports = { seedAll, wipeAll, PRIMARY, COMPANY, SECOND, THIRD, oid };
