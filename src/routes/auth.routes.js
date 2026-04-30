const express = require('express');
const router = express.Router();
const redis        = require('../config/redis');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { registerRules, loginRules } = require('../validators/auth.validators');
const { success } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: User registration, login, and profile
 */

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName]
 *             properties:
 *               email:
 *                 type: string
 *                 example: alice@finpay.dev
 *               password:
 *                 type: string
 *                 example: SecurePass123
 *               firstName:
 *                 type: string
 *                 example: Alice
 *               lastName:
 *                 type: string
 *                 example: Smith
 *     responses:
 *       201:
 *         description: Account created — returns user and JWT token
 *       409:
 *         description: Email already registered
 *       429:
 *         description: Too many attempts
 */
router.post('/register', authLimiter, registerRules, authController.register);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login and receive JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: alice@finpay.dev
 *               password:
 *                 type: string
 *                 example: SecurePass123
 *     responses:
 *       200:
 *         description: Login successful — returns user and JWT token
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many attempts
 */
router.post('/login', authLimiter, loginRules, authController.login);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authenticate, authController.getProfile);
/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout and revoke JWT token
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  const TTL   = 7 * 24 * 60 * 60; // 7 days — matches JWT expiry

  await redis.set(`blacklist:${token}`, '1', { ex: TTL });

  return success(res, null, 'Logged out successfully');
}));
module.exports = router;
