/**
 * Give each jest worker its own database.
 *
 * All workers share one mongod, and helpers/db.js picks its database by
 * DB_NAME. Without this, one worker's cleanup deletes another worker's
 * fixtures mid-test and suites fail in ways that depend on scheduling.
 */
process.env.DB_NAME = `socket_test_w${process.env.JEST_WORKER_ID || '1'}`;

jest.setTimeout(30000);
