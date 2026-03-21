const cache = {};
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds

export function getCache(key) {
  const entry = cache[key];
  if (entry && Date.now() - entry.timestamp < CACHE_DURATION) {
    return entry.data; // return cached data if still fresh
  }
  return null; // cache expired or doesn't exist
}

export function setCache(key, data) {
  cache[key] = { data, timestamp: Date.now() };
}
