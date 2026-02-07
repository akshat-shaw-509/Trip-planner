const Trip = require('../models/Trip.model')

const {
  NotFoundError,
  ValidationError,
  ForbiddenError
} = require('../utils/errors')

// -------------------- Constants --------------------
const TRIP_STATUSES = [
  'planning',
  'booked',
  'ongoing',
  'completed',
  'cancelled'
]

/**
 * -------------------- Create Trip --------------------
 */
const createTrip = async (tripData, userId) => {
  const {
    title,
    destination,
    description,
    startDate,
    endDate,
    budget,
    travelers,
    tags,
    coverImage
  } = tripData

  if (!title || !destination || !startDate || !endDate) {
    throw new ValidationError(
      'Title, destination, start date and end date are required'
    )
  }

  const start = new Date(startDate)
  const end = new Date(endDate)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new ValidationError('Invalid date format')
  }

  if (end < start) {
    throw new ValidationError('End date must be after or equal to start date')
  }

  return Trip.create({
    title,
    destination,
    description: description || '',
    startDate: start,
    endDate: end,
    budget: budget || 0,
    travelers: travelers || 1,
    tags: tags || [],
    coverImage,
    userId: userId.toString()
  })
}

/**
 * -------------------- Get Trips By User
 * Pagination + Sorting + Search (kept)
 * --------------------
 */
const getTripsByUser = async (userId, filters = {}) => {
  const {
    status,
    search,
    sortBy = '-createdAt',
    limit = 10,
    page = 1
  } = filters

  const skip = (page - 1) * limit
  const query = { userId: userId.toString() }

  if (status) {
    query.status = status
  }

  if (search) {
    const regex = new RegExp(search, 'i')
    query.$or = [{ title: regex }, { destination: regex }]
  }

  const [trips, total] = await Promise.all([
    Trip.find(query)
      .sort(sortBy)
      .skip(skip)
      .limit(parseInt(limit)),
    Trip.countDocuments(query)
  ])

  return {
    trips,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      limit: parseInt(limit)
    }
  }
}

/**
 * -------------------- Get Trip By ID (OWNER ONLY)
 * --------------------
 */
const getTripById = async (tripId, userId) => {
  if (!tripId) {
    throw new ValidationError('Trip ID is required')
  }

  const trip = await Trip.findById(tripId)
  if (!trip) throw new NotFoundError('Trip not found')

  if (trip.userId.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have access to this trip')
  }

  return trip
}

/**
 * -------------------- Update Trip
 * --------------------
 */
/**
 * -------------------- Update Trip Status
 * --------------------
 */
const updateTripStatus = async (tripId, status, userId) => {
  if (!TRIP_STATUSES.includes(status)) {
    throw new ValidationError(
      `Status must be one of: ${TRIP_STATUSES.join(', ')}`
    )
  }

  const trip = await Trip.findOneAndUpdate(
    { _id: tripId, userId: userId.toString() },
    { status },
    { new: true }
  )

  if (!trip) {
    throw new NotFoundError('Trip not found or access denied')
  }

  return trip
}

/**
 * -------------------- Remove Trip Banner
 * --------------------
 */
const removeBanner = async (tripId, userId) => {
  if (!tripId) {
    throw new ValidationError('Trip ID is required')
  }

  const trip = await Trip.findOneAndUpdate(
    { _id: tripId, userId: userId.toString() },
    { coverImage: null },
    { new: true }
  )

  if (!trip) {
    throw new NotFoundError('Trip not found or access denied')
  }

  return trip
}

/**
 * -------------------- Delete Trip
 * --------------------
 */
const deleteTrip = async (tripId, userId) => {
  const trip = await Trip.findOneAndDelete({
    _id: tripId,
    userId: userId.toString()
  })

  if (!trip) {
    throw new NotFoundError('Trip not found or access denied')
  }

  return { message: 'Trip deleted successfully' }
}

module.exports = {
  createTrip,
  getTripsByUser,
  getTripById,
  deleteTrip,
  updateTripStatus,
  removeBanner
}
