const prisma = require('../config/database');
const logger = require('../config/logger');

/**
 * Audit log middleware — records every state-changing action
 *
 * Runs AFTER the response is sent (res.on('finish')) so it never
 * slows down the request. Failures are logged but never thrown —
 * a failed audit write must not break the user's transaction.
 *
 * Usage:
 *   router.post('/send', authenticate, audit('SEND_MONEY', 'transaction'), handler)
 */
const audit = (action, entity) => async (req, res, next) => {
  res.on('finish', async () => {
    // Only audit successful state-changing operations
    if (res.statusCode >= 400) return;

    try {
      await prisma.auditLog.create({
        data: {
          userId: req.user?.id || null,
          action,
          entity,
          entityId: req.params?.id || null,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || null,
        },
      });

      logger.debug('Audit log written', {
        action,
        entity,
        userId: req.user?.id,
      });
    } catch (err) {
      // Log failure internally — never surface to user
      logger.error('Failed to write audit log', {
        error: err.message,
        action,
        entity,
        userId: req.user?.id,
      });
    }
  });

  next();
};

module.exports = { audit };
