let { body, validationResult } = require('express-validator');
let { PLACE_CATEGORIES, PLACE_VISIT_STATUS } = require('../config/constants');

let sharedFields = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description max 2000 characters'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes max 1000 characters'),

  body('cost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Cost must be positive'),

  body('placeId')
    .optional()
    .isMongoId()
    .withMessage('Invalid place ID'),

  body('bookingReference', 'confirmationNumber')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Reference max 100 characters'),

  body('url')
    .optional()
    .trim()
    .isURL()
    .withMessage('Invalid URL')
]

let validateDateRange =(startField, endField)=> [
  body(startField)
    .notEmpty()
    .withMessage(`${startField} required`)
    .isISO8601()
    .withMessage('Valid ISO date required'),

  body(endField)
    .optional()
    .isISO8601()
    .withMessage('Valid ISO date required')
    .custom((value, { req }) => {
      if (value && req.body[startField]) {
        const start = new Date(req.body[startField]);
        const end = new Date(value);
        if (end <= start) {
          throw new Error(`${endField} must be after ${startField}`)
        }
      }
      return true;
    })
]

let validateActivity = [
  ...sharedFields,
  
  body('category')
    .notEmpty()
    .withMessage('Category required')
    .isIn(Object.values(PLACE_CATEGORIES))
    .withMessage(`Category must be: ${Object.values(PLACE_CATEGORIES).join(', ')}`),

  ...validateDateRange('startTime', 'endTime'),

  body('visitStatus')
    .optional()
    .isIn(Object.values(PLACE_VISIT_STATUS))
    .withMessage(`Status: ${Object.values(PLACE_VISIT_STATUS).join(', ')}`),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(({ path, msg }) => ({ field: path, message: msg }))
      })
    }
    next()
  }
]

const validateActivityUpdate = [
  ...sharedFields,

  ...validateDateRange('startTime', 'endTime').map(field => 
    field.optional({ nullable: true })
  ),

  body('category')
    .optional()
    .isIn(Object.values(PLACE_CATEGORIES))
    .withMessage(`Category: ${Object.values(PLACE_CATEGORIES).join(', ')}`),

  body('visitStatus')
    .optional()
    .isIn(Object.values(PLACE_VISIT_STATUS))
    .withMessage(`Status: ${Object.values(PLACE_VISIT_STATUS).join(', ')}`),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(({ path, msg }) => ({ field: path, message: msg }))
      })
    }
    next()
  }
]

module.exports = { validateActivity, validateActivityUpdate }
