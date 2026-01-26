let Place = require('../models/Place.model')
let Trip = require('../models/Trip.model')

// Custom error helpers
let { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/errors')

// Geocoding service (Mapbox / fallback)
let geocodingService = require('./mapbox.service')

/**
 * -------------------- Ownership Checks --------------------
 * Ensures the trip belongs to the requesting user
 */
let checkTripOwnership = async (tripId, userId) => {
  let trip = await Trip.findById(tripId).lean()

  if (!trip) {
    throw NotFoundError('Trip not found')
  }

  if (trip.userId.toString() !== userId.toString()) {
    throw ForbiddenError('Access denied')
  }

  return trip
}

/**
 * -------------------- Create Place --------------------
 * Adds a new place to a trip
 * Automatically geocodes address if coordinates are missing
 */
let createPlace = async (tripId, placeData, userId) => {
  await checkTripOwnership(tripId, userId)

  // If address is provided but coordinates are missing → geocode
  if (placeData.address && !placeData.location?.coordinates) {
    try {
      let geocoded = await geocodingService.geocodeAddress(placeData.address)
      if (geocoded.length > 0) {
        placeData.location = geocoded[0].coordinates
      }
    } catch (error) {
      console.warn('Geocoding failed:', error.message)
    }
  }

  return Place.create({
    ...placeData,
    tripId
  })
}

/**
 * -------------------- Get Places by Trip --------------------
 * Supports filtering by category and visit status
 */
let getPlacesByTrip = async (tripId, userId, filters = {}) => {
  await checkTripOwnership(tripId, userId)

  let query = { tripId }

  if (filters.category) {
    query.category = filters.category
  }

  if (filters.visitStatus) {
    query.visitStatus = filters.visitStatus
  }

  return Place.find(query)
    .sort('-createdAt')
    .lean()
}

/**
 * -------------------- Get Place by ID --------------------
 * Ensures user has access to the parent trip
 */
let getPlaceById = async (placeId, userId) => {
  let place = await Place.findById(placeId).populate('tripId').lean()

  if (!place) {
    throw NotFoundError('Place not found')
  }

  if (place.tripId.userId.toString() !== userId.toString()) {
    throw ForbiddenError('Access denied')
  }

  return place
}

/**
 * -------------------- Update Place --------------------
 * Re-geocodes if address changes
 */
let updatePlace = async (placeId, updateData, userId) => {
  let place = await Place.findById(placeId).populate('tripId')

  if (!place) {
    throw NotFoundError('Place not found')
  }

  if (place.tripId.userId.toString() !== userId.toString()) {
    throw ForbiddenError('Access denied')
  }

  // If address changed → attempt re-geocoding
  if (updateData.address && updateData.address !== place.address) {
    try {
      let geocoded = await geocodingService.geocodeAddress(updateData.address)
      if (geocoded.length > 0) {
        updateData.location = geocoded[0].coordinates
      }
    } catch (error) {
      console.warn('Geocoding failed:', error.message)
    }
  }

  Object.assign(place, updateData)
  await place.save()

  return place
}

/**
 * -------------------- Delete Place --------------------
 */
let deletePlace = async (placeId, userId) => {
  let place = await Place.findById(placeId).populate('tripId')

  if (!place) {
    throw NotFoundError('Place not found')
  }

  if (place.tripId.userId.toString() !== userId.toString()) {
    throw ForbiddenError('Access denied')
  }

  await place.deleteOne()
  return { message: 'Place deleted successfully' }
}

/**
 * -------------------- Toggle Favorite --------------------
 * Marks or unmarks a place as favorite
 */
let toggleFavorite = async (placeId, userId) => {
  let place = await Place.findById(placeId).populate('tripId')

  if (!place) {
    throw NotFoundError('Place not found')
  }

  if (place.tripId.userId.toString() !== userId.toString()) {
    throw ForbiddenError('Access denied')
  }

  place.isFavorite = !place.isFavorite
  await place.save()

  return place
}

/**
 * -------------------- Update Visit Status --------------------
 * Automatically sets visit date when marked as visited
 */
let updateVisitStatus = async (placeId, status, userId) => {
  let place = await Place.findById(placeId).populate('tripId')

  if (!place) {
    throw NotFoundError('Place not found')
  }

  if (place.tripId.userId.toString() !== userId.toString()) {
    throw ForbiddenError('Access denied')
  }

  place.visitStatus = status

  if (status === 'visited' && !place.visitDate) {
    place.visitDate = new Date()
  }

  await place.save()
  return place
}

/**
 * -------------------- Search Nearby Places --------------------
 * Uses MongoDB geospatial queries
 */
let searchNearby = async (tripId, query, userId) => {
  await checkTripOwnership(tripId, userId)

  let { longitude, latitude, maxDistance = 5000 } = query

  if (!longitude || !latitude) {
    throw BadRequestError('Coordinates required')
  }

  return Place.find({
    tripId,
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [
            parseFloat(longitude),
            parseFloat(latitude)
          ]
        },
        $maxDistance: parseInt(maxDistance)
      }
    }
  }).lean()
}

/**
 * -------------------- Group Places by Category --------------------
 */
let getByCategory = async (tripId, userId) => {
  await checkTripOwnership(tripId, userId)

  return Place.aggregate([
    { $match: { tripId } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        places: { $push: '$$ROOT' }
      }
    },
    { $sort: { count: -1 } }
  ])
}

/**
 * -------------------- Add AI Suggested Place --------------------
 * Saves AI-generated recommendations into the trip
 */
let addAIPlaceToTrip = async (tripId, aiPlace, userId) => {
  await checkTripOwnership(tripId, userId)

  return Place.create({
    tripId,
    name: aiPlace.name,
    category: aiPlace.category,
    address: aiPlace.address || '',
    location: aiPlace.location,
    rating: aiPlace.rating || 0,
    priceLevel: aiPlace.priceLevel || 0,
    description: aiPlace.description || '',
    source: 'ai',
    visitStatus: 'planned'
  })
}

/**
 * Export place services
 */
module.exports = {
  createPlace,
  addAIPlaceToTrip,
  getPlacesByTrip,
  getPlaceById,
  updatePlace,
  deletePlace,
  toggleFavorite,
  updateVisitStatus,
  searchNearby,
  getByCategory
}
