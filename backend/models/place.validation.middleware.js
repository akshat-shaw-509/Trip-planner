
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
  body('address', 'phone')
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
]

/**
 * -------------------- Create Place Validation --------------------
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
    .withMessage(`Category: ${Object.values(PLACE_CATEGORIES).join(', ')}`),

  // GeoJSON-style coordinates validation
  // Format: [longitude, latitude]
  body('location.coordinates')
    .notEmpty()
    .withMessage('Coordinates required')
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates: [lng, lat]')
    .custom((value) => {
      const [lng, lat] = value

      // Validate longitude & latitude range
      if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
        throw new Error('Invalid coordination range')
      }

      return true
    }),

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
    .withMessage(`Category: ${Object.values(PLACE_CATEGORIES).join(', ')}`),

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
