const Redis = require('ioredis');
const logger = require('./logger');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const isTLS = redisUrl.startsWith('rediss://');

const options = {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  connectTimeout: 20000,
  keepAlive: 10000,
  tls: isTLS ? { rejectUnauthorized: false } : undefined,

  retryStrategy(times) {
    if (times > 5) {
      logger.error('Redis connection failed after 5 retries');
      return null;
    }
    return Math.min(times * 500, 5000);
  },
};

const redis = new Redis(redisUrl, options);

redis.on('connect', () => logger.info('Redis connection established'));
redis.on('ready', () => logger.info('Redis ready to accept commands'));
redis.on('error', (err) => logger.error('Redis error', { message: err.message }));
redis.on('close', () => logger.warn('Redis connection closed'));

const disconnectRedis = async () => {
  try {
    await redis.quit();
  } catch (_) {
    redis.disconnect();
  }
  logger.info('Redis disconnected');
};

module.exports = redis;
module.exports.disconnectRedis = disconnectRedis;
