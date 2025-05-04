const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Express rate limiter for API endpoints
const createRateLimiter = (windowMs, max) => {
  return rateLimit({
    windowMs: windowMs,
    max: max,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', { 
        ip: req.ip,
        path: req.path
      });
      res.status(429).json({
        error: 'Too many requests',
        message: 'Please try again later'
      });
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

// Socket.IO rate limiter
class SocketRateLimiter {
  constructor(windowMs, max) {
    this.windowMs = windowMs;
    this.max = max;
    this.requests = new Map();
  }

  async check(socketId) {
    const now = Date.now();
    const userRequests = this.requests.get(socketId) || [];

    // Remove old requests
    const validRequests = userRequests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.max) {
      logger.warn('Socket rate limit exceeded', { socketId });
      return false;
    }

    // Add new request
    validRequests.push(now);
    this.requests.set(socketId, validRequests);
    return true;
  }

  cleanup() {
    const now = Date.now();
    for (const [socketId, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => now - time < this.windowMs);
      if (validRequests.length === 0) {
        this.requests.delete(socketId);
      } else {
        this.requests.set(socketId, validRequests);
      }
    }
  }
}

// API rate limiter
const apiLimiter = createRateLimiter(15 * 60 * 1000, 100); // 100 requests per 15 minutes

// Chat message rate limiter
const chatLimiter = new SocketRateLimiter(60 * 1000, 20); // 20 messages per minute

// Cleanup old requests every minute
setInterval(() => {
  chatLimiter.cleanup();
}, 60 * 1000);

module.exports = {
  apiLimiter,
  chatLimiter
}; 