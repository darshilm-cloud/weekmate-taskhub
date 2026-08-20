/**
 * Starts an in-memory MongoDB and points DB_URL at it BEFORE any test worker
 * forks. This matters: app.js calls connect() at import time, so the URL has to
 * be swapped before the app module is ever required - otherwise the suite would
 * try to reach the real development database.
 */
const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async () => {
  const mongo = await MongoMemoryServer.create();
  process.env.DB_URL = mongo.getUri();
  process.env.NODE_ENV = 'test';
  // Deterministic secrets so token helpers work without the real env files.
  process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'test-secret';
  globalThis.__MONGO__ = mongo;
  global.__MONGO_INSTANCE__ = mongo;
};
