const authService = require('../services/auth.service');
const { success, error } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const { validationResult } = require('express-validator');

const register = asyncHandler(async (req, res) => {
  // Check for validation errors from the route-level validators
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return error(res, 'Validation failed', 400, errors.array());
  }

  const { email, password, firstName, lastName } = req.body;
  const result = await authService.register({ email, password, firstName, lastName });

  return success(res, result, 'Account created successfully', 201);
});

const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return error(res, 'Validation failed', 400, errors.array());
  }

  const { email, password } = req.body;
  const result = await authService.login({ email, password });

  return success(res, result, 'Login successful');
});

const getProfile = asyncHandler(async (req, res) => {
  const profile = await authService.getProfile(req.user.id);
  return success(res, profile, 'User profile');
});

module.exports = { register, login, getProfile };
