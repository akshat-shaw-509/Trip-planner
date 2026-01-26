<<<<<<< HEAD
let { body, validationResult } = require('express-validator')

// Import allowed trip status values from constants
let { TRIP_STATUS } = require('../config/constants')

/**
 * -------------------- Common Validation Error Handler --------------------
 * Centralized handler to format validation errors consistently
 */
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

/**
 * -------------------- Date Range Validator --------------------
 * Ensures:
 * - startDate exists and is valid
 * - endDate exists and is after startDate
 */
let validateDateRange = () => [
  // Trip start date
  body('startDate')
    .notEmpty()
    .withMessage('Start date required')
    .isISO8601()
    .withMessage('Valid start date required'),

  // Trip end date
  body('endDate')
    .notEmpty()
    .withMessage('End date required')
    .isISO8601()
    .withMessage('Valid end date required')
    .custom((value, { req }) => {
      // End date must be after start date
      if (new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date')
      }
      return true
    })
]

/**
 * -------------------- Create Trip Validation --------------------
 */
let validateTrip = [
  // Trip title validation
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title 3-200 chars'),

  // Destination validation
  body('destination')
    .trim()
    .notEmpty()
    .withMessage('Destination required'),

  // Validate trip date range
  ...validateDateRange(),

  // Optional description
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description max 2000 chars'),

  // Optional budget
  body('budget')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Budget must be positive'),

  // Optional number of travelers
  body('travelers')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Travelers must be at least 1'),

  // Optional tags array
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),

  // Optional visibility flag
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be boolean'),

  // Optional trip status
  body('status')
    .optional()
    .isIn(Object.values(TRIP_STATUS))
    .withMessage(`Status: ${Object.values(TRIP_STATUS).join(', ')}`),

  // Final validation error handler
  handleValidationErrors,
]

/**
 * -------------------- Update Trip Validation --------------------
 * All fields are optional because updates are partial
 */
let validateTripUpdate = [
  // Title update validation
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title 3-200 chars'),

  // Destination update validation
  body('destination')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Destination required'),

  // Start date update validation
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Valid start date required'),

  // End date update validation
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('Valid end date required')
    .custom((value, { req }) => {
      // Only compare if startDate is provided
      if (req.body.startDate && new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date')
      }
      return true
    }),

  // Description update validation
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description max 2000 chars'),

  // Budget update validation
  body('budget')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Budget must be positive'),

  // Travelers update validation
  body('travelers')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Travelers must be at least 1'),

  // Status update validation
  body('status')
    .optional()
    .isIn(Object.values(TRIP_STATUS))
    .withMessage(`Status: ${Object.values(TRIP_STATUS).join(', ')}`),

  // Final validation error handler
  handleValidationErrors,
]

/**
 * Export validators for use in trip routes
 */
module.exports = { validateTrip, validateTripUpdate }
=======
let { body, validationResult } = require('express-validator')

// Import allowed trip status values from constants
let { TRIP_STATUS } = require('../config/constants')

/**
 * -------------------- Common Validation Error Handler --------------------
 * Centralized handler to format validation errors consistently
 */
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

/**
 * -------------------- Date Range Validator --------------------
 * Ensures:
 * - startDate exists and is valid
 * - endDate exists and is after startDate
 */
let validateDateRange = () => [
  // Trip start date
  body('startDate')
    .notEmpty()
    .withMessage('Start date required')
    .isISO8601()
    .withMessage('Valid start date required'),

  // Trip end date
  body('endDate')
    .notEmpty()
    .withMessage('End date required')
    .isISO8601()
    .withMessage('Valid end date required')
    .custom((value, { req }) => {
      // End date must be after start date
      if (new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date')
      }
      return true
    })
]

/**
 * -------------------- Create Trip Validation --------------------
 */
let validateTrip = [
  // Trip title validation
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title 3-200 chars'),

  // Destination validation
  body('destination')
    .trim()
    .notEmpty()
    .withMessage('Destination required'),

  // Validate trip date range
  ...validateDateRange(),

  // Optional description
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description max 2000 chars'),

  // Optional budget
  body('budget')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Budget must be positive'),

  // Optional number of travelers
  body('travelers')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Travelers must be at least 1'),

  // Optional tags array
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),

  // Optional visibility flag
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be boolean'),

  // Optional trip status
  body('status')
    .optional()
    .isIn(Object.values(TRIP_STATUS))
    .withMessage(`Status: ${Object.values(TRIP_STATUS).join(', ')}`),

  // Final validation error handler
  handleValidationErrors,
]

/**
 * -------------------- Update Trip Validation --------------------
 * All fields are optional because updates are partial
 */
let validateTripUpdate = [
  // Title update validation
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title 3-200 chars'),

  // Destination update validation
  body('destination')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Destination required'),

  // Start date update validation
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Valid start date required'),

  // End date update validation
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('Valid end date required')
    .custom((value, { req }) => {
      // Only compare if startDate is provided
      if (req.body.startDate && new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date')
      }
      return true
    }),

  // Description update validation
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description max 2000 chars'),

  // Budget update validation
  body('budget')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Budget must be positive'),

  // Travelers update validation
  body('travelers')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Travelers must be at least 1'),

  // Status update validation
  body('status')
    .optional()
    .isIn(Object.values(TRIP_STATUS))
    .withMessage(`Status: ${Object.values(TRIP_STATUS).join(', ')}`),

  // Final validation error handler
  handleValidationErrors,
]

/**
 * Export validators for use in trip routes
 */
module.exports = { validateTrip, validateTripUpdate }
>>>>>>> 0007615a5a7317e8689fc9727726ee86c5585786
