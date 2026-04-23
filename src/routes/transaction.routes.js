const express = require('express');
const router = express.Router();

const txController = require('../controllers/transaction.controller');
const { authenticate } = require('../middleware/auth');
const { transactionLimiter } = require('../middleware/rateLimiter');
const { idempotencyCheck } = require('../middleware/idempotency');
const { cache } = require('../middleware/cache');
const { audit } = require('../middleware/auditLogger');
const { sendMoneyRules } = require('../validators/transaction.validators');

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Money transfers and transaction history
 */

/**
 * @swagger
 * /api/v1/transactions/send:
 *   post:
 *     summary: Send money to another user
 *     tags: [Transactions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique UUID per request — prevents duplicate transfers on retry
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [receiverEmail, amount]
 *             properties:
 *               receiverEmail:
 *                 type: string
 *                 example: bob@finpay.dev
 *               amount:
 *                 type: number
 *                 example: 500.00
 *               description:
 *                 type: string
 *                 example: Rent payment
 *     responses:
 *       201:
 *         description: Transfer completed
 *       400:
 *         description: Missing Idempotency-Key or validation failed
 *       422:
 *         description: Insufficient funds
 *       429:
 *         description: Too many requests
 */
router.post(
  '/send',
  authenticate,
  transactionLimiter,
  sendMoneyRules,
  idempotencyCheck,
  audit('SEND_MONEY', 'transaction'),
  txController.sendMoney
);

/**
 * @swagger
 * /api/v1/transactions/history:
 *   get:
 *     summary: Get your transaction history (paginated)
 *     tags: [Transactions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Paginated transaction history
 */
router.get(
  '/history',
  authenticate,
  cache(15),
  txController.getHistory
);

/**
 * @swagger
 * /api/v1/transactions/{id}:
 *   get:
 *     summary: Get a single transaction by ID
 *     tags: [Transactions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transaction details
 *       403:
 *         description: Access denied — not your transaction
 *       404:
 *         description: Transaction not found
 */
router.get(
  '/:id',
  authenticate,
  txController.getOne
);

module.exports = router;
