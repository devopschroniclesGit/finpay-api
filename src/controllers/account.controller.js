const accountService = require('../services/account.service');
const { success } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

const getMyAccount = asyncHandler(async (req, res) => {
  const account = await accountService.getAccount(req.user.id);
  return success(res, account, 'Account details');
});

const topUp = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  const account = await accountService.topUp(req.user.id, amount);
  return success(res, account, `R${amount} added to your wallet`);
});

module.exports = { getMyAccount, topUp };
