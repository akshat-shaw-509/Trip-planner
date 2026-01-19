// middleware/validation.middleware.js
let { body, validationResult } = require('express-validator');

// Updated: Granular Password Validation
let validatePassword = [
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least 1 uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least 1 lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least 1 number')
    .matches(/[@$!%*?&]/)
    .withMessage('Password must contain at least 1 special character (@$!%*?&)')
]

// FIXED: Proper error handling without calling next() for errors
let handleValidationErrors = (req, res, next) => {
  let errors = validationResult(req)
  
  if (!errors.isEmpty()) {
    // Return immediately - don't call next()
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(({ path, msg }) => ({
        field: path,
        message: msg,
      })),
    })
  }
  
  // Only call next() if validation passes
  next()
}

let validateRegister = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),

  ...validatePassword,

  handleValidationErrors,
]

let validateLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  handleValidationErrors,
]

let validatePasswordReset = [
  ...validatePassword,
  handleValidationErrors,
]

let validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  ...validatePassword,

  handleValidationErrors,
]

module.exports = {
  validateRegister,
  validateLogin,
  validatePasswordReset,
  validateChangePassword,
}