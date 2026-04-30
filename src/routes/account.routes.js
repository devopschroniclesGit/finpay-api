const express = require('express');
const router = express.Router();

const accountController = require('../controllers/account.controller');
const { authenticate } = require('../middleware/auth');
const { cache } = require('../middleware/cache');
const { audit } = require('../middleware/auditLogger');

router.get(
  '/me',
  authenticate,
  cache(5),
  audit('VIEW_ACCOUNT', 'account'),
  accountController.getMyAccount
);

router.post(
  '/topup',
  authenticate,
  audit('TOP_UP', 'account'),
  accountController.topUp
);

module.exports = router;
