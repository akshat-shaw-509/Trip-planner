let { body, validationResult } = require('express-validator')
// Allowed expense categories
let validCategories = [
  'accommodation',
  'food',
  'transport',
  'activities',
  'shopping',
  'entertainment',
  'miscellaneous'
]
// Allowed payment methods
let validPaymentMethods = [
  'cash',
  'credit_card',
  'debit_card',
  'wallet',
  'other'
]

let optionalFields = [
  // Additional notes about the expense
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes max 1000'),

  // Receipt URL
  body('receipt')
    .optional()
    .trim()
    .isURL()
    .withMessage('Valid URL required'),

  // Location where expense occurred
  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Max 200 chars'),

  // Vendor name
  body('vendor')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Max 200 chars'),

  // Person who paid for the expense
  body('paidBy')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Max 200 chars'),

  // Link expense to an activity
  body('activityId')
    .optional()
    .isMongoId()
    .withMessage('Invalid ID')
]

//Required Fields
let requiredFields = [
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description required')
    .isLength({ min: 3, max: 500 })
    .withMessage('Description 3-500 chars'),
  // Expense amount
  body('amount')
    .notEmpty()
    .withMessage('Amount required')
    .isFloat({ min: 0.01 })
    .withMessage('Amount > 0.01'),

  // Expense category
  body('category')
    .notEmpty()
    .withMessage('Category required')
    .isIn(validCategories)
    .withMessage('Valid category required'),

  // Date when expense occurred
  body('date')
    .notEmpty()
    .withMessage('Date required')
    .isISO8601()
    .withMessage('Valid date required'),

  // Payment method used
  body('paymentMethod')
    .notEmpty()
    .withMessage('Payment method required')
    .isIn(validPaymentMethods)
    .withMessage('Valid payment method required')
]

//Create Expense Validation 
let validateExpense = [
  ...requiredFields,
  ...optionalFields,
  (req, res, next) => {
    let errors = validationResult(req)

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
]

//Update Expense Validation
let validateExpenseUpdate = [
  // Description update validation
  body('description')
    .optional()
    .trim()
    .isLength({ min: 3, max: 500 })
    .withMessage('Description 3-500 chars'),

  // Amount update validation
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Amount > 0.01'),

  // Category update validation
  body('category')
    .optional()
    .isIn(validCategories)
    .withMessage('Valid category required'),

  // Date update validation
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Valid date required'),

  // Payment method update validation
  body('paymentMethod')
    .optional()
    .isIn(validPaymentMethods)
    .withMessage('Valid payment method required'),

  ...optionalFields,
  (req, res, next) => {
    let errors = validationResult(req)
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
]
module.exports = { validateExpense, validateExpenseUpdate }

