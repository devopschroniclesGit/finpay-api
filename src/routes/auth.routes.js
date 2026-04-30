const express      = require('express');
const router       = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { registerRules, loginRules } = require('../validators/auth.validators');
const { success, error } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const redis        = require('../config/redis');

router.post('/register', authLimiter, registerRules, authController.register);
router.post('/login', authLimiter, loginRules, authController.login);
router.get('/me', authenticate, authController.getProfile);

router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  const TTL   = 7 * 24 * 60 * 60;
  await redis.set(`blacklist:${token}`, '1', { ex: TTL });
  return success(res, null, 'Logged out successfully');
}));

module.exports = router;
