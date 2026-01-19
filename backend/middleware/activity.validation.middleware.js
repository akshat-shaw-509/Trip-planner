let { body, validationResult } = require('express-validator');

// Activity types from the model
const ACTIVITY_TYPES = [
  'flight',
  'accommodation',
  'restaurant',
  'attraction',
  'transport',
  'shopping',
  'entertainment',
  'other',
];

const ACTIVITY_STATUS = ['planned', 'confirmed', 'completed', 'cancelled'];
const PRIORITY_LEVELS = ['low', 'medium', 'high'];

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

  body('currency')
    .optional()
    .trim()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be 3 characters (e.g., USD)'),

  body('placeId')
    .optional()
    .isMongoId()
    .withMessage('Invalid place ID'),

  body('location')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Location max 500 characters'),

  body('bookingReference')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Booking reference max 100 characters'),

  body('confirmationNumber')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Confirmation number max 100 characters'),

  body('url')
    .optional()
    .trim()
    .isURL()
    .withMessage('Invalid URL'),

  body('priority')
    .optional()
    .isIn(PRIORITY_LEVELS)
    .withMessage(`Priority must be: ${PRIORITY_LEVELS.join(', ')}`)
];

let validateDateRange = (startField, endField) => [
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
          throw new Error(`${endField} must be after ${startField}`);
        }
      }
      return true;
    })
];

let validateActivity = [
  ...sharedFields,
  
  body('type')
    .notEmpty()
    .withMessage('Type required')
    .isIn(ACTIVITY_TYPES)
    .withMessage(`Type must be: ${ACTIVITY_TYPES.join(', ')}`),

  ...validateDateRange('startTime', 'endTime'),

  body('status')
    .optional()
    .isIn(ACTIVITY_STATUS)
    .withMessage(`Status must be: ${ACTIVITY_STATUS.join(', ')}`),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(({ path, msg }) => ({ field: path, message: msg }))
      });
    }
    next();
  }
];

const validateActivityUpdate = [
  ...sharedFields.map(field => 
    field.optional({ nullable: true })
  ),

  ...validateDateRange('startTime', 'endTime').map(field => 
    field.optional({ nullable: true })
  ),

  body('type')
    .optional()
    .isIn(ACTIVITY_TYPES)
    .withMessage(`Type must be: ${ACTIVITY_TYPES.join(', ')}`),

  body('status')
    .optional()
    .isIn(ACTIVITY_STATUS)
    .withMessage(`Status must be: ${ACTIVITY_STATUS.join(', ')}`),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(({ path, msg }) => ({ field: path, message: msg }))
      });
    }
    next();
  }
];

module.exports = { validateActivity, validateActivityUpdate };