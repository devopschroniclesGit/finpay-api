const { rateLimit } = require('express-rate-limit');
const redis = require('../config/redis');
const logger = require('../config/logger');

// ── Custom Redis store ─────────────────────────────────────────────────────────
// Works with both ioredis and Upstash REST via the unified redis wrapper.
// rate-limit-redis only works with ioredis directly, so we build our own.

class RedisRateLimitStore {
  constructor(prefix) {
    this.prefix = prefix;
    this.windowMs = 15 * 60 * 1000; // default, overridden by init()
  }

  // Called by express-rate-limit when it mounts the store
  init(options) {
    this.windowMs = options.windowMs;
  }

  _key(key) {
    return `${this.prefix}${key}`;
  }

  async get(key) {
    try {
      const val = await redis.get(this._key(key));
      if (!val) {
        return { totalHits: 0, resetTime: new Date(Date.now() + this.windowMs) };
      }
      const parsed = JSON.parse(val);
      return {
        totalHits: parsed.hits,
        resetTime: new Date(parsed.reset),
      };
    } catch {
      return { totalHits: 0, resetTime: new Date(Date.now() + this.windowMs) };
    }
  }

  async increment(key) {
    try {
      const storeKey = this._key(key);
      const existing = await redis.get(storeKey);
      const now = Date.now();

      if (!existing) {
        const data = { hits: 1, reset: now + this.windowMs };
        await redis.set(storeKey, JSON.stringify(data), {
          ex: Math.ceil(this.windowMs / 1000),
        });
        return { totalHits: 1, resetTime: new Date(data.reset) };
      }

      const parsed = JSON.parse(existing);
      parsed.hits += 1;
      const ttlSeconds = Math.ceil((parsed.reset - now) / 1000);

      if (ttlSeconds > 0) {
        await redis.set(storeKey, JSON.stringify(parsed), { ex: ttlSeconds });
      }

      return { totalHits: parsed.hits, resetTime: new Date(parsed.reset) };
    } catch {
      // If Redis is unavailable, allow the request through
      return { totalHits: 0, resetTime: new Date(Date.now() + this.windowMs) };
    }
  }

  async decrement(key) {
    try {
      const storeKey = this._key(key);
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
      await redis.del(this._key(key));
    } catch {}
  }
}

// ── Limit reached logger ───────────────────────────────────────────────────────

const onLimitReached = (req, res, options) => {
  logger.warn('Rate limit exceeded', {
    ip: req.ip,
    method: req.method,
    url: req.originalUrl,
    userId: req.user?.id || 'unauthenticated',
    limit: options.max,
    windowMs: options.windowMs,
  });
};

// ── Global API limiter ─────────────────────────────────────────────────────────
// Applied to all /api routes — 100 requests per 15 minutes

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
      retryAfter: Math.ceil(options.windowMs / 1000 / 60) + ' minutes',
      timestamp: new Date().toISOString(),
    });
  },
});

// ── Auth limiter ───────────────────────────────────────────────────────────────
// Applied to /auth/login and /auth/register — 10 requests per 15 minutes
// Prevents brute force and credential stuffing attacks

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

// ── Transaction limiter ────────────────────────────────────────────────────────
// Applied to POST /transactions/send — 20 requests per minute

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
      message: 'Too many transaction requests. Please slow down.',
      timestamp: new Date().toISOString(),
    });
  },
});

module.exports = { apiLimiter, authLimiter, transactionLimiter };
