const crypto = require('crypto');
const IORedis = require('ioredis');

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: Number(process.env.REDIS_DB) || 0,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  connectTimeout: 10000,
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

const QUEUE_READY_TIMEOUT_MS = Number(process.env.QUEUE_READY_TIMEOUT_MS) || 15000;
const QUEUE_UNAVAILABLE_MESSAGE =
  'Import service is unavailable right now (cannot reach Redis). Please try again later or contact the administrator.';

/*
 * Wait for a new per-user worker to connect. ioredis retries forever
 * (maxRetriesPerRequest: null), so when Redis is unreachable waitUntilReady()
 * never settles: the request hangs, the history row stays "Queued" and every
 * retry is logged. Give up after QUEUE_READY_TIMEOUT_MS, close the queue and
 * worker so their reconnect loops stop, and throw a readable error instead.
 */
async function waitForQueueReady(queue, worker, label, connections = []) {
  let timer;
  try {
    await Promise.race([
      worker.waitUntilReady(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), QUEUE_READY_TIMEOUT_MS);
      }),
    ]);
  } catch (err) {
    console.error(`${label}: Redis not reachable at ${REDIS_CONFIG.host}:${REDIS_CONFIG.port} (${err.message})`);
    // close() waits for a connection that never comes, and BullMQ keeps its own
    // clients besides the ones handed to it, so end every client directly.
    const clients = [
      ...connections,
      queue.connection?._client,
      worker.connection?._client,
      worker.blockingConnection?._client,
    ];
    clients.forEach((client) => client?.disconnect?.());
    queue.close().catch(() => {});
    worker.close(true).catch(() => {});
    throw new Error(QUEUE_UNAVAILABLE_MESSAGE);
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  createRedisConnection,
  REDIS_CONFIG,
  REDIS_TTL_SECS,
  getQueuePrefix,
  waitForQueueReady,
};
