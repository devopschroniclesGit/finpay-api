const { Decimal } = require('@prisma/client/runtime/library');
const prisma = require('../config/database');
const logger = require('../config/logger');

// ── Send money ────────────────────────────────────────────────────────────────

const sendMoney = async ({
  senderId,
  receiverEmail,
  amount,
  description,
  idempotencyKey,
}) => {
  // ── Input validation ──────────────────────────────────────────────────────

  const transferAmount = new Decimal(amount);

  if (transferAmount.lte(0)) {
    const err = new Error('Transfer amount must be greater than zero');
    err.statusCode = 400;
    throw err;
  }

  if (transferAmount.lt(new Decimal('1.00'))) {
    const err = new Error('Minimum transfer amount is R1.00');
    err.statusCode = 400;
    throw err;
  }

  if (transferAmount.gt(new Decimal('50000.00'))) {
    const err = new Error('Maximum single transfer amount is R50,000.00');
    err.statusCode = 400;
    throw err;
  }

  // ── Fetch sender account ──────────────────────────────────────────────────

  const senderAccount = await prisma.account.findUnique({
    where: { userId: senderId },
  });

  if (!senderAccount) {
    const err = new Error('Sender account not found');
    err.statusCode = 404;
    throw err;
  }

  // ── Fetch receiver account ────────────────────────────────────────────────

  const receiverUser = await prisma.user.findUnique({
    where: { email: receiverEmail.toLowerCase().trim() },
    include: { account: true },
  });

  if (!receiverUser) {
    const err = new Error('No account found for that email address');
    err.statusCode = 404;
    throw err;
  }

  if (!receiverUser.account) {
    const err = new Error('Receiver does not have a wallet account');
    err.statusCode = 404;
    throw err;
  }

  // ── Business rule checks ──────────────────────────────────────────────────

  if (senderAccount.id === receiverUser.account.id) {
    const err = new Error('Cannot transfer to your own account');
    err.statusCode = 400;
    throw err;
  }

  if (new Decimal(senderAccount.balance).lt(transferAmount)) {
    const err = new Error('Insufficient funds');
    err.statusCode = 422;
    throw err;
  }

  // ── Atomic transfer ───────────────────────────────────────────────────────
  //
  // prisma.$transaction() wraps all three operations in a single DB transaction.
  //
// After txRecord is created, add these lines:

// Get receiver's updated balance
  const receiverUpdated = await tx.account.findUnique({
    where: { id: receiverUser.account.id },
  });

// Write immutable ledger entries
  await tx.ledgerEntry.create({
    data: {
      accountId:     senderAccount.id,
      transactionId: txRecord.id,
      amount:        transferAmount.negated(),
      type:          'DEBIT',
      description:   description || 'Transfer sent',
      balanceAfter:  updatedSender.balance,
    },
  });

  await tx.ledgerEntry.create({
    data: {
      accountId:     receiverUser.account.id,
      transactionId: txRecord.id,
      amount:        transferAmount,
      type:          'CREDIT',
      description:   description || 'Transfer received',
      balanceAfter:  receiverUpdated.balance,
    },
  });
  return txRecord;
  // If ANY step throws:
  //   - The debit is rolled back
  //   - The credit is rolled back
  //   - The transaction record is rolled back
  //   - The database returns to its exact state before this function was called
  //
  // This guarantees money can never leave one account without arriving in another.
  // This is the same guarantee that every real payment processor provides.

  const transaction = await prisma.$transaction(async (tx) => {
    // Step 1: Debit sender
    const updatedSender = await tx.account.update({
      where: { id: senderAccount.id },
      data: { balance: { decrement: transferAmount } },
    });

    // Step 2: Guard against negative balance (belt-and-suspenders check)
    // This catches race conditions where two concurrent transfers
    // both passed the balance check above but together exceed the balance
    if (new Decimal(updatedSender.balance).lt(0)) {
      throw new Error('Insufficient funds after concurrent check');
    }

    // Step 3: Credit receiver
    await tx.account.update({
      where: { id: receiverUser.account.id },
      data: { balance: { increment: transferAmount } },
    });

    // Step 4: Record the transaction
    const txRecord = await tx.transaction.create({
      data: {
        idempotencyKey: idempotencyKey || null,
        senderId: senderAccount.id,
        receiverId: receiverUser.account.id,
        amount: transferAmount,
        currency: senderAccount.currency,
        status: 'COMPLETED',
        description: description || null,
      },
      include: {
        sender: {
          include: {
            user: { select: { email: true, firstName: true, lastName: true } },
          },
        },
        receiver: {
          include: {
            user: { select: { email: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    return txRecord;
  });

  logger.info('Transfer completed', {
    transactionId: transaction.id,
    senderId,
    receiverEmail,
    amount: transferAmount.toString(),
    currency: transaction.currency,
  });

  return {
    ...transaction,
    amount: Number(transaction.amount),
  };
};

// ── Transaction history ───────────────────────────────────────────────────────

const getTransactionHistory = async (userId, { page = 1, limit = 20 } = {}) => {
  const account = await prisma.account.findUnique({
    where: { userId },
  });

  if (!account) {
    const err = new Error('Account not found');
    err.statusCode = 404;
    throw err;
  }

  // Clamp page size to prevent abuse (requesting 10000 records at once)
  const safeLimit = Math.min(Math.max(1, limit), 100);
  const safePage = Math.max(1, page);
  const skip = (safePage - 1) * safeLimit;

  // Run count and data fetch in parallel for performance
  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        OR: [
          { senderId: account.id },
          { receiverId: account.id },
        ],
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: safeLimit,
      include: {
        sender: {
          include: {
            user: { select: { email: true, firstName: true, lastName: true } },
          },
        },
        receiver: {
          include: {
            user: { select: { email: true, firstName: true, lastName: true } },
          },
        },
      },
    }),
    prisma.transaction.count({
      where: {
        OR: [
          { senderId: account.id },
          { receiverId: account.id },
        ],
      },
    }),
  ]);

  // Add a 'direction' field so the frontend knows if this was sent or received
  const enriched = transactions.map((tx) => ({
    ...tx,
    amount: Number(tx.amount),
    direction: tx.senderId === account.id ? 'SENT' : 'RECEIVED',
  }));

  return {
    transactions: enriched,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
      hasNext: safePage < Math.ceil(total / safeLimit),
      hasPrev: safePage > 1,
    },
  };
};

// ── Get single transaction ────────────────────────────────────────────────────

const getTransaction = async (transactionId, userId) => {
  const account = await prisma.account.findUnique({ where: { userId } });

  if (!account) {
    const err = new Error('Account not found');
    err.statusCode = 404;
    throw err;
  }

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      sender: {
        include: {
          user: { select: { email: true, firstName: true, lastName: true } },
        },
      },
      receiver: {
        include: {
          user: { select: { email: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!transaction) {
    const err = new Error('Transaction not found');
    err.statusCode = 404;
    throw err;
  }

  // Users can only view their own transactions
  const belongsToUser =
    transaction.senderId === account.id ||
    transaction.receiverId === account.id;

  if (!belongsToUser) {
    const err = new Error('Access denied');
    err.statusCode = 403;
    throw err;
  }

  return {
    ...transaction,
    amount: Number(transaction.amount),
    direction: transaction.senderId === account.id ? 'SENT' : 'RECEIVED',
  };
};

module.exports = { sendMoney, getTransactionHistory, getTransaction };
