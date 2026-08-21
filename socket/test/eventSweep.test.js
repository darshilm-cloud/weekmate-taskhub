/**
 * Exercises every socket event the service declares.
 *
 * server.js wires 31 handlers across 14 files by hand, and a handler that is
 * never registered - or is registered against a mistyped event name - fails
 * silently: the client emits, nothing listens, no error is raised anywhere.
 * Nothing else in the codebase catches that.
 *
 * So this walks the same registration path server.js does, then fires each
 * event against seeded fixtures and asserts the handler runs to completion.
 * Every handler wraps its body in try/catch, so "it threw" is not observable
 * from outside - what is observable is whether the work reached the database,
 * which is what the notification assertions below check.
 */
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const { connectToDatabase, closeDatabase } = require('../helpers/db');
const { socketEvents } = require('../settings/socketEventName');
const { Models } = require('../helpers/constants');
const { makeSocket, makeIo } = require('./fakeSocket');
const { seed, wipe, closeSeed, ids } = require('./seed');

const E = socketEvents;

// What each event expects on its payload. The handlers destructure specific
// keys and look the id up in a specific collection, so a single generic
// payload would make most of them exit early at the first lookup.
const PAYLOADS = {
  [E.JOIN_ROOM]: { userId: String(ids.assignee) },
  [E.GET_NOTIFICATIONS]: { user_id: String(ids.assignee) },
  [E.GET_READ_NOTIFICATIONS]: { user_id: String(ids.assignee) },
  [E.GET_UNREAD_NOTIFICATIONS]: { user_id: String(ids.assignee) },
  [E.READ_NOTIFICATIONS]: {
    user_id: String(ids.assignee),
    notification_id: String(ids.notification),
  },

  [E.ADD_PROJECT_ASSIGNEE]: { _id: String(ids.project) },
  [E.EDIT_PROJECT_ASSIGNEE]: {
    _id: String(ids.project),
    assignees: [String(ids.assignee)],
    pms_clients: [String(ids.client)],
  },

  [E.ADD_LIST_SUBSCRIBERS]: {
    _id: String(ids.mainTask),
    subscribers: [String(ids.assignee)],
    pms_clients: [String(ids.client)],
  },
  [E.EDIT_LIST_SUBSCRIBERS]: {
    _id: String(ids.mainTask),
    subscribers: [String(ids.assignee)],
    pms_clients: [String(ids.client)],
  },

  [E.ADD_TASK_ASSIGNEE]: {
    _id: String(ids.task),
    assignees: [String(ids.assignee)],
    pms_clients: [String(ids.client)],
  },
  [E.EDIT_TASK_ASSIGNEE]: {
    _id: String(ids.task),
    assignees: [String(ids.assignee)],
    pms_clients: [String(ids.client)],
  },

  [E.ADD_TASK_COMMENTS_TAGGED_USERS]: {
    _id: String(ids.taskComment),
    taggedUsers: [String(ids.assignee)],
  },
  [E.EDIT_TASK_COMMENTS_TAGGED_USERS]: {
    _id: String(ids.taskComment),
    taggedUsers: [String(ids.assignee)],
  },

  [E.ADD_DISCUSSION_SUBSCRIBERS]: {
    _id: String(ids.topic),
    subscribers: [String(ids.assignee)],
    pms_clients: [String(ids.client)],
  },
  [E.EDIT_DISCUSSION_SUBSCRIBERS]: {
    _id: String(ids.topic),
    subscribers: [String(ids.assignee)],
    pms_clients: [String(ids.client)],
  },

  [E.ADD_DISCUSSION_TAGGED_USERS]: {
    _id: String(ids.topicDetail),
    taggedUsers: [String(ids.assignee)],
  },
  [E.EDIT_DISCUSSION_TAGGED_USERS]: {
    _id: String(ids.topicDetail),
    taggedUsers: [String(ids.assignee)],
  },

  [E.ADD_BUG_ASSIGNEE]: {
    _id: String(ids.bug),
    assignees: [String(ids.assignee)],
  },
  [E.EDIT_BUG_ASSIGNEE]: {
    _id: String(ids.bug),
    assignees: [String(ids.assignee)],
  },

  [E.ADD_BUG_COMMENTS]: {
    _id: String(ids.bugComment),
    taggedUsers: [String(ids.assignee)],
  },
  [E.EDIT_BUG_COMMENTS]: {
    _id: String(ids.bugComment),
    taggedUsers: [String(ids.assignee)],
  },

  [E.ADD_TASK_LOGGED_HOURS]: { _id: String(ids.loggedHours) },
  [E.ADD_BUG_LOGGED_HOURS]: { _id: String(ids.loggedHours) },

  [E.ADD_NOTE_SUBSCRIBERS]: {
    _id: String(ids.note),
    subscribers: [String(ids.assignee)],
    pms_clients: [String(ids.client)],
  },
  [E.EDIT_NOTE_SUBSCRIBERS]: {
    _id: String(ids.note),
    subscribers: [String(ids.assignee)],
    pms_clients: [String(ids.client)],
  },

  [E.ADD_NOTE_COMMENTS_TAGGED_USERS]: {
    _id: String(ids.noteComment),
    taggedUsers: [String(ids.assignee)],
  },
  [E.EDIT_NOTE_COMMENTS_TAGGED_USERS]: {
    _id: String(ids.noteComment),
    taggedUsers: [String(ids.assignee)],
  },

  [E.ADD_FILE_SUBSCRIBERS]: {
    _id: String(ids.fileUpload),
    subscribers: [String(ids.assignee)],
    pms_clients: [String(ids.client)],
  },
  [E.EDIT_FILE_SUBSCRIBERS]: {
    _id: String(ids.fileUpload),
    subscribers: [String(ids.assignee)],
    pms_clients: [String(ids.client)],
  },

  [E.PROJECT_EXPENSE_UPDATED]: {
    project_id: String(ids.project),
    amount: 4200,
  },
};

