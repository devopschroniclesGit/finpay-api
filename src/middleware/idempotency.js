const redis = require('../config/redis');
const { error } = require('../utils/response');
const logger = require('../config/logger');

const IDEMPOTENCY_TTL_SECONDS = 86400; // 24 hours

const idempotencyCheck = async (req, res, next) => {
  const key = req.headers['idempotency-key'];

  if (!key) {
    return error(
      res,
      'Idempotency-Key header is required for this endpoint. Generate a unique UUID per request.',
      400
    );
  }

  if (key.length > 255) {
    return error(res, 'Idempotency-Key must be 255 characters or fewer.', 400);
  }

  // Namespace by user ID — prevents one user spoofing another's key
  const redisKey = `idempotency:${req.user.id}:${key}`;

  try {
    const cached = await redis.get(redisKey);

    if (cached) {
      logger.info('Idempotent request detected — returning cached response', {
        userId: req.user.id,
        idempotencyKey: key,
      });

      const { statusCode, body } = JSON.parse(cached);
      return res.status(statusCode).json(body);
    }

    // Intercept res.json to cache the response after it's sent
    const originalJson = res.json.bind(res);

    res.json = async (body) => {
      // Only cache successful responses — don't cache errors
      if (res.statusCode < 400) {
        try {
	  await redis.set(redisKey, JSON.stringify(...), { ex: IDEMPOTENCY_TTL_SECONDS });		
          logger.debug('Idempotency key stored', {
            userId: req.user.id,
            key,
            ttl: IDEMPOTENCY_TTL_SECONDS,
          });
        } catch (cacheErr) {
          // Log but don't fail the request if caching fails
          logger.error('Failed to cache idempotency response', {
            error: cacheErr.message,
          });
        }
      }
      return originalJson(body);
    };

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { idempotencyCheck };
