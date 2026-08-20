/**
 * Server test configuration.
 *
 * The server is plain CommonJS on Node, so no transform is needed - jest runs
 * the sources directly.
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/**/*.test.js'],

  // An in-memory MongoDB is started once for the whole run and DB_URL is
  // pointed at it before any worker forks, because app.js connects on import.
  globalSetup: '<rootDir>/test/globalSetup.js',
  globalTeardown: '<rootDir>/test/globalTeardown.js',
  setupFilesAfterEnv: ['<rootDir>/test/setupAfterEnv.js'],

  // Coverage denominator, pinned explicitly so it is stable and intentional
  // rather than "whatever a test happened to import". Every exclusion below is
  // here because the file is NOT application logic - none of them are excluded
  // for being inconvenient to test.
  collectCoverageFrom: [
    '**/*.js',
    '!node_modules/**',
    '!coverage/**',
    '!jest.config.js',
    '!test/**',

    // Entry point / process bootstrap - starts a listening server, no logic.
    '!bin/**',

    // One-shot operational scripts, not part of the running application.
    // They are run by hand against a database, and several are already
    // gitignored or ad-hoc diagnostics.
    '!migrations/**',
    '!seeders/**',
    '!scripts/**',
    '!check_*.js',
    '!verify_seeder.js',

    // Static assets and view templates, not executable application logic.
    '!public/**',
    '!views/**',
    '!template/**',
    '!uploads/**',
    '!swagger/**',

    // Symlink to the repo-root shared settings directory. It resolves OUTSIDE
    // this rootDir, so jest can never emit coverage for it - the same trap as
    // client/src/settings. The real directory is analysed once at the root.
    '!settings/**',
  ],
  coverageReporters: ['lcov', 'text-summary'],
  coverageDirectory: 'coverage',
};
