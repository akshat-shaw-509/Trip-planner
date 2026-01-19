let { body, validationResult } = require('express-validator');

// ✅ Valid categories - matches Expense model
let validCategories = [
  'accommodation',
  'food',
  'transport',
  'activities',
  'shopping',
  'entertainment',
  'miscellaneous'
];

// ✅ Valid payment methods - matches Expense model
let validPaymentMethods = [
  'cash',
  'credit_card',
  'debit_card',
  'wallet',
  'other'
];

// Shared optional fields (DRY)
let optionalFields = [
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes max 1000'),
  body('receipt').optional().trim().isURL().withMessage('Valid URL required'),
  body('location').optional().trim().isLength({ max: 200 }).withMessage('Max 200 chars'),
  body('vendor').optional().trim().isLength({ max: 200 }).withMessage('Max 200 chars'),
  body('paidBy').optional().trim().isLength({ max: 200 }).withMessage('Max 200 chars'),
  body('activityId').optional().isMongoId().withMessage('Invalid ID')
];

// Required fields for CREATE
let requiredFields = [
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description required')
    .isLength({ min: 3, max: 500 })
    .withMessage('Description 3-500 chars'),

  body('amount')
    .notEmpty()
    .withMessage('Amount required')
    .isFloat({ min: 0.01 })
    .withMessage('Amount > 0.01'),

  body('category')
    .notEmpty()
    .withMessage('Category required')
    .isIn(validCategories)
    .withMessage('Valid category required'),

  body('date')
    .notEmpty()
    .withMessage('Date required')
    .isISO8601()
    .withMessage('Valid date required'),

  // ✅ ADDED: paymentMethod validation
  body('paymentMethod')
    .notEmpty()
    .withMessage('Payment method required')
    .isIn(validPaymentMethods)
    .withMessage('Valid payment method required')
];

let validateExpense = [
  ...requiredFields,
  ...optionalFields,

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(({ path, msg }) => ({ 
          field: path, 
          message: msg 
        }))
      })
    }
    next()
  }
];

let validateExpenseUpdate = [
  // All optional for updates
  body('description')
    .optional()
    .trim()
    .isLength({ min: 3, max: 500 })
    .withMessage('Description 3-500 chars'),

  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Amount > 0.01'),

  body('category')
    .optional()
    .isIn(validCategories)
    .withMessage('Valid category required'),

  body('date')
    .optional()
    .isISO8601()
    .withMessage('Valid date required'),

  // ✅ ADDED: paymentMethod validation for updates
  body('paymentMethod')
    .optional()
    .isIn(validPaymentMethods)
    .withMessage('Valid payment method required'),

  ...optionalFields,

  (req, res, next) => {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(({ path, msg }) => ({ 
          field: path, 
          message: msg 
        }))
      })
    }
    next()
  }
];

module.exports = { validateExpense, validateExpenseUpdate }