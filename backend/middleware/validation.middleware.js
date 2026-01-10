let { body, validationResult } = require('express-validator');

let validatePassword=[
  body('password')
    .notEmpty()
    .withMessage('Password required')
    .isLength({ min: 8 })
    .withMessage('Password min 8 chars')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Uppercase, lowercase, number, special char required')
]

let handleValidationErrors = (req, res, next) => {
  let errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(({ path, msg }) => ({
        field: path,
        message: msg,
      })),
    })
  }
  next()
}

let validateRegister = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name 2-100 chars'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email required')
    .isEmail()
    .withMessage('Valid email required')
    .normalizeEmail(),

  ...validatePassword,

  handleValidationErrors,
]

let validateLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email required')
    .isEmail()
    .withMessage('Valid email required')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password required'),

  handleValidationErrors,
]

let validatePasswordReset = [
  ...validatePassword,

  handleValidationErrors,
]

let validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password required'),

  ...validatePassword,

  handleValidationErrors,
]

module.exports = {
  validateRegister,
  validateLogin,
  validatePasswordReset,
  validateChangePassword,
}