const { rateLimit } = require('express-rate-limit');
const logger = require('../config/logger');

// Custom store that works with both ioredis and Upstash REST client
class RedisRateLimitStore {
  constructor(prefix) {
    this.prefix = prefix;
    this.windowMs = 0;
  }

  init(options) {
    this.windowMs = options.windowMs;
  }

  async get(key) {
    try {
      const redis = require('../config/redis');
      const val = await redis.get(`${this.prefix}${key}`);
      if (!val) return { totalHits: 0, resetTime: new Date(Date.now() + this.windowMs) };
      const parsed = JSON.parse(val);
      return { totalHits: parsed.hits, resetTime: new Date(parsed.reset) };
    } catch {
      return { totalHits: 0, resetTime: new Date(Date.now() + this.windowMs) };
    }
  }

  async increment(key) {
    try {
      const redis = require('../config/redis');
      const storeKey = `${this.prefix}${key}`;
      const existing = await redis.get(storeKey);
      const now = Date.now();

      if (!existing) {
        const data = { hits: 1, reset: now + this.windowMs };
        await redis.set(storeKey, JSON.stringify(data), { ex: Math.ceil(this.windowMs / 1000) });
        return { totalHits: 1, resetTime: new Date(data.reset) };
      }

      const parsed = JSON.parse(existing);
      parsed.hits += 1;
      const ttl = Math.ceil((parsed.reset - now) / 1000);
      if (ttl > 0) {
        await redis.set(storeKey, JSON.stringify(parsed), { ex: ttl });
      }
      return { totalHits: parsed.hits, resetTime: new Date(parsed.reset) };
    } catch {
      return { totalHits: 0, resetTime: new Date(Date.now() + this.windowMs) };
    }
  }

  async decrement(key) {
    try {
      const redis = require('../config/redis');
      const storeKey = `${this.prefix}${key}`;
      const existing = await redis.get(storeKey);
      if (existing) {
        const parsed = JSON.parse(existing);
        parsed.hits = Math.max(0, parsed.hits - 1);
        await redis.set(storeKey, JSON.stringify(parsed));
      }
    } catch {}
  }

  async resetKey(key) {
    try {
      const redis = require('../config/redis');
      await redis.del(`${this.prefix}${key}`);
    } catch {}
  }
}

const onLimitReached = (req, res, options) => {
  logger.warn('Rate limit exceeded', {
    ip: req.ip,
    method: req.method,
    url: req.originalUrl,
    userId: req.user?.id || 'unauthenticated',
  });
};

const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore('rl:api:'),
  handler: (req, res, next, options) => {
    onLimitReached(req, res, options);
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
      timestamp: new Date().toISOString(),
    });
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore('rl:auth:'),
  handler: (req, res, next, options) => {
    onLimitReached(req, res, options);
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts. Please try again in 15 minutes.',
      timestamp: new Date().toISOString(),
    });
  },
});

const transactionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisRateLimitStore('rl:tx:'),
  handler: (req, res, next, options) => {
    onLimitReached(req, res, options);
    res.status(429).json({
      success: false,
      message: 'Too many transaction requests.',
      timestamp: new Date().toISOString(),
    });
  },
});

module.exports = { apiLimiter, authLimiter, transactionLimiter };
