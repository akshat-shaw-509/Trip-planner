let Place = require('../models/Place.model')
let Trip = require('../models/Trip.model')
let { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/errors')
let geocodingService = require('./mapbox.service')

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

let createPlace = async (tripId, placeData, userId) => {
  await checkTripOwnership(tripId, userId)
  
  // If address provided but no coordinates, geocode it
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

let updatePlace = async (placeId, updateData, userId) => {
  let place = await Place.findById(placeId).populate('tripId')
  
  if (!place) {
    throw NotFoundError('Place not found')
  }
  
  if (place.tripId.userId.toString() !== userId.toString()) {
    throw ForbiddenError('Access denied')
  }
  
  // If address changed, try to geocode
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
          coordinates: [parseFloat(longitude), parseFloat(latitude)]
        },
        $maxDistance: parseInt(maxDistance)
      }
    }
  }).lean()
}

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

let addAIPlaceToTrip = async (tripId, aiPlace, userId) => {
  await checkTripOwnership(tripId, userId);

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
  });
};



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