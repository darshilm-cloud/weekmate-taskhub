/**
 * Stand-ins for the socket.io socket and server objects.
 *
 * The event handlers only ever use four things off a socket - on, emit, join
 * and id - and one off the server: to(room).emit(). Faking that is enough to
 * drive the real handlers, and it lets a test invoke a registered handler
 * directly instead of racing a real websocket round trip.
 */
const makeSocket = (userId = '000000000000000000000001') => {
  const handlers = new Map();
  return {
    id: 'socket-test-id',
    handshake: { query: { userId } },
    rooms: [],
    emitted: [],
    on(event, handler) {
      handlers.set(event, handler);
    },
    emit(event, payload) {
      this.emitted.push({ event, payload });
    },
    join(room) {
      this.rooms.push(room);
    },
    // test-only accessors
    handlers,
    fire(event, payload) {
      const handler = handlers.get(event);
      if (!handler) throw new Error(`no handler registered for "${event}"`);
      return handler(payload);
    },
  };
};

const makeIo = () => {
  const sent = [];
  return {
    sent,
    // projectExpense broadcasts with io.emit rather than io.to(room).emit
    emit(event, payload) {
      sent.push({ room: '*', event, payload });
    },
    to(room) {
      return {
        emit(event, payload) {
          sent.push({ room, event, payload });
        },
      };
    },
  };
};

module.exports = { makeSocket, makeIo };
