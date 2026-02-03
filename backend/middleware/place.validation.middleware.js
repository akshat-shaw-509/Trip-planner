const { body, validationResult } = require('express-validator')

// Define constants locally
const PLACE_CATEGORIES = {
  ACCOMMODATION: 'accommodation',
  RESTAURANT: 'restaurant',
  ATTRACTION: 'attraction',
  TRANSPORT: 'transport',
  SHOPPING: 'shopping',
  ENTERTAINMENT: 'entertainment',
  OTHER: 'other'
}

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
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

// Place Validation
const validatePlace = [
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
    .withMessage(`Category must be one of: ${Object.values(PLACE_CATEGORIES).join(', ')}`),
  
  body('location.coordinates')
    .optional() 
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates must be [lng, lat]')
    .custom((value) => {
      if (!value || value.length !== 2) {
        throw new Error('Coordinates must be [lng, lat]')
      }
      const [lng, lat] = value
      if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
        throw new Error('Invalid coordinate range')
      }
      return true
    }),
  
  body('address')
    .if(body('location.coordinates').not().exists())
    .notEmpty()
    .withMessage('Either coordinates or address is required'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description max 2000 chars'),
  
  body('phone')
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
  
  body('priceLevel')
    .optional()
    .isInt({ min: 0, max: 5 })
    .withMessage('Price level must be 0-5'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Notes max 2000 chars'),
  
  body('visitDate')
    .optional()
    .isISO8601()
    .withMessage('Valid date required'),
  
  body('visitStatus')
    .optional()
    .isIn(['planned', 'visited', 'skipped'])
    .withMessage('Visit status must be: planned, visited, or skipped'),
  
  handleValidationErrors,
]

// Update Place Validation 
const validatePlaceUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Name max 200 chars'),
  
  body('category')
    .optional()
    .isIn(Object.values(PLACE_CATEGORIES))
    .withMessage(`Category must be one of: ${Object.values(PLACE_CATEGORIES).join(', ')}`),
  
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
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description max 2000 chars'),
  
  body('address')
    .optional()
    .trim(),
  
  body('phone')
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
  
  body('priceLevel')
    .optional()
    .isInt({ min: 0, max: 5 })
    .withMessage('Price level must be 0-5'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Notes max 2000 chars'),
  
  body('visitDate')
    .optional()
    .isISO8601()
    .withMessage('Valid date required'),
  
  body('visitStatus')
    .optional()
    .isIn(['planned', 'visited', 'skipped'])
    .withMessage('Visit status must be: planned, visited, or skipped'),
  
  handleValidationErrors,
]

module.exports = {
  validatePlace,
  validatePlaceUpdate
}
