const { body } = require('express-validator');

const sendMoneyRules = [
  body('receiverEmail')
    .isEmail()
    .withMessage('Must be a valid recipient email address')
    .normalizeEmail(),

  body('amount')
    .isFloat({ min: 1.00, max: 50000.00 })
    .withMessage('Amount must be between R1.00 and R50,000.00'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Description must be under 255 characters'),
];

module.exports = { sendMoneyRules };
