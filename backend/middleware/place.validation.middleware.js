let { body, validationResult } = require('express-validator')
let { PLACE_CATEGORIES } = require('../config/constants')

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

let optionalFields = [
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description max 2000 chars'),

  body('address', 'phone')
    .optional()
    .trim(),

  body('website')
    .optional()
    .trim()
    .isURL()
    .withMessage('Valid URL required'),

  body('rating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('Rating 0-5'),
]

let validatePlace = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name required')
    .isLength({ max: 200 })
    .withMessage('Name max 200 chars'),

  body('category')
    .notEmpty()
    .withMessage('Category required')
    .isIn(Object.values(PLACE_CATEGORIES))
    .withMessage(`Category: ${Object.values(PLACE_CATEGORIES).join(', ')}`),

  body('location.coordinates')
    .notEmpty()
    .withMessage('Coordinates required')
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates: [lng, lat]')
    .custom((value) => {
      const [lng, lat] = value;
      if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
        throw new Error('Invalid coordination range')
      }
      return true;
    }),

  ...optionalFields,

  handleValidationErrors,
]

const validatePlaceUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Name max 200 chars'),

  body('category')
    .optional()
    .isIn(Object.values(PLACE_CATEGORIES))
    .withMessage(`Category: ${Object.values(PLACE_CATEGORIES).join(', ')}`),

  body('location.coordinates')
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates: [lng, lat]')
    .custom((value) => {
      const [lng, lat] = value;
      if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
        throw new Error('Invalid coord range')
      }
      return true
    }),

  ...optionalFields,

  handleValidationErrors,
]

module.exports = { validatePlace, validatePlaceUpdate }