const redis = require('../config/redis');
const logger = require('../config/logger');

/**
 * Redis response cache middleware
 *
 * Usage:
 *   router.get('/account', authenticate, cache(30), handler)
 *   └── caches the response for 30 seconds, keyed by URL + userId
 *
 * Cache is automatically invalidated by TTL — no manual busting needed
 * for read-heavy endpoints like balance and transaction history.
 */
const cache = (ttlSeconds = 60) => async (req, res, next) => {
  // Cache key is scoped to the user — user A never sees user B's data
  const key = `cache:${req.originalUrl}:${req.user?.id || 'public'}`;

  try {
    const cached = await redis.get(key);

    if (cached) {
      logger.debug('Cache hit', { key, url: req.originalUrl });
      return res.status(200).json(JSON.parse(cached));
    }

    logger.debug('Cache miss', { key, url: req.originalUrl });

    // Intercept res.json to cache the response after it's sent
    const originalJson = res.json.bind(res);

    res.json = async (body) => {
      if (res.statusCode === 200) {
        try {
	  await redis.set(key, JSON.stringify(body), { ex: ttlSeconds });
          logger.debug('Response cached', { key, ttl: ttlSeconds });
        } catch (cacheErr) {
          logger.error('Failed to cache response', { error: cacheErr.message });
        }
      }
      return originalJson(body);
    };

    next();
  } catch (err) {
    // If Redis is down, skip caching and serve the request normally
    logger.error('Cache middleware error — serving uncached', { error: err.message });
    next();
  }
};

module.exports = { cache };
