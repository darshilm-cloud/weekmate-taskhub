module.exports = async () => {
  const mongo = globalThis.__MONGO__ || global.__MONGO_INSTANCE__;
  if (mongo) await mongo.stop();
};
