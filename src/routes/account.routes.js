const express      = require('express');
const router       = express.Router();
const prisma       = require('../config/database');
const accountController = require('../controllers/account.controller');
const { authenticate }  = require('../middleware/auth');
const { cache }         = require('../middleware/cache');
const { audit }         = require('../middleware/auditLogger');
const { success, error } = require('../utils/response');
const asyncHandler      = require('../utils/asyncHandler');

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

router.get(
  '/ledger',
  authenticate,
  asyncHandler(async (req, res) => {
    const account = await prisma.account.findUnique({
      where: { userId: req.user.id },
    });

    if (!account) {
      return error(res, 'Account not found', 404);
    }

    const entries = await prisma.ledgerEntry.findMany({
      where:   { accountId: account.id },
      orderBy: { createdAt: 'desc' },
      include: {
        transaction: {
          select: { id: true, status: true, description: true },
        },
      },
    });

    const formatted = entries.map(e => ({
      ...e,
      amount:       Number(e.amount),
      balanceAfter: Number(e.balanceAfter),
    }));

    return success(res, formatted, 'Ledger entries');
  })
);

module.exports = router;
