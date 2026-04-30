const prisma = require('../config/database');
const redis  = require('../config/redis');
const { Decimal } = require('@prisma/client/runtime/library');

const getAccount = async (userId) => {
  const account = await prisma.account.findUnique({
    where: { userId },
    include: {
      user: {
        select: { firstName: true, lastName: true, email: true },
      },
    },
  });

  if (!account) {
    const err = new Error('Account not found');
    err.statusCode = 404;
    throw err;
  }

  return { ...account, balance: Number(account.balance) };
};

const getAccountById = async (accountId) => {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    const err = new Error('Account not found');
    err.statusCode = 404;
    throw err;
  }

  return account;
};

const topUp = async (userId, amount) => {
  const topUpAmount = new Decimal(amount);

  if (topUpAmount.lte(0)) {
    const err = new Error('Top-up amount must be greater than zero');
    err.statusCode = 400;
    throw err;
  }

  if (topUpAmount.gt(new Decimal('50000.00'))) {
    const err = new Error('Maximum top-up amount is R50,000.00');
    err.statusCode = 400;
    throw err;
  }

  // Get system account
  const systemAccount = await prisma.account.findFirst({
    where: { user: { email: 'system@finpay.dev' } },
  });

  if (!systemAccount) {
    const err = new Error('System account not configured');
    err.statusCode = 500;
    throw err;
  }

  // Get user account
  const userAccount = await prisma.account.findUnique({
    where: { userId },
  });

  if (!userAccount) {
    const err = new Error('Account not found');
    err.statusCode = 404;
    throw err;
  }

  // Atomic top-up recorded as a transaction from system to user
  const result = await prisma.$transaction(async (tx) => {
    // Debit system account
    await tx.account.update({
      where: { id: systemAccount.id },
      data:  { balance: { decrement: topUpAmount } },
    });

    // Credit user account
    const updated = await tx.account.update({
      where: { id: userAccount.id },
      data:  { balance: { increment: topUpAmount } },
    });

    // Record as transaction so it appears in history
    const txRecord = await tx.transaction.create({
      data: {
        idempotencyKey: `topup-${userId}-${Date.now()}`,
        senderId:       systemAccount.id,
        receiverId:     userAccount.id,
        amount:         topUpAmount,
        currency:       'ZAR',
        status:         'COMPLETED',
        description:    'Wallet top-up',
      },
    });

    // Ledger entries
    const systemUpdated = await tx.account.findUnique({
      where: { id: systemAccount.id },
    });

    await tx.ledgerEntry.create({
      data: {
        accountId:     systemAccount.id,
        transactionId: txRecord.id,
        amount:        topUpAmount.negated(),
        type:          'DEBIT',
        description:   'Wallet top-up issued',
        balanceAfter:  systemUpdated.balance,
      },
    });

    await tx.ledgerEntry.create({
      data: {
        accountId:     userAccount.id,
        transactionId: txRecord.id,
        amount:        topUpAmount,
        type:          'TOPUP',
        description:   'Wallet top-up received',
        balanceAfter:  updated.balance,
      },
    });

    return { account: updated, transaction: txRecord };
  });

  // Bust cache so balance updates immediately
  await redis.del(`cache:/api/v1/accounts/me:${userId}`);
  await redis.del(`cache:/api/v1/transactions/history?page=1&limit=10:${userId}`);

  return { ...result.account, balance: Number(result.account.balance) };
};

module.exports = { getAccount, getAccountById, topUp };
