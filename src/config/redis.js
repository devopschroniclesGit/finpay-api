const Redis = require('ioredis');
const logger = require('./logger');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const isTLS = redisUrl.startsWith('rediss://');

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  connectTimeout: 15000,
  lazyConnect: true,
  tls: isTLS ? { rejectUnauthorized: false } : undefined,

  retryStrategy(times) {
    if (times > 5) {
      logger.error('Redis connection failed after 5 retries — giving up');
      return null;
    }
    const delay = Math.min(times * 500, 5000);
    logger.warn(`Redis retry attempt ${times} — waiting ${delay}ms`);
    return delay;
  },
});

redis.on('connect', () => logger.info('Redis connection established'));
redis.on('ready', () => logger.info('Redis ready to accept commands'));
redis.on('error', (err) => logger.error('Redis error', { message: err.message }));
redis.on('close', () => logger.warn('Redis connection closed'));

// Connect explicitly — lazyConnect means it won't auto-connect on import
redis.connect().catch((err) => {
  logger.error('Redis initial connection failed', { message: err.message });
});

const disconnectRedis = async () => {
  await redis.quit();
  logger.info('Redis disconnected gracefully');
};

module.exports = redis;
module.exports.disconnectRedis = disconnectRedis;
