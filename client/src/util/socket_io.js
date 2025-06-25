import io from "socket.io-client";
let socket;

export const getSocket = (options = {}) => {
  if (!socket) {
    socket = io(process.env.REACT_APP_SOCKET_URL, {
      closeOnBeforeunload: false,
      secure: false,
      transports: ["websocket"],
      ...options, // Include the additional options here
    });
  }
  return socket;
};
