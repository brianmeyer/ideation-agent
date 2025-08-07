const NodeCache = require('node-cache');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    // Different TTLs for different types of content
    this.TTL = {
      SHORT: 300,    // 5 minutes for temporary data
      MEDIUM: 3600,  // 1 hour for regular responses
      LONG: 86400,   // 24 hours for static content
      PERMANENT: 0   // No expiration
    };

    this.cache = new NodeCache({
      stdTTL: this.TTL.MEDIUM,
      checkperiod: 600, // Check for expired keys every 10 minutes
      useClones: false, // Store references instead of cloning
      maxKeys: 10000   // Maximum number of keys
    });

    // Handle cache errors
    this.cache.on('error', (err) => {
      logger.error('Cache error:', { error: err.message });
    });
  }

  async get(key) {
    try {
      const value = this.cache.get(key);
      if (value) {
        logger.debug('Cache hit', { key, timestamp: new Date().toISOString() });
        return value;
      }
      logger.debug('Cache miss', { key, timestamp: new Date().toISOString() });
      return null;
    } catch (error) {
      logger.error('Cache get error:', { key, error: error.message });
      return null;
    }
  }

  async set(key, value, ttl = this.TTL.MEDIUM) {
    try {
      const success = this.cache.set(key, value, ttl);
      if (success) {
        logger.debug('Cache set', { 
          key, 
          ttl, 
          timestamp: new Date().toISOString(),
          valueSize: JSON.stringify(value).length
        });
      } else {
        logger.warn('Cache set failed', { key });
      }
      return success;
    } catch (error) {
      logger.error('Cache set error:', { key, error: error.message });
      return false;
    }
  }

  async del(key) {
    try {
      const count = this.cache.del(key);
      logger.debug('Cache delete', { key, count, timestamp: new Date().toISOString() });
      return count;
    } catch (error) {
      logger.error('Cache delete error:', { key, error: error.message });
      return 0;
    }
  }

  async flush() {
    try {
      this.cache.flushAll();
      logger.info('Cache flushed', { timestamp: new Date().toISOString() });
    } catch (error) {
      logger.error('Cache flush error:', { error: error.message });
    }
  }

  async getStats() {
    try {
      const stats = this.cache.getStats();
      logger.debug('Cache stats:', { stats, timestamp: new Date().toISOString() });
      return stats;
    } catch (error) {
      logger.error('Cache stats error:', { error: error.message });
      return null;
    }
  }
}

module.exports = CacheService; 