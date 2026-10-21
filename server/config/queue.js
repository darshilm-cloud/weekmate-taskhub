const crypto = require('crypto');
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

/*
 * BullMQ key prefix. Several environments (local machines, dev, staging) can share one
 * Redis; with the default "bull" prefix any server running a worker for the same queue
 * name picks up jobs queued by the others, and finishes them without finding the
 * import's history row or file (they live in the other server's database / disk), so the
 * import sits at "Queued" forever. The prefix is derived from the database URL, so
 * servers that use the same database still share queues and others are kept apart.
 * Set QUEUE_PREFIX to override.
 */
function getQueuePrefix() {
  if (process.env.QUEUE_PREFIX) return process.env.QUEUE_PREFIX;
  const dbUrl = process.env.DB_URL;
  if (!dbUrl) return 'bull';
  return `bull-${crypto.createHash('sha1').update(dbUrl).digest('hex').slice(0, 8)}`;
}

module.exports = { createRedisConnection, REDIS_CONFIG, REDIS_TTL_SECS, getQueuePrefix };
