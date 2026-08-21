/**
 * Socket test configuration.
 *
 * The socket service is plain CommonJS on Node, so no transform is needed.
 * It keeps its own dependency tree (mongodb 6 / mongoose 8) which is a
 * different major from the server's, so it also keeps its own jest run -
 * testing this code against the server's mongodb 4 would not be testing what
 * actually ships.
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/**/*.test.js'],

  globalSetup: '<rootDir>/test/globalSetup.js',
  globalTeardown: '<rootDir>/test/globalTeardown.js',
  setupFilesAfterEnv: ['<rootDir>/test/setupAfterEnv.js'],

  // Serial, because helpers/modifyJSON.js hardcodes the socketData.json path.
  // Two workers exercising it at once would clobber each other's fixtures, and
  // parameterising that path would mean changing production code purely to
  // suit the tests. The whole suite runs in a few seconds either way.
  maxWorkers: 1,

  // Coverage denominator, pinned explicitly. Every exclusion is here because
  // the file is not application logic - none are excluded for being awkward
  // to test.
  collectCoverageFrom: [
    '**/*.js',
    '!node_modules/**',
    '!coverage/**',
    '!jest.config.js',
    '!test/**',

    // Symlink to the repo-root shared settings directory. It resolves OUTSIDE
    // this rootDir, so jest can never emit coverage for it - the same trap as
    // client/src/settings and server/settings. The real directory is analysed
    // once at the repo root.
    '!settings/**',
  ],
  coverageReporters: ['lcov', 'text-summary'],
  coverageDirectory: 'coverage',
};