// Events that are emitted by the server rather than listened for, so no
// handler is expected. Listed explicitly so a genuinely unhandled event
// cannot hide among them.
const SERVER_EMITTED = [E.CONNECTION, E.DISCONNECT, E.NOTIFICATIONS,
  E.USER_ACTIVITY];

// Registering every handler the way server.js does, by loading each module in
// eventHandler/ and calling everything it exports. Reading the directory
// rather than listing the modules means a new handler file is covered the day
// it lands.
const registerAll = async (socket, io) => {
  const dir = path.join(__dirname, '..', 'eventHandler');
  for (const file of fs.readdirSync(dir).sort()) {
    if (!file.endsWith('.js')) continue;
    const mod = require(path.join(dir, file));
    for (const key of Object.keys(mod)) {
      if (typeof mod[key] === 'function') await mod[key](socket, io);
    }
  }
};

let socket;
let io;
let probe;

beforeAll(async () => {
  await connectToDatabase();
  await wipe();
  await seed();
  socket = makeSocket(String(ids.assignee));
  io = makeIo();
  await registerAll(socket, io);
  probe = new MongoClient(process.env.DB_URL);
  await probe.connect();
}, 60000);

afterAll(async () => {
  await closeSeed();
  if (probe) await probe.close();
  await closeDatabase();
});

const notifications = () =>
  probe.db(process.env.DB_NAME).collection(Models.Notifications);

test('every declared event has a listener registered', () => {
  const declared = Object.values(E).filter((e) => !SERVER_EMITTED.includes(e));
  const missing = declared.filter((e) => !socket.handlers.has(e));
  expect(missing).toEqual([]);
  expect(socket.handlers.size).toBe(declared.length);
});

test('every registered event has a payload defined for this sweep', () => {
  // Guards the sweep itself: a new event would otherwise be "swept" with
  // undefined and pass without executing anything.
  const unmapped = [...socket.handlers.keys()].filter((e) => !PAYLOADS[e]);
  expect(unmapped).toEqual([]);
});

describe('firing each event against seeded fixtures', () => {
  test.each(Object.keys(PAYLOADS))('%s runs to completion', async (event) => {
    await expect(socket.fire(event, PAYLOADS[event])).resolves.not.toThrow();
  });
});

describe('the handlers actually do their work', () => {
  beforeEach(async () => {
    await notifications().deleteMany({});
    io.sent.length = 0;
    socket.emitted.length = 0;
  });

  test('joinRoom puts the socket in the user room', async () => {
    await socket.fire(E.JOIN_ROOM, { userId: String(ids.assignee) });
    expect(socket.rooms).toContain(String(ids.assignee));
  });

  test('assigning a task notifies the assignee and persists it', async () => {
    await socket.fire(E.ADD_TASK_ASSIGNEE, PAYLOADS[E.ADD_TASK_ASSIGNEE]);

    // The sender is the task's updatedBy (the manager), so the assignee and
    // the client are notified and the manager is not.
    const rooms = io.sent.map((s) => s.room);
    expect(rooms).toContain(String(ids.assignee));
    expect(rooms).not.toContain(String(ids.manager));

    const saved = await notifications().find({}).toArray();
    expect(saved.length).toBeGreaterThan(0);
    expect(saved[0].message).toContain('Apollo');
    expect(saved[0].message).toContain('Mara Okonjo');
  });

  test('a sender is never notified of their own action', async () => {
    // Fire as the manager, who is the project manager and the updatedBy.
    await socket.fire(E.ADD_TASK_LOGGED_HOURS, {
      _id: String(ids.loggedHours),
    });
    for (const sent of io.sent) {
      expect(sent.room).not.toBe(String(ids.manager));
    }
  });

  test('fetching notifications emits them back to the caller', async () => {
    await socket.fire(E.ADD_TASK_ASSIGNEE, PAYLOADS[E.ADD_TASK_ASSIGNEE]);
    socket.emitted.length = 0;

    await socket.fire(E.GET_NOTIFICATIONS, { user_id: String(ids.assignee) });

    const reply = socket.emitted.find((e) => e.event === E.GET_NOTIFICATIONS);
    expect(reply).toBeDefined();
    expect(Array.isArray(reply.payload.data)).toBe(true);
  });

  test('a project expense update is broadcast to everyone', async () => {
    const payload = { project_id: String(ids.project), amount: 4200 };
    await socket.fire(E.PROJECT_EXPENSE_UPDATED, payload);
    expect(io.sent).toContainEqual({
      room: '*',
      event: E.PROJECT_EXPENSE_UPDATED,
      payload,
    });
  });
});

describe('handlers survive the payloads a buggy client can send', () => {
  // Every handler is wrapped in try/catch, so the contract is that a bad
  // payload is absorbed rather than taking the socket process down. These
  // assert that contract instead of assuming it.
  const junk = [
    ['an empty object', {}],
    ['a null id', { _id: null }],
    ['a malformed id', { _id: 'not-an-objectid' }],
    ['an id that matches nothing', { _id: '0123456789abcdef01234567' }],
    ['arrays where scalars belong', { _id: [], assignees: 'nope' }],
  ];

  for (const event of Object.keys(PAYLOADS)) {
    test.each(junk)(`${event} absorbs %s`, async (_label, payload) => {
      await expect(socket.fire(event, payload)).resolves.not.toThrow();
    });
  }
});
