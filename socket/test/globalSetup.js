/**
 * Starts one in-memory MongoDB for the whole run.
 *
 * DB_URL must be set before any worker forks, because helpers/db.js builds its
 * MongoClient at module load time - by the time a test calls
 * connectToDatabase() the URI has already been read.
 */
const { MongoMemoryServer } = require('mongodb-memory-server');
const fs = require('fs');
const path = require('path');

module.exports = async () => {
  // The service resolves settings/ through a symlink that `npm start` creates.
  // Tests have no start script, so make the same link here - otherwise every
  // require of settings/socketEventName fails.
  const link = path.join(__dirname, '..', 'settings');
  if (!fs.existsSync(link)) {
    fs.symlinkSync(path.join('..', 'settings'), link, 'dir');
  }

  const mongo = await MongoMemoryServer.create();
  global.__SOCKET_MONGO__ = mongo;
  process.env.DB_URL = mongo.getUri();
  process.env.DB_NAME = 'socket_test';
};
