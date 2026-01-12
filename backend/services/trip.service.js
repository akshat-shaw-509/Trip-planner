let Trip = require('../models/Trip.model')
let {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  BadRequestError
} = require('../utils/errors')

let createTrip = async (tripData, userId) => {
  let { title, destination, description, startDate, endDate, budget, travelers, tags, coverImage } = tripData

  if (!title || !destination || !startDate || !endDate) {
    throw ValidationError('Title, destination, start date and end date are required')
  }

  let start = new Date(startDate)
  let end = new Date(endDate)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw ValidationError('Invalid date format')
  }

  if (end < start) {
    throw ValidationError('End date must be after or equal to start date')
  }

  let trip = await Trip.create({
    title,
    destination,
    description: description || '',
    startDate: start,
    endDate: end,
    budget: budget || 0,
    travelers: travelers || 1,
    tags: tags || [],
    coverImage,
    userId
  })

  return trip
}

let getTripsByUser = async (userId, filters = {}) => {
  let { status, search, sortBy = '-createdAt', limit = 10, page = 1 } = filters
  let skip = (page - 1) * limit

  let query = { userId }

  if (status) {
    query.status = status
  }

  if (search) {
    let searchRegex = new RegExp(search, 'i')
    query.$or = [
      { title: searchRegex },
      { destination: searchRegex }
    ]
  }

  let [trips, total] = await Promise.all([
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

let getTripById = async (tripId, userId) => {
  if (!tripId) {
    throw ValidationError('Trip ID is required')
  }

  let trip = await Trip.findById(tripId)

  if (!trip) {
    throw NotFoundError('Trip not found')
  }

  if (trip.userId.toString() !== userId && !trip.isPublic) {
    throw ForbiddenError('You do not have access to this trip')
  }

  return trip
}

let updateTrip = async (tripId, updateData, userId) => {
  if (!tripId) {
    throw ValidationError('Trip ID is required')
  }

  let prohibitedFields = ['userId', '_id', 'createdAt', 'updatedAt']
  let hasProhibitedField = prohibitedFields.some(field => field in updateData)

  if (hasProhibitedField) {
    throw ValidationError('Cannot update system fields')
  }

  if (updateData.startDate || updateData.endDate) {
    let trip = await Trip.findById(tripId)

    if (!trip) {
      throw NotFoundError('Trip not found')
    }

    let startDate = updateData.startDate ? new Date(updateData.startDate) : trip.startDate
    let endDate = updateData.endDate ? new Date(updateData.endDate) : trip.endDate

    if (endDate < startDate) {
      throw ValidationError('End date must be after or equal to start date')
    }

    updateData.startDate = startDate
    updateData.endDate = endDate
  }

  let trip = await Trip.findOneAndUpdate(
    { _id: tripId, userId },
    updateData,
    {
      new: true,
      runValidators: true
    }
  )

  if (!trip) {
    throw NotFoundError('Trip not found or you do not have permission to update it')
  }

  return trip
}

let deleteTrip = async (tripId, userId) => {
  if (!tripId) {
    throw ValidationError('Trip ID is required')
  }

  let trip = await Trip.findOneAndDelete({ _id: tripId, userId })

  if (!trip) {
    throw NotFoundError('Trip not found or you do not have permission to delete it')
  }

  return { message: 'Trip deleted successfully' }
}

let getUpcomingTrips = async (userId) => {
  let now = new Date()
  let trips = await Trip.find({
    userId,
    startDate: { $gt: now },
    status: { $ne: 'cancelled' }
  }).sort('startDate')

  return trips
}

let getOngoingTrips = async (userId) => {
  let now = new Date()
  let trips = await Trip.find({
    userId,
    startDate: { $lte: now },
    endDate: { $gte: now },
    status: { $nin: ['cancelled', 'completed'] }
  }).sort('-startDate')

  return trips
}

let getPastTrips = async (userId, limit = 10) => {
  let now = new Date()
  let trips = await Trip.find({
    userId,
    $or: [
      { endDate: { $lt: now } },
      { status: 'completed' }
    ]
  })
    .sort('-endDate')
    .limit(limit)

  return trips
}

let updateTripStatus = async (tripId, status, userId) => {
  let validStatuses = ['planning', 'booked', 'ongoing', 'completed', 'cancelled']

  if (!validStatuses.includes(status)) {
    throw ValidationError(`Status must be one of: ${validStatuses.join(', ')}`)
  }

  let trip = await Trip.findOneAndUpdate(
    { _id: tripId, userId },
    { status },
    { new: true, runValidators: true }
  )

  if (!trip) {
    throw NotFoundError('Trip not found or you do not have permission to update it')
  }

  return trip
}

let addCollaborator = async (tripId, collaboratorData, userId) => {
  let trip = await Trip.findById(tripId)

  if (!trip) {
    throw NotFoundError('Trip not found')
  }

  if (trip.userId.toString() !== userId) {
    throw ForbiddenError('Only trip owner can add collaborators')
  }

  // This is a placeholder - you'd need to add collaborators field to Trip model
  return { message: 'Collaborator functionality requires Trip model update' }
}

let removeCollaborator = async (tripId, collaboratorId, userId) => {
  let trip = await Trip.findById(tripId)

  if (!trip) {
    throw NotFoundError('Trip not found')
  }

  if (trip.userId.toString() !== userId) {
    throw ForbiddenError('Only trip owner can remove collaborators')
  }

  // This is a placeholder - you'd need to add collaborators field to Trip model
  return { message: 'Collaborator functionality requires Trip model update' }
}

module.exports = {
  createTrip,
  getTripsByUser,
  getTripById,
  updateTrip,
  deleteTrip,
  getUpcomingTrips,
  getOngoingTrips,
  getPastTrips,
  updateTripStatus,
  addCollaborator,
  removeCollaborator
}