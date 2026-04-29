const prisma = require('../config/database');
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

  const account = await prisma.account.update({
    where: { userId },
    data: { balance: { increment: topUpAmount } },
  });

  return { ...account, balance: Number(account.balance) };
};

module.exports = { getAccount, getAccountById, topUp };
