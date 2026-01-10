let { body, validationResult } = require('express-validator');
let { TRIP_STATUS } = require('../config/constants');

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

let validateDateRange = () => [
  body('startDate')
    .notEmpty()
    .withMessage('Start date required')
    .isISO8601()
    .withMessage('Valid start date required'),

  body('endDate')
    .notEmpty()
    .withMessage('End date required')
    .isISO8601()
    .withMessage('Valid end date required')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date')
      }
      return true
    })
]

let validateTrip = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title 3-200 chars'),

  body('destination')
    .trim()
    .notEmpty()
    .withMessage('Destination required'),

  ...validateDateRange(),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description max 2000 chars'),

  body('budget')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Budget must be positive'),

  body('status')
    .optional()
    .isIn(Object.values(TRIP_STATUS))
    .withMessage(`Status: ${Object.values(TRIP_STATUS).join(', ')}`),

  handleValidationErrors,
]

let validateTripUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title 3-200 chars'),

  body('destination')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Destination required'),

  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Valid start date required'),

  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('Valid end date required')
    .custom((value, { req }) => {
      if (req.body.startDate && new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date')
      }
      return true;
    }),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description max 2000 chars'),

  body('budget')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Budget must be positive'),

  body('status')
    .optional()
    .isIn(Object.values(TRIP_STATUS))
    .withMessage(`Status: ${Object.values(TRIP_STATUS).join(', ')}`),

  handleValidationErrors,
]

module.exports = { validateTrip, validateTripUpdate };