const express = require('express');
const router = express.Router();

const accountController = require('../controllers/account.controller');
const { authenticate } = require('../middleware/auth');
const { cache } = require('../middleware/cache');
const { audit } = require('../middleware/auditLogger');

/**
 * @swagger
 * tags:
 *   name: Accounts
 *   description: Wallet account and balance
 */

/**
 * @swagger
 * /api/v1/accounts/me:
 *   get:
 *     summary: Get your wallet account and balance
 *     tags: [Accounts]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Account details with current balance
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/me',
  authenticate,
  cache(30),                      // cache balance for 30 seconds
  audit('VIEW_ACCOUNT', 'account'),
  accountController.getMyAccount
);

module.exports = router;
