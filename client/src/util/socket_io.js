import io from "socket.io-client";
let socket;

export const getSocket = (options = {}) => {
  if (!socket) {
    socket = io(process.env.REACT_APP_SOCKET_URL, {
      closeOnBeforeunload: false,
      secure: false,
      transports: ["websocket"],
      // Don't hammer (and flood the console) when the handshake is refused:
      // back off and give up after a bounded number of attempts.
      reconnectionAttempts: 6,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30000,
      ...options, // Include the additional options here
    });
  }
  return socket;
};
