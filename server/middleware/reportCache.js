const NodeCache = require("node-cache");

// Short-lived, per-user response cache for the heavy Reports endpoints.
//  - key is scoped to user + company + route + params, so admin / non-admin results never mix
//  - concurrent identical requests share ONE execution (in-flight dedupe)
//  - only successful (200) JSON responses are stored; errors always re-run
const store = new NodeCache({ stdTTL: 45, checkperiod: 60, useClones: false, maxKeys: 500 });
const inflight = new Map(); // key -> Promise<string | null>

const buildKey = (req) =>
  [
    req.user?._id,
    req.user?.companyId,
    req.baseUrl + req.path,
    JSON.stringify(req.query || {}),
    JSON.stringify(req.body || {}),
  ].join("|");

const sendCached = (res, payload) => {
  res.status(200).set("Content-Type", "application/json; charset=utf-8").send(payload);
};

/**
 * @param {{ ttl?: number, when?: (req) => boolean }} options
 *   when: return false to skip caching for a request (e.g. only cache a specific mode)
 */
const reportCache = ({ ttl = 45, when } = {}) => async (req, res, next) => {
  if (!req.user?._id || (when && !when(req)) || req.headers["x-no-cache"]) return next();

  const key = buildKey(req);
  const hit = store.get(key);
  if (hit) {
    res.set("X-Report-Cache", "HIT");
    return sendCached(res, hit);
  }

  const pending = inflight.get(key);
  if (pending) {
    const payload = await pending;
    if (payload) {
      res.set("X-Report-Cache", "SHARED");
      return sendCached(res, payload);
    }
    return next(); // the leader failed — run it ourselves
  }

  let settle;
  inflight.set(
    key,
    new Promise((resolve) => {
      settle = resolve;
    })
  );

  const originalSend = res.send;
  let done = false;
  const finish = (payload) => {
    if (done) return;
    done = true;
    inflight.delete(key);
    settle(payload);
  };

  res.send = function (body) {
    // res.send(object) re-enters via res.json -> res.send(string); only the final string
    // (already carrying permissions) is stored.
    if (typeof body === "string" && res.statusCode === 200) {
      store.set(key, body, ttl);
      finish(body);
    } else if (typeof body !== "object" || body === null) {
      finish(null);
    }
    return originalSend.call(this, body);
  };
  res.on("close", () => finish(null));

  res.set("X-Report-Cache", "MISS");
  return next();
};

// Drop every cached report (call after writes that change report data, if ever needed).
reportCache.clear = () => store.flushAll();

module.exports = reportCache;
