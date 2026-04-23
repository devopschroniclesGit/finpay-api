const transactionService = require('../services/transaction.service');
const { success, error, paginated } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const { validationResult } = require('express-validator');

const sendMoney = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return error(res, 'Validation failed', 400, errors.array());
  }

  const { receiverEmail, amount, description } = req.body;
  const idempotencyKey = req.headers['idempotency-key'];

  const transaction = await transactionService.sendMoney({
    senderId: req.user.id,
    receiverEmail,
    amount,
    description,
    idempotencyKey,
  });

  return success(res, transaction, 'Transfer completed successfully', 201);
});

const getHistory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  const result = await transactionService.getTransactionHistory(
    req.user.id,
    { page, limit }
  );

  return paginated(
    res,
    result.transactions,
    result.pagination,
    'Transaction history'
  );
});

const getOne = asyncHandler(async (req, res) => {
  const transaction = await transactionService.getTransaction(
    req.params.id,
    req.user.id
  );
  return success(res, transaction, 'Transaction details');
});

module.exports = { sendMoney, getHistory, getOne };
