const NodeCache = require("node-cache");

const Cache = new NodeCache();

class CacheManage {
  /**
   * Get cache data if exists.
   * @param {string} key 
   * @returns cached data or null
   */
  getCache(key) {
    return Cache.get(key) || null;
  }

  /**
   * Store cache with key, data, metadata and TTL.
   * @param {string} key 
   * @param {any} data 
   * @param {any} metadata 
   * @param {number} ttl in seconds
   */
  storeCache(key, data, metadata = null, ttl = 60) {
    Cache.set(key, { data, metadata }, ttl);
  }

  /**
   * Remove cache keys by exact key or module prefix.
   * @param {string} prefixOrKey 
   * @param {boolean} isPrefix 
   */
  removeCache(prefixOrKey, isPrefix = false) {
    if (isPrefix) {
      const keys = Cache.keys().filter(k => k.startsWith(prefixOrKey));
      Cache.del(keys);
    } else {
      Cache.del(prefixOrKey);
    }
  }

  /**
   * Check if cache key exists, if not store cache.
   * @param {string} key 
   * @param {any} data 
   * @param {any} metadata 
   * @param {number} ttl 
   * @returns {boolean} true if key exists, false if it was stored
   */
  checkCache(key) {
    const exists = Cache.has(key);
    if (exists) {
      return true;
    } else {
      return false;
    }
  }
}

module.exports = new CacheManage();
