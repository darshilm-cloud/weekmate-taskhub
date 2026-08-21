/**
 * socketData.json is the service's user-to-socket map. Every connect and every
 * disconnect rewrites the whole file, so concurrent writes are the failure mode
 * this module exists to prevent - that is what SimpleQueue is for. These tests
 * hold it to that, rather than only checking the happy path.
 *
 * The path is hardcoded to socket/socketData.json, so each test starts from a
 * known file and the original is restored afterwards.
 */
const fs = require('fs').promises;
const path = require('path');
const { addUserIDInJson, removeBySocketId } = require('../helpers/modifyJSON');

const FILE = path.join(__dirname, '..', 'socketData.json');

const read = async () => JSON.parse(await fs.readFile(FILE, 'utf8'));
const write = (obj) => fs.writeFile(FILE, JSON.stringify(obj, null, 2));

let original = null;

beforeAll(async () => {
  try {
    original = await fs.readFile(FILE, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
});

afterAll(async () => {
  if (original === null) {
    await fs.rm(FILE, { force: true });
  } else {
    await fs.writeFile(FILE, original);
  }
});

beforeEach(() => write({}));

describe('addUserIDInJson', () => {
  test('records the socket a user connected on', async () => {
    await expect(addUserIDInJson('user-a', 'socket-1')).resolves.toBe(true);
    expect(await read()).toEqual({ 'user-a': 'socket-1' });
  });

  test('a reconnect replaces the old socket rather than adding one', async () => {
    await addUserIDInJson('user-a', 'socket-1');
    await addUserIDInJson('user-a', 'socket-2');
    expect(await read()).toEqual({ 'user-a': 'socket-2' });
  });

  test('creates the file when it does not exist yet', async () => {
    await fs.rm(FILE, { force: true });
    await expect(addUserIDInJson('user-a', 'socket-1')).resolves.toBe(true);
    expect(await read()).toEqual({ 'user-a': 'socket-1' });
  });

  test('drops the undefined key a query-less handshake leaves behind', async () => {
    // server.js reads userId straight off the handshake query, so a client
    // that connects without one writes the literal key "undefined".
    await write({ undefined: 'stale-socket', 'user-a': 'socket-1' });
    await addUserIDInJson('user-b', 'socket-2');
    const data = await read();
    expect(data).not.toHaveProperty('undefined');
    expect(data).toEqual({ 'user-a': 'socket-1', 'user-b': 'socket-2' });
  });

  test('resolves false instead of throwing when the file is corrupt', async () => {
    await fs.writeFile(FILE, '{ not json');
    await expect(addUserIDInJson('user-a', 'socket-1')).resolves.toBe(false);
  });

  test('concurrent connections all survive', async () => {
    // The whole point of the queue. Without it these read-modify-write cycles
    // interleave and all but the last entry are lost.
    const users = Array.from({ length: 40 }, (_, i) => `user-${i}`);
    await Promise.all(users.map((u, i) => addUserIDInJson(u, `socket-${i}`)));

    const data = await read();
    expect(Object.keys(data)).toHaveLength(40);
    users.forEach((u, i) => expect(data[u]).toBe(`socket-${i}`));
  });
});

describe('removeBySocketId', () => {
  test('removes the user holding that socket', async () => {
    await write({ 'user-a': 'socket-1', 'user-b': 'socket-2' });
    await expect(removeBySocketId('socket-1')).resolves.toBe(true);
    expect(await read()).toEqual({ 'user-b': 'socket-2' });
  });

  test('leaves the map alone when the socket is not in it', async () => {
    await write({ 'user-a': 'socket-1' });
    await expect(removeBySocketId('socket-missing')).resolves.toBe(true);
    expect(await read()).toEqual({ 'user-a': 'socket-1' });
  });

  test('resolves false rather than throwing when there is no file', async () => {
    // Unlike addUserIDInJson, this one does not create the file.
    await fs.rm(FILE, { force: true });
    await expect(removeBySocketId('socket-1')).resolves.toBe(false);
  });

  test('a connect and a disconnect racing do not corrupt the map', async () => {
    await write({ 'user-old': 'socket-old' });
    await Promise.all([
      addUserIDInJson('user-new', 'socket-new'),
      removeBySocketId('socket-old'),
      addUserIDInJson('user-third', 'socket-third'),
    ]);
    const data = await read();
    expect(data).not.toHaveProperty('user-old');
    expect(data['user-new']).toBe('socket-new');
    expect(data['user-third']).toBe('socket-third');
  });
});
