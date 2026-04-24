const Redis = require('ioredis');
const logger = require('./logger');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const isTLS = redisUrl.startsWith('rediss://');

const redis = new Redis(redisUrl, {
  tls: isTLS ? { rejectUnauthorized: false } : undefined,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  connectTimeout: 20000,
  keepAlive: 5000,
  // Reconnect forever — Upstash closes idle connections, this brings it back
  retryStrategy(times) {
    return Math.min(times * 300, 3000);
  },
});

redis.on('connect', () => logger.info('Redis connection established'));
redis.on('ready', () => logger.info('Redis ready to accept commands'));
redis.on('error', (err) => logger.error('Redis error', { message: err.message }));
redis.on('close', () => logger.warn('Redis connection closed'));
redis.on('reconnecting', () => logger.info('Redis reconnecting...'));

const disconnectRedis = async () => {
  try { await redis.quit(); } catch (_) { redis.disconnect(); }
  logger.info('Redis disconnected');
};

module.exports = redis;
module.exports.disconnectRedis = disconnectRedis;
