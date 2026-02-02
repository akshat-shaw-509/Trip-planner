let Place = require('../models/Place.model')
let Trip = require('../models/Trip.model')

let { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/errors')

/**
 * -------------------- Ownership Checks --------------------
 */
let checkTripOwnership = async (tripId, userId) => {
  let trip = await Trip.findById(tripId).lean()

  if (!trip) throw NotFoundError('Trip not found')
  if (trip.userId.toString() !== userId.toString()) {
    throw ForbiddenError('Access denied')
  }

  return trip
}

/**
 * -------------------- Create Place --------------------
 * Coordinates must already be provided (Geoapify / AI)
 */
let createPlace = async (tripId, placeData, userId) => {
  await checkTripOwnership(tripId, userId)

  return Place.create({
    ...placeData,
    tripId
  })
}

/**
 * -------------------- Get Places by Trip --------------------
 */
let getPlacesByTrip = async (tripId, userId, filters = {}) => {
  await checkTripOwnership(tripId, userId)

  let query = { tripId }

  if (filters.category) query.category = filters.category
  if (filters.visitStatus) query.visitStatus = filters.visitStatus

  return Place.find(query)
    .sort('-createdAt')
    .lean()
}

/**
 * -------------------- Get Place by ID --------------------
 */
let getPlaceById = async (placeId, userId) => {
  let place = await Place.findById(placeId).populate('tripId').lean()

  if (!place) throw NotFoundError('Place not found')
  if (place.tripId.userId.toString() !== userId.toString()) {
    throw ForbiddenError('Access denied')
  }

  return place
}

/**
 * -------------------- Update Place --------------------
 */
let updatePlace = async (placeId, updateData, userId) => {
  let place = await Place.findById(placeId).populate('tripId')

  if (!place) throw NotFoundError('Place not found')
  if (place.tripId.userId.toString() !== userId.toString()) {
    throw ForbiddenError('Access denied')
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

  if (!place) throw NotFoundError('Place not found')
  if (place.tripId.userId.toString() !== userId.toString()) {
    throw ForbiddenError('Access denied')
  }

  await place.deleteOne()
  return { message: 'Place deleted successfully' }
}

/**
 * -------------------- Toggle Favorite --------------------
 */
let toggleFavorite = async (placeId, userId) => {
  let place = await Place.findById(placeId).populate('tripId')

  if (!place) throw NotFoundError('Place not found')
  if (place.tripId.userId.toString() !== userId.toString()) {
    throw ForbiddenError('Access denied')
  }

  place.isFavorite = !place.isFavorite
  await place.save()

  return place
}

/**
 * -------------------- Update Visit Status --------------------
 * Auto-sets visitDate when visited
 */
let updateVisitStatus = async (placeId, status, userId) => {
  let place = await Place.findById(placeId).populate('tripId')

  if (!place) throw NotFoundError('Place not found')
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
 * Planned feature – MongoDB geospatial query
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
 * -------------------- Group Places by Category (LEAN) --------------------
 * Count only (no $$ROOT push)
 */
let getByCategory = async (tripId, userId) => {
  await checkTripOwnership(tripId, userId)

  return Place.aggregate([
    { $match: { tripId } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ])
}

/**
 * -------------------- Add AI Suggested Place --------------------
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
