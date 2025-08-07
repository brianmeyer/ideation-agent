const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// In-memory store for rate limiting
class RateLimitStore {
  constructor() {
    this.store = new Map();
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Cleanup every minute
  }

  increment(key) {
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const record = this.store.get(key) || { count: 0, resetTime: now + windowMs };
    
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
    } else {
      record.count++;
    }
    
    this.store.set(key, record);
    return record;
  }

  decrement(key) {
    const record = this.store.get(key);
    if (record) {
      record.count = Math.max(0, record.count - 1);
      this.store.set(key, record);
    }
  }

  resetKey(key) {
    this.store.delete(key);
  }

  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

// Create store instances for different types of rate limiting
const apiStore = new RateLimitStore();
const chatStore = new RateLimitStore();
const socketStore = new RateLimitStore();

// Rate limit configuration
const createRateLimiter = (store, windowMs, max) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too many requests, please try again later.',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: {
      increment: (key) => {
        const record = store.increment(key);
        return {
          totalHits: record.count,
          resetTime: record.resetTime
        };
      },
      decrement: (key) => store.decrement(key),
      resetKey: (key) => store.resetKey(key)
    }
  });
};

// Create different limiters for different endpoints
const apiLimiter = createRateLimiter(apiStore, 60 * 1000, 60); // 60 requests per minute
const chatLimiter = createRateLimiter(chatStore, 60 * 1000, 30); // 30 messages per minute

// Socket.IO rate limiting
class SocketRateLimiter {
  constructor(store, points, duration) {
    this.store = store;
    this.points = points;
    this.duration = duration;
  }

  async check(socketId) {
    const key = `socket:${socketId}`;
    const record = this.store.increment(key);
    
    if (record.count > this.points) {
      logger.warn('Socket rate limit exceeded', { socketId });
      return false;
    }
    
    return true;
  }
}

const socketLimiter = new SocketRateLimiter(socketStore, 30, 60); // 30 messages per 60 seconds

// Socket.IO rate limiting middleware
const socketRateLimit = async (socket, next) => {
  try {
    const canProceed = await socketLimiter.check(socket.id);
    if (!canProceed) {
      return next(new Error('Rate limit exceeded. Please try again later.'));
    }
    next();
  } catch (error) {
    logger.error('Socket rate limit error:', { error: error.message });
    next(error);
  }
};

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

module.exports = {
  limiter,
  apiLimiter,
  chatLimiter,
  socketLimiter,
  socketRateLimit
}; 