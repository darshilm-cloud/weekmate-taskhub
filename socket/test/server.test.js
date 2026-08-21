/**
 * Boots the real service and drives it over a real websocket.
 *
 * eventSweep covers the handlers by calling them directly, which deliberately
 * skips everything server.js does: CORS, the connection handler, the socket-id
 * map, room joins, disconnect cleanup. Those only run when a genuine client
 * connects, and they are exactly the parts that break when an event is renamed
 * or a handler is left unwired - so this connects one.
 */
const path = require('path');
const fs = require('fs').promises;
const ioClient = require('socket.io-client');
const { MongoClient } = require('mongodb');
const { socketEvents } = require('../settings/socketEventName');
const { Models } = require('../helpers/constants');
const { seed, wipe, closeSeed, ids } = require('./seed');

const E = socketEvents;
const MAP_FILE = path.join(__dirname, '..', 'socketData.json');

let server;
let io;
let url;
let probe;
let originalMap = null;

// A distinct port per worker, so parallel suites do not fight over one.
process.env.PORT = String(4310 + Number(process.env.JEST_WORKER_ID || 1));

const connect = (query) =>
  new Promise((resolve, reject) => {
    const client = ioClient(url, {
      query,
      transports: ['websocket'],
      forceNew: true,
    });
    client.on('connect', () => resolve(client));
    client.on('connect_error', reject);
  });

const once = (client, event, timeout = 5000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timed out waiting for "${event}"`)),
      timeout
    );
    client.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });

const settle = () => new Promise((r) => setTimeout(r, 250));

// Waits until the handlers stop logging.
//
// The junk-payload test deliberately provokes errors, and every handler
// reports them with console.log from inside an async catch. Those logs can
// land after the test returns, which jest fails the whole run for ("Cannot
// log after tests are done"). There is no completion signal to await - the
// handlers swallow their errors by design - so wait for the logging itself to
// go quiet rather than guessing at a fixed delay.
const quiesce = async (idleMs = 300, maxMs = 5000) => {
  const original = console.log;
  let last = Date.now();
  console.log = (...args) => {
    last = Date.now();
    original(...args);
  };
  try {
    const deadline = Date.now() + maxMs;
    while (Date.now() - last < idleMs && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 50));
    }
  } finally {
    console.log = original;
  }
};

beforeAll(async () => {
  try {
    originalMap = await fs.readFile(MAP_FILE, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const mod = require('../server');
  server = await mod.listening;
  io = mod.io;
  url = `http://127.0.0.1:${process.env.PORT}`;

  probe = new MongoClient(process.env.DB_URL);
  await probe.connect();
  await wipe();
  await seed();
}, 60000);

afterAll(async () => {
  // Closing a client makes the server run its disconnect handler, which
  // queues a rewrite of socketData.json. That write outlives the test that
  // triggered it, so the shutdown has to drain it before touching the file -
  // otherwise the restore below lands mid-write and the handler logs a parse
  // error after teardown, which fails the whole run.
  if (io) io.close();
  if (server) await new Promise((r) => server.close(r));
  await quiesce();

  const { closeDatabase } = require('../helpers/db');
  await closeDatabase();
  await closeSeed();
  if (probe) await probe.close();

  if (originalMap === null) await fs.rm(MAP_FILE, { force: true });
  else await fs.writeFile(MAP_FILE, originalMap);
});

const notifications = () =>
  probe.db(process.env.DB_NAME).collection(Models.Notifications);

const readMap = async () => {
  try {
    return JSON.parse(await fs.readFile(MAP_FILE, 'utf8'));
  } catch {
    return {};
  }
};

test('the service accepts a websocket connection', async () => {
  const client = await connect({ userId: String(ids.assignee) });
  expect(client.connected).toBe(true);
  client.close();
});

test('connecting records the socket in the user map', async () => {
  const client = await connect({ userId: String(ids.assignee) });
  await settle();
  expect(await readMap()).toHaveProperty(String(ids.assignee), client.id);
  client.close();
});

test('disconnecting removes the socket from the user map', async () => {
  const client = await connect({ userId: String(ids.assignee) });
  await settle();
  const socketId = client.id;
  client.close();
  await settle();

  const map = await readMap();
  expect(Object.values(map)).not.toContain(socketId);
});

test('a connection with no userId does not leave an "undefined" entry', async () => {
  const client = await connect({});
  await settle();
  expect(await readMap()).not.toHaveProperty('undefined');
  client.close();
});

test('every listener from server.js is wired on a live connection', async () => {
  // If server.js forgets to await a registration, the event silently has no
  // listener. socket.io gives no way to ask, so instead assert the count the
  // server attached matches what the handlers register.
  const client = await connect({ userId: String(ids.assignee) });
  await settle();

  const sockets = await io.fetchSockets();
  const live = sockets.find((s) => s.id === client.id);
  expect(live).toBeDefined();
  expect(live.eventNames().length).toBeGreaterThanOrEqual(
    Object.values(E).length - 4 // CONNECTION/DISCONNECT/NOTIFICATIONS/USER_ACTIVITY are emitted, not listened for
  );
  client.close();
});

test('a client gets its notifications back over the wire', async () => {
  const client = await connect({ userId: String(ids.assignee) });
  const reply = once(client, E.GET_NOTIFICATIONS);
  client.emit(E.GET_NOTIFICATIONS, { user_id: String(ids.assignee) });

  const payload = await reply;
  expect(Array.isArray(payload.data)).toBe(true);
  expect(payload.message).toBeTruthy();
  client.close();
});

test('assigning a task pushes a live notification to the assignee', async () => {
  await notifications().deleteMany({});

  // The assignee joins their room, which is how sendNotification addresses
  // them, then the manager triggers the assignment from a second connection.
  const assignee = await connect({ userId: String(ids.assignee) });
  assignee.emit(E.JOIN_ROOM, { userId: String(ids.assignee) });
  await settle();

  const pushed = once(assignee, E.NOTIFICATIONS, 8000);

  const manager = await connect({ userId: String(ids.manager) });
  manager.emit(E.ADD_TASK_ASSIGNEE, {
    _id: String(ids.task),
    assignees: [String(ids.assignee)],
    pms_clients: [String(ids.client)],
  });

  const payload = await pushed;
  expect(payload.message).toContain('Apollo');
  expect(payload.time).toBeTruthy();

  await settle();
  expect(await notifications().countDocuments({})).toBeGreaterThan(0);

  assignee.close();
  manager.close();
}, 20000);

test('a project expense update reaches every connected client', async () => {
  const a = await connect({ userId: String(ids.assignee) });
  const b = await connect({ userId: String(ids.manager) });
  await settle();

  const onA = once(a, E.PROJECT_EXPENSE_UPDATED);
  const onB = once(b, E.PROJECT_EXPENSE_UPDATED);
  a.emit(E.PROJECT_EXPENSE_UPDATED, { project_id: String(ids.project), amount: 99 });

  await expect(onA).resolves.toMatchObject({ amount: 99 });
  await expect(onB).resolves.toMatchObject({ amount: 99 });
  a.close();
  b.close();
}, 20000);

test('a malformed payload over the wire does not take the service down', async () => {
  const client = await connect({ userId: String(ids.assignee) });
  await settle();

  for (const event of [E.ADD_TASK_ASSIGNEE, E.ADD_BUG_ASSIGNEE, E.JOIN_ROOM]) {
    client.emit(event, null);
    client.emit(event, { _id: 'not-an-objectid' });
  }
  await settle();

  // Still serving: a well-formed request after the junk still answers.
  const reply = once(client, E.GET_NOTIFICATIONS);
  client.emit(E.GET_NOTIFICATIONS, { user_id: String(ids.assignee) });
  await expect(reply).resolves.toBeDefined();

  // Let the provoked error logs finish before the suite tears down.
  await quiesce();
  client.close();
}, 30000);
