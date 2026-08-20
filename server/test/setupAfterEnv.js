/**
 * Per-worker test setup: keep the mongoose connection tidy and the data clean
 * between tests so suites cannot leak state into each other.
 */
const mongoose = require('mongoose');

// app.js logs through a global chalk; provide it before anything requires the app.
global.chalk = global.chalk || require('chalk');

/**
 * CRITICAL: app.js runs a permission/role bootstrap on import that REWRITES the
 * shared settings files (settings/permission.json, settings/role.json) from
 * whatever is in the database. Against an empty in-memory database that writes
 * "{}" - clobbering real files that are gitignored, so not recoverable from git,
 * and that the CLIENT reads for hasPermission()/getRoles().
 *
 * These stubs make the bootstrap a no-op under test. Do not remove them.
 */
jest.mock('../helpers/updatePermission', () => ({
  updatePermission: jest.fn().mockResolvedValue(undefined),
  updateRoles: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../helpers/clearRolesandPermissions', () => ({
  clearPermissionFile: jest.fn(),
  clearRolesFile: jest.fn(),
}));

jest.setTimeout(30000);

afterEach(async () => {
  const { collections } = mongoose.connection;
  if (!collections) return;
  for (const name of Object.keys(collections)) {
    await collections[name].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.connection.close();
});
