const { Redis } = require('@upstash/redis');
const logger = require('./logger');

let redis;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  // Production — Upstash HTTP client (no persistent connection)
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  logger.info('Redis configured via Upstash REST API');
} else {
  // Local development — standard ioredis
  const IORedis = require('ioredis');
  redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 200, 2000),
  });
  redis.on('connect', () => logger.info('Redis connection established'));
  redis.on('error', (err) => logger.error('Redis error', { message: err.message }));
}

const disconnectRedis = async () => {
  if (redis.quit) await redis.quit().catch(() => {});
  logger.info('Redis disconnected');
};

module.exports = redis;
module.exports.disconnectRedis = disconnectRedis;
