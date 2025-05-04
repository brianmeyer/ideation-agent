const NodeCache = require('node-cache');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: 3600, // Default TTL: 1 hour
      checkperiod: 600 // Check for expired keys every 10 minutes
    });
  }

  async get(key) {
    const value = this.cache.get(key);
    if (value) {
      logger.debug('Cache hit', { key });
      return value;
    }
    logger.debug('Cache miss', { key });
    return null;
  }

  async set(key, value, ttl = 3600) {
    const success = this.cache.set(key, value, ttl);
    if (success) {
      logger.debug('Cache set', { key, ttl });
    } else {
      logger.warn('Cache set failed', { key });
    }
    return success;
  }

  async del(key) {
    const count = this.cache.del(key);
    logger.debug('Cache delete', { key, count });
    return count;
  }

  async flush() {
    this.cache.flushAll();
    logger.info('Cache flushed');
  }
}

module.exports = CacheService; 