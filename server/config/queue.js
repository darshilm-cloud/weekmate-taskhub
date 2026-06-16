const IORedis = require('ioredis');

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: Number(process.env.REDIS_DB) || 0,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryDelayOnFailover: 100,
};

const REDIS_TTL_SECS = Number(process.env.REDIS_TTL_SECS) || 3600;

function createRedisConnection() {
  return new IORedis(REDIS_CONFIG);
}

module.exports = { createRedisConnection, REDIS_CONFIG, REDIS_TTL_SECS };
