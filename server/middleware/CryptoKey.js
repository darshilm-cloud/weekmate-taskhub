const crypto = require("crypto");

/**
 * Create a unique cache key from a payload object
 * @param {object} payload
 * @returns {string} cache key
 */
function generateCacheKey(payload) {
  // Convert payload to ensure dates are properly serialized
  const processedPayload = Object.fromEntries(
    Object.entries(payload).map(([key, value]) => {
      if (value instanceof Date) {
        return [key, value.toISOString()];
      }
      return [key, value];
    })
  );
  
  const normalized = sortObject(processedPayload);
  const stringified = JSON.stringify(normalized);
  console.log("🚀 ~ generateCacheKey ~ stringified:", stringified)
  
  return crypto.createHash("md5").update(stringified).digest("hex");
}

/**
 * Recursively sort an object by keys
 */
function sortObject(obj) {
  if (Array.isArray(obj)) {
    return obj.map(sortObject);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj)
      .sort()
      .reduce((result, key) => {
        result[key] = sortObject(obj[key]);
        return result;
      }, {});
  }
  return obj;
}

module.exports = { generateCacheKey };
