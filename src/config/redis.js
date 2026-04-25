const logger = require('./logger');

let _redis;
let _isUpstash = false;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const { Redis } = require('@upstash/redis');
  _redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  _isUpstash = true;
  logger.info('Redis configured via Upstash REST API');
} else {
  const IORedis = require('ioredis');
  _redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 200, 2000),
  });
  _redis.on('connect', () => logger.info('Redis connection established'));
  _redis.on('ready', () => logger.info('Redis ready to accept commands'));
  _redis.on('error', (err) => logger.error('Redis error', { message: err.message }));
}

// ── Unified interface ─────────────────────────────────────────────────────────
// Normalises Upstash REST and ioredis so middleware doesn't need to know which

const redis = {
  async get(key) {
    try { return await _redis.get(key); }
    catch (err) { logger.error('Redis get error', { message: err.message }); return null; }
  },

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
      logger.error('Redis set error', { message: err.message }); return null;
    }
  },

  async del(key) {
    try { return await _redis.del(key); }
    catch (err) { logger.error('Redis del error', { message: err.message }); return null; }
  },

  async call(...args) {
    try {
      if (_isUpstash) {
        const [cmd, ...rest] = args;
        return await _redis[cmd.toLowerCase()](...rest);
      }
      return await _redis.call(...args);
    } catch (err) {
      logger.error('Redis call error', { message: err.message }); return null;
    }
  },

  get status() {
    if (_isUpstash) return 'ready';
    return _redis.status;
  },

  async quit() {
    if (!_isUpstash) await _redis.quit();
  },
};

const disconnectRedis = async () => {
  try { await redis.quit(); } catch (_) {}
  logger.info('Redis disconnected');
};

module.exports = redis;
module.exports.disconnectRedis = disconnectRedis;
