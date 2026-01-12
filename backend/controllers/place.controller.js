let placeService = require('../services/place.service')

let sendSuccess = (res, statusCode, data = null, message = null, extra = {}) => {
  let response = { success: true }
  if (data) response.data = data
  if (message) response.message = message
  Object.assign(response, extra)
  res.status(statusCode).json(response)
}

let sendError = (res, statusCode, message) => {
  res.status(statusCode).json({ success: false, message })
}

let createPlace = async (req, res, next) => {
  try {
    let place = await placeService.createPlace(req.params.tripId, req.body, req.user.id)
    sendSuccess(res, 201, place, 'Place created successfully')
  } catch (error) {
    next(error)
  }
}

let getPlacesByTrip = async (req, res, next) => {
  try {
    let filters = {
      category: req.query.category,
      visitStatus: req.query.visitStatus
    }
    let places = await placeService.getPlacesByTrip(req.params.tripId, req.user.id, filters)
    sendSuccess(res, 200, places, null, { count: places.length })
  } catch (error) {
    next(error)
  }
}

let getPlaceById = async (req, res, next) => {
  try {
    let place = await placeService.getPlaceById(req.params.placeId, req.user.id)
    sendSuccess(res, 200, place)
  } catch (error) {
    next(error)
  }
}

let updatePlace = async (req, res, next) => {
  try {
    let place = await placeService.updatePlace(req.params.placeId, req.body, req.user.id)
    sendSuccess(res, 200, place, 'Place updated successfully')
  } catch (error) {
    next(error)
  }
}

let deletePlace = async (req, res, next) => {
  try {
    let result = await placeService.deletePlace(req.params.placeId, req.user.id)
    sendSuccess(res, 200, null, result.message)
  } catch (error) {
    next(error)
  }
}

let toggleFavorite = async (req, res, next) => {
  try {
    let place = await placeService.toggleFavorite(req.params.placeId, req.user.id)
    sendSuccess(res, 200, place, 'Favorite status updated')
  } catch (error) {
    next(error)
  }
}

let updateVisitStatus = async (req, res, next) => {
  try {
    const { visitStatus } = req.body;
    if (!visitStatus) {
      return sendError(res, 400, 'Visit status required')
    }
    let place = await placeService.updateVisitStatus(req.params.placeId,visitStatus, req.user.id)
    sendSuccess(res, 200, place, 'Visit status updated successfully')
  } catch (error) {
    next(error)
  }
}

let searchNearbyPlaces = async (req, res, next) => {
  try {
    let places = await placeService.searchNearby(req.params.tripId, req.query, req.user.id)
    sendSuccess(res, 200, places, null, { count: places.length })
  } catch (error) {
    next(error)
  }
}

let getPlacesByCategory = async (req, res, next) => {
  try {
    let categories = await placeService.getByCategory(req.params.tripId, req.user.id)
    sendSuccess(res, 200, categories)
  } catch (error) {
    next(error)
  }
}

module.exports = {
  createPlace,
  getPlacesByTrip,
  getPlaceById,
  updatePlace,
  deletePlace,
  toggleFavorite,
  updateVisitStatus,
  searchNearbyPlaces,
  getPlacesByCategory
}