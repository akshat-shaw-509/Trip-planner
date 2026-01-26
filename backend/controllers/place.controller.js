<<<<<<< HEAD
const placeService = require('../services/place.service')

/**
 * Standard success response helper
 */
const sendSuccess = (res, statusCode, data = null, message = null, extra = {}) => {
  const response = { success: true }
  if (data) response.data = data
  if (message) response.message = message
  Object.assign(response, extra)
  res.status(statusCode).json(response)
}

/**
 * Standard error response helper
 */
const sendError = (res, statusCode, message) => {
  res.status(statusCode).json({ success: false, message })
}

/**
 * Create a new place in a trip
 * POST /api/trips/:tripId/places
 */
const createPlace = async (req, res, next) => {
  try {
    const place = await placeService.createPlace(
      req.params.tripId,
      req.body,
      req.user.id
    )

    sendSuccess(res, 201, place, 'Place created successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Get all places for a trip (supports filters)
 * GET /api/trips/:tripId/places
 */
const getPlacesByTrip = async (req, res, next) => {
  try {
    const filters = {
      category: req.query.category,
      visitStatus: req.query.visitStatus
    }

    const places = await placeService.getPlacesByTrip(
      req.params.tripId,
      req.user.id,
      filters
    )

    sendSuccess(res, 200, places, null, { count: places.length })
  } catch (error) {
    next(error)
  }
}

/**
 * Get a single place by ID
 * GET /api/places/:placeId
 */
const getPlaceById = async (req, res, next) => {
  try {
    const place = await placeService.getPlaceById(
      req.params.placeId,
      req.user.id
    )

    sendSuccess(res, 200, place)
  } catch (error) {
    next(error)
  }
}

/**
 * Update place details
 * PUT /api/places/:placeId
 */
const updatePlace = async (req, res, next) => {
  try {
    const place = await placeService.updatePlace(
      req.params.placeId,
      req.body,
      req.user.id
    )

    sendSuccess(res, 200, place, 'Place updated successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Delete a place from a trip
 * DELETE /api/places/:placeId
 */
const deletePlace = async (req, res, next) => {
  try {
    const result = await placeService.deletePlace(
      req.params.placeId,
      req.user.id
    )

    sendSuccess(res, 200, null, result.message)
  } catch (error) {
    next(error)
  }
}

/**
 * Toggle favorite status for a place
 * POST /api/places/:placeId/favorite
 */
const toggleFavorite = async (req, res, next) => {
  try {
    const place = await placeService.toggleFavorite(
      req.params.placeId,
      req.user.id
    )

    sendSuccess(res, 200, place, 'Favorite status updated')
  } catch (error) {
    next(error)
  }
}

/**
 * Update visit status (planned / visited / skipped)
 * PATCH /api/places/:placeId/visit-status
 */
const updateVisitStatus = async (req, res, next) => {
  try {
    const { visitStatus } = req.body
    if (!visitStatus) {
      return sendError(res, 400, 'Visit status required')
    }

    const place = await placeService.updateVisitStatus(
      req.params.placeId,
      visitStatus,
      req.user.id
    )

    sendSuccess(res, 200, place, 'Visit status updated successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Search nearby places based on trip center
 * GET /api/trips/:tripId/places/nearby
 */
const searchNearbyPlaces = async (req, res, next) => {
  try {
    const places = await placeService.searchNearby(
      req.params.tripId,
      req.query,
      req.user.id
    )

    sendSuccess(res, 200, places, null, { count: places.length })
  } catch (error) {
    next(error)
  }
}

/**
 * Get places grouped by category
 * GET /api/trips/:tripId/places/categories
 */
const getPlacesByCategory = async (req, res, next) => {
  try {
    const categories = await placeService.getByCategory(
      req.params.tripId,
      req.user.id
    )

    sendSuccess(res, 200, categories)
  } catch (error) {
    next(error)
  }
}

/**
 * Add AI-recommended place to a trip
 * POST /api/trips/:tripId/places/ai
 */
const addAIPlace = async (req, res, next) => {
  try {
    const place = await placeService.addAIPlaceToTrip(
      req.params.tripId,
      req.body,
      req.user.id
    )

    sendSuccess(res, 201, place, 'AI place added to trip')
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createPlace,
  addAIPlace,
  getPlacesByTrip,
  getPlaceById,
  updatePlace,
  deletePlace,
  toggleFavorite,
  updateVisitStatus,
  searchNearbyPlaces,
  getPlacesByCategory
}
=======
const placeService = require('../services/place.service')

/**
 * Standard success response helper
 */
const sendSuccess = (res, statusCode, data = null, message = null, extra = {}) => {
  const response = { success: true }
  if (data) response.data = data
  if (message) response.message = message
  Object.assign(response, extra)
  res.status(statusCode).json(response)
}

/**
 * Standard error response helper
 */
const sendError = (res, statusCode, message) => {
  res.status(statusCode).json({ success: false, message })
}

/**
 * Create a new place in a trip
 * POST /api/trips/:tripId/places
 */
const createPlace = async (req, res, next) => {
  try {
    const place = await placeService.createPlace(
      req.params.tripId,
      req.body,
      req.user.id
    )

    sendSuccess(res, 201, place, 'Place created successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Get all places for a trip (supports filters)
 * GET /api/trips/:tripId/places
 */
const getPlacesByTrip = async (req, res, next) => {
  try {
    const filters = {
      category: req.query.category,
      visitStatus: req.query.visitStatus
    }

    const places = await placeService.getPlacesByTrip(
      req.params.tripId,
      req.user.id,
      filters
    )

    sendSuccess(res, 200, places, null, { count: places.length })
  } catch (error) {
    next(error)
  }
}

/**
 * Get a single place by ID
 * GET /api/places/:placeId
 */
const getPlaceById = async (req, res, next) => {
  try {
    const place = await placeService.getPlaceById(
      req.params.placeId,
      req.user.id
    )

    sendSuccess(res, 200, place)
  } catch (error) {
    next(error)
  }
}

/**
 * Update place details
 * PUT /api/places/:placeId
 */
const updatePlace = async (req, res, next) => {
  try {
    const place = await placeService.updatePlace(
      req.params.placeId,
      req.body,
      req.user.id
    )

    sendSuccess(res, 200, place, 'Place updated successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Delete a place from a trip
 * DELETE /api/places/:placeId
 */
const deletePlace = async (req, res, next) => {
  try {
    const result = await placeService.deletePlace(
      req.params.placeId,
      req.user.id
    )

    sendSuccess(res, 200, null, result.message)
  } catch (error) {
    next(error)
  }
}

/**
 * Toggle favorite status for a place
 * POST /api/places/:placeId/favorite
 */
const toggleFavorite = async (req, res, next) => {
  try {
    const place = await placeService.toggleFavorite(
      req.params.placeId,
      req.user.id
    )

    sendSuccess(res, 200, place, 'Favorite status updated')
  } catch (error) {
    next(error)
  }
}

/**
 * Update visit status (planned / visited / skipped)
 * PATCH /api/places/:placeId/visit-status
 */
const updateVisitStatus = async (req, res, next) => {
  try {
    const { visitStatus } = req.body
    if (!visitStatus) {
      return sendError(res, 400, 'Visit status required')
    }

    const place = await placeService.updateVisitStatus(
      req.params.placeId,
      visitStatus,
      req.user.id
    )

    sendSuccess(res, 200, place, 'Visit status updated successfully')
  } catch (error) {
    next(error)
  }
}

/**
 * Search nearby places based on trip center
 * GET /api/trips/:tripId/places/nearby
 */
const searchNearbyPlaces = async (req, res, next) => {
  try {
    const places = await placeService.searchNearby(
      req.params.tripId,
      req.query,
      req.user.id
    )

    sendSuccess(res, 200, places, null, { count: places.length })
  } catch (error) {
    next(error)
  }
}

/**
 * Get places grouped by category
 * GET /api/trips/:tripId/places/categories
 */
const getPlacesByCategory = async (req, res, next) => {
  try {
    const categories = await placeService.getByCategory(
      req.params.tripId,
      req.user.id
    )

    sendSuccess(res, 200, categories)
  } catch (error) {
    next(error)
  }
}

/**
 * Add AI-recommended place to a trip
 * POST /api/trips/:tripId/places/ai
 */
const addAIPlace = async (req, res, next) => {
  try {
    const place = await placeService.addAIPlaceToTrip(
      req.params.tripId,
      req.body,
      req.user.id
    )

    sendSuccess(res, 201, place, 'AI place added to trip')
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createPlace,
  addAIPlace,
  getPlacesByTrip,
  getPlaceById,
  updatePlace,
  deletePlace,
  toggleFavorite,
  updateVisitStatus,
  searchNearbyPlaces,
  getPlacesByCategory
}
>>>>>>> 0007615a5a7317e8689fc9727726ee86c5585786
