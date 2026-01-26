let { body, validationResult } = require('express-validator')

/**
 * -------------------- Password Validation Rules --------------------
 * Enforces strong password policy
 */
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

/**
 * -------------------- Common Validation Error Handler --------------------
 * Formats validation errors in a consistent response structure
 */
let handleValidationErrors = (req, res, next) => {
  let errors = validationResult(req)
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(({ path, msg }) => ({
        field: path,
        message: msg,
      })),
    })
  }
  
  next()
}

/**
 * -------------------- Register Validation --------------------
 */
let validateRegister = [
  // User full name validation
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),

  // Email validation
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),

  // Strong password validation
  ...validatePassword,

  // Final validation error handler
  handleValidationErrors,
]

/**
 * -------------------- Login Validation --------------------
 */
let validateLogin = [
  // Email validation
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),
  
  // Password presence check (strength not required for login)
  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  // Final validation error handler
  handleValidationErrors,
]

/**
 * -------------------- Password Reset Validation --------------------
 * Used when setting a new password
 */
let validatePasswordReset = [
  ...validatePassword,
  handleValidationErrors,
]

/**
 * -------------------- Change Password Validation --------------------
 * Requires current password + new strong password
 */
let validateChangePassword = [
  // Current password verification
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  // New password strength validation
  ...validatePassword,

  // Final validation error handler
  handleValidationErrors,
]

/**
 * Export all validation middlewares
 */
module.exports = {
  validateRegister,
  validateLogin,
  validatePasswordReset,
  validateChangePassword,
}
