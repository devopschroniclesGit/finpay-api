const prisma = require('../config/database');

// ── Get account ───────────────────────────────────────────────────────────────

const getAccount = async (userId) => {
  const account = await prisma.account.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  if (!account) {
    const err = new Error('Account not found');
    err.statusCode = 404;
    throw err;
  }

  // Format balance as a number for consistent API responses
  // Prisma returns Decimal objects — convert to number for JSON serialisation
  return {
    ...account,
    balance: Number(account.balance),
  };
};

// ── Get account summary ───────────────────────────────────────────────────────
// Lightweight version used internally by transaction service

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

module.exports = { getAccount, getAccountById };
