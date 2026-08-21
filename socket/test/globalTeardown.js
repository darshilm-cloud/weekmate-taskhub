module.exports = async () => {
  if (global.__SOCKET_MONGO__) await global.__SOCKET_MONGO__.stop();
};
