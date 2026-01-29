let { body, validationResult } = require('express-validator')

// Import allowed place categories from constants
let { PLACE_CATEGORIES } = require('../config/constants')

/**
 * -------------------- Common Error Handler --------------------
 * Handles validation errors in a single place
 * Keeps response format consistent
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
 * -------------------- Optional Fields --------------------
 * These fields are optional and validated only if present
 */
let optionalFields = [
  // Optional description of the place
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description max 2000 chars'),

  // Optional address and phone fields
  body('address')
    .optional()
    .trim(),

  body('phone')
    .optional()
    .trim(),

  // Optional website URL
  body('website')
    .optional()
    .trim()
    .isURL()
    .withMessage('Valid URL required'),

  // Optional rating (0–5 scale)
  body('rating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('Rating 0-5'),

  // ✅ ADDED: Optional price level (0-5 scale)
  body('priceLevel')
    .optional()
    .isInt({ min: 0, max: 5 })
    .withMessage('Price level must be 0-5'),

  // ✅ ADDED: Optional notes
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Notes max 2000 chars'),

  // ✅ ADDED: Optional visit date
  body('visitDate')
    .optional()
    .isISO8601()
    .withMessage('Valid date required'),

  // ✅ ADDED: Optional visit status
  body('visitStatus')
    .optional()
    .isIn(['planned', 'visited', 'skipped'])
    .withMessage('Visit status must be: planned, visited, or skipped'),
]

/**
 * -------------------- Create Place Validation --------------------
 * ✅ CHANGED: Coordinates are now OPTIONAL (will be geocoded if missing)
 */
let validatePlace = [
  // Place name validation
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name required')
    .isLength({ max: 200 })
    .withMessage('Name max 200 chars'),

  // Category validation using predefined constants
  body('category')
    .notEmpty()
    .withMessage('Category required')
    .isIn(Object.values(PLACE_CATEGORIES))
    .withMessage(`Category must be one of: ${Object.values(PLACE_CATEGORIES).join(', ')}`),

  // ✅ CHANGED: Coordinates are now OPTIONAL
  // If provided, they must be in correct format [longitude, latitude]
  body('location.coordinates')
    .optional() // ✅ CHANGED FROM .notEmpty() to .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates must be [lng, lat]')
    .custom((value) => {
      if (!value || value.length !== 2) {
        throw new Error('Coordinates must be [lng, lat]')
      }
      const [lng, lat] = value
      // Validate longitude & latitude range
      if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
        throw new Error('Invalid coordinate range')
      }
      return true
    }),

  // ✅ ADDED: If coordinates not provided, address should be provided for geocoding
  body('address')
    .if(body('location.coordinates').not().exists())
    .notEmpty()
    .withMessage('Either coordinates or address is required'),

  // Attach optional field validators
  ...optionalFields,

  // Final validation error handler
  handleValidationErrors,
]

/**
 * -------------------- Update Place Validation --------------------
 * All fields are optional since this is a partial update
 */
const validatePlaceUpdate = [
  // Name update validation
  body('name')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Name max 200 chars'),

  // Category update validation
  body('category')
    .optional()
    .isIn(Object.values(PLACE_CATEGORIES))
    .withMessage(`Category must be one of: ${Object.values(PLACE_CATEGORIES).join(', ')}`),

  // Coordinates update validation
  body('location.coordinates')
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates: [lng, lat]')
    .custom((value) => {
      const [lng, lat] = value
      if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
        throw new Error('Invalid coord range')
      }
      return true
    }),

  // Attach optional field validators
  ...optionalFields,

  // Final validation error handler
  handleValidationErrors,
]

module.exports = {
  validatePlace,
  validatePlaceUpdate
}
