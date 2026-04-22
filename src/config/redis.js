const Redis = require('ioredis');
const logger = require('./logger');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  connectTimeout: 10000,

  retryStrategy(times) {
    if (times > 3) {
      logger.error('Redis connection failed after 3 retries — giving up');
      return null; // stop retrying
    }
    const delay = Math.min(times * 200, 2000);
    logger.warn(`Redis retry attempt ${times} — waiting ${delay}ms`);
    return delay;
  },
});

redis.on('connect', () => {
  logger.info('Redis connection established');
});

redis.on('ready', () => {
  logger.info('Redis ready to accept commands');
});

redis.on('error', (err) => {
  logger.error('Redis error', { message: err.message });
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

// Graceful shutdown helper
const disconnectRedis = async () => {
  await redis.quit();
  logger.info('Redis disconnected gracefully');
};

module.exports = redis;
module.exports.disconnectRedis = disconnectRedis;
