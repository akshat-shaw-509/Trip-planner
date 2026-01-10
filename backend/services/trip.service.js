let Trip = require('../models/Trip.model')

let {
createNotFoundError,
createValidationError,
createAuthorizationError,
createDatabaseError
} = require('../utils/errors')

let createTrip = async (tripData, userId) => {
let { title, destination, description, startDate, endDate, budget, travelers, tags, coverImage } = tripData

if (!title || !destination || !startDate || !endDate) {
    throw createValidationError('Title, destination, start date and end date are required')
}

let start = new Date(startDate)
let end = new Date(endDate)

if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw createValidationError('Invalid date format')
}

if (end < start) {
    throw createValidationError('End date must be after or equal to start date')
}

try {
    console.log('Creating trip with userId:', userId)
    
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

    console.log('Trip created successfully:', trip._id)
    return trip
} catch (error) {
    console.error('Trip creation failed:', error.message)
    throw error
}
}

let getUserTrips = async (userId, filters = {}) => {
let { status, search, limit = 10, page = 1 } = filters
let skip = (page - 1) * limit

try {
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
            .sort('-createdAt')
            .skip(skip)
            .limit(parseInt(limit)),
        Trip.countDocuments(query)
    ])

    return {
        trips,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
    }
} catch (error) {
    throw createDatabaseError('Failed to fetch trips')
}
}

let getTripById = async (tripId, userId) => {
if (!tripId) {
throw createValidationError('Trip ID is required')
}

try {
    let trip = await Trip.findById(tripId)

    if (!trip) {
        throw createNotFoundError('Trip not found')
    }

    if (trip.userId.toString() !== userId && !trip.isPublic) {
        throw createAuthorizationError('You do not have access to this trip')
    }

    return trip
} catch (error) {
    if (error.isOperational) {
        throw error
    }
    throw createDatabaseError('Failed to fetch trip')
}
}

let updateTrip = async (tripId, updateData,userId) => {
if (!tripId) {
throw createValidationError('Trip ID is required')
}
let prohibitedFields = ['userId', '_id', 'createdAt', 'updatedAt']
let hasProhibitedField = prohibitedFields.some(field => field in updateData)

if (hasProhibitedField) {
    throw createValidationError('Cannot update system fields')
}

if (updateData.startDate || updateData.endDate) {
    let trip = await Trip.findById(tripId)

    if (!trip) {
        throw createNotFoundError('Trip not found')
    }

    let startDate = updateData.startDate ? new Date(updateData.startDate) : trip.startDate
    let endDate = updateData.endDate ? new Date(updateData.endDate) : trip.endDate

    if (endDate < startDate) {
        throw createValidationError('End date must be after or equal to start date')
    }

    updateData.startDate = startDate
    updateData.endDate = endDate
}

try {
    let trip = await Trip.findOneAndUpdate(
        { _id: tripId, userId },
        updateData,
        {
            new: true,
            runValidators: true
        }
    )

    if (!trip) {
        throw createNotFoundError('Trip not found or you do not have permission to update it')
    }

    return trip
} catch (error) {
    if (error.isOperational) {
        throw error
    }
    throw createDatabaseError('Failed to update trip')
}
}

let deleteTrip = async (tripId, userId) => {
if (!tripId) {
throw createValidationError('Trip ID is required')
}

try {
    let trip = await Trip.findOneAndDelete({ _id: tripId, userId })

    if (!trip) {
        throw createNotFoundError('Trip not found or you do not have permission to delete it')
    }

    return trip
} catch (error) {
    if (error.isOperational) {
        throw error
    }
    throw createDatabaseError('Failed to delete trip')
}
}

let getUpcomingTrips = async (userId) => {
try {
let trips = await Trip.findUpcomingByUserId(userId)
return trips
} catch (error) {
throw createDatabaseError('Failed to fetch upcoming trips')
}
}

let getActiveTrips = async (userId) => {
try {
let trips = await Trip.findActiveByUserId(userId)
return trips
} catch (error) {
throw createDatabaseError('Failed to fetch active trips')
}
}

let updateTripStatus = async (tripId, status,userId) => {
let validStatuses = ['planning', 'booked', 'ongoing', 'completed', 'cancelled']

if (!validStatuses.includes(status)) {
    throw createValidationError(`Status must be one of: ${validStatuses.join(', ')}`)
}

try {
    let trip = await Trip.findOneAndUpdate(
        { _id: tripId, userId },
        { status },
        { new: true, runValidators: true }
    )

    if (!trip) {
        throw createNotFoundError('Trip not found or you do not have permission to update it')
    }

    return trip
} catch (error) {
    if (error.isOperational) {
        throw error
    }
    throw createDatabaseError('Failed to update trip status')
}
}

let userOwnsTrip = async (tripId, userId) => {
try {
let trip = await Trip.findOne({ _id: tripId, userId })
return !!trip
} catch (error) {
return false
}
}

let getTripStatistics = async (userId) => {
try {
let [total, upcoming, active, completed, cancelled] = await Promise.all([
Trip.countDocuments({ userId }),
Trip.countDocuments({ userId, startDate: { $gt: new Date() }, status: { $ne: 'cancelled' } }),
Trip.countDocuments({ userId, status: 'ongoing' }),
Trip.countDocuments({ userId, status: 'completed' }),
Trip.countDocuments({ userId, status: 'cancelled' })
])
    return {
        total,
        upcoming,
        active,
        completed,
        cancelled,
        planning: total - upcoming - active - completed - cancelled
    }
} catch (error) {
    throw createDatabaseError('Failed to fetch trip statistics')
}
}

module.exports = {
createTrip,
getUserTrips,
getTripById,
updateTrip,
deleteTrip,
getUpcomingTrips,
getActiveTrips,
updateTripStatus,
userOwnsTrip,
getTripStatistics
}