const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/accounts', require('./account.routes'));
router.use('/transactions', require('./transaction.routes'));

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     summary: Health check — used by Docker and CI/CD pipeline
 *     tags: [System]
 *     responses:
 *       200:
 *         description: API is healthy
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    service: 'finpay-api',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV,
  });
});

module.exports = router;
