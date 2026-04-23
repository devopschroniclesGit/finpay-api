const accountService = require('../services/account.service');
const { success } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

const getMyAccount = asyncHandler(async (req, res) => {
  const account = await accountService.getAccount(req.user.id);
  return success(res, account, 'Account details');
});

module.exports = { getMyAccount };
