const logger = require('./logger');

let _redis;
let _isUpstash = false;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  // Production — Upstash HTTP REST client (no persistent connection)
  const { Redis } = require('@upstash/redis');
  _redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  _isUpstash = true;
  logger.info('Redis configured via Upstash REST API');
} else {
  // Local development — standard ioredis over TCP
  const IORedis = require('ioredis');
  _redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    connectTimeout: 10000,
    retryStrategy(times) {
      if (times > 5) return null;
      return Math.min(times * 200, 2000);
    },
  });
  _redis.on('connect', () => logger.info('Redis connection established'));
  _redis.on('ready',   () => logger.info('Redis ready to accept commands'));
  _redis.on('error',   (err) => logger.error('Redis error', { message: err.message }));
  _redis.on('close',   () => logger.warn('Redis connection closed'));
}

// ── Unified interface ──────────────────────────────────────────────────────────
// All middleware uses this wrapper — never calls _redis directly.
// This means middleware works identically in local dev (ioredis) and
// production (Upstash REST) without any conditional logic in the middleware.

const redis = {
  // GET a value
  async get(key) {
    try {
      return await _redis.get(key);
    } catch (err) {
      logger.error('Redis get error', { message: err.message });
      return null;
    }
  },

  // SET a value — options.ex = TTL in seconds
  // ioredis uses: setex(key, ttl, value)
  // Upstash uses: set(key, value, { ex: ttl })
  // This wrapper normalises both
  async set(key, value, options = {}) {
    try {
      if (_isUpstash) {
        return await _redis.set(key, value, options);
      } else {
        if (options.ex) {
          return await _redis.setex(key, options.ex, value);
        }
        return await _redis.set(key, value);
      }
    } catch (err) {
      logger.error('Redis set error', { message: err.message });
      return null;
    }
  },

  // DELETE a key
  async del(key) {
    try {
      return await _redis.del(key);
    } catch (err) {
      logger.error('Redis del error', { message: err.message });
      return null;
    }
  },

  // Raw command passthrough — used by rate-limit-redis store
  async call(...args) {
    try {
      if (_isUpstash) {
        const [cmd, ...rest] = args;
        return await _redis[cmd.toLowerCase()](...rest);
      }
      return await _redis.call(...args);
    } catch (err) {
      logger.error('Redis call error', { message: err.message });
      return null;
    }
  },

  // Status check — Upstash REST is always "ready" (stateless HTTP)
  get status() {
    if (_isUpstash) return 'ready';
    return _redis.status;
  },

  // Graceful shutdown
  async quit() {
    if (!_isUpstash && _redis.quit) {
      await _redis.quit();
    }
  },
};

const disconnectRedis = async () => {
  try {
    await redis.quit();
  } catch (_) {}
  logger.info('Redis disconnected');
};

module.exports = redis;
module.exports.disconnectRedis = disconnectRedis;
