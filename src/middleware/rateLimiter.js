const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redis = require('../config/redis');
const logger = require('../config/logger');

// Shared Redis store factory
const makeStore = (prefix) => new RedisStore({
  sendCommand: async (...args) => {
    try {
      return await redis.call(...args);
    } catch (err) {
      logger.warn('Rate limit Redis unavailable — skipping', { error: err.message });
      throw err;
    }
  },
  prefix: `rl:${prefix}:`,
});

// Called when a client hits the limit — logs it for observability
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

// ── Global API limiter ────────────────────────────────────────────────────────
// Applied to all /api routes
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('api'),
  skip: () => redis.status !== 'ready',  // ← add this line
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

// ── Auth limiter ──────────────────────────────────────────────────────────────
// Applied to /auth/login and /auth/register only
// Tight window to prevent brute force and credential stuffing
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('auth'),
  handler: (req, res, next, options) => {
    onLimitReached(req, res, options);
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts. Please try again in 15 minutes.',
      timestamp: new Date().toISOString(),
    });
  },
});

// ── Transaction limiter ───────────────────────────────────────────────────────
// Applied to POST /transactions/send only
// Per-minute window to prevent rapid-fire transfers
const transactionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('tx'),
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
