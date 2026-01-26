let Activity = require('../models/Activity.model')
let Trip = require('../models/Trip.model')

// Import custom error helpers
let { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/errors')

/**
 * -------------------- Helper Functions --------------------
 */

/**
 * Check whether the given user owns the trip
 * Prevents unauthorized access to trip-related resources
 */
let checkTripOwnership = async (tripId, userId) => {
  let trip = await Trip.findById(tripId).lean()

  if (!trip) {
    throw NotFoundError('Trip not found')
  }

  if (trip.userId.toString() !== userId.toString()) {
    throw ForbiddenError('You do not have permission to add activities to this trip')
  }

  return trip
}

/**
 * Validate that activity date lies within trip date range
 */
let validateActivityDate = async (tripId, startTime) => {
  if (!startTime) return

  let trip = await Trip.findById(tripId)
    .select('startDate endDate')
    .lean()

  let activityDate = new Date(startTime)
  let tripStart = new Date(trip.startDate)
  let tripEnd = new Date(trip.endDate)

  if (activityDate < tripStart || activityDate > tripEnd) {
    throw BadRequestError('Activity date must be within trip dates')
  }
}

/**
 * -------------------- Service Functions --------------------
 */

/**
 * Create a new activity under a trip
 */
let createActivity = async (tripId, activityData, userId) => {
  // Ensure user owns the trip
  await checkTripOwnership(tripId, userId)

  // Validate activity date
  await validateActivityDate(tripId, activityData.startTime)

  // Create activity
  let activity = await Activity.create({
    ...activityData,
    tripId,
    userId,
  })

  return activity
}

/**
 * Get all activities for a specific trip
 */
let getActivitiesByTrip = async (tripId, userId) => {
  // Ownership check
  await checkTripOwnership(tripId, userId)

  return Activity.find({
    tripId,
    isDeleted: false
  })
    .sort({ startTime: 1 })
    .populate('placeId')
    .lean()
}

/**
 * Update an existing activity
 */
let updateActivity = async (activityId, updateData, userId) => {
  // Fetch activity for ownership verification
  let activity = await Activity.findOne({
    _id: activityId,
    isDeleted: false
  }).lean()

  if (!activity) {
    throw NotFoundError('Activity not found')
  }

  if (activity.userId.toString() !== userId.toString()) {
    throw ForbiddenError('You do not have permission to update this activity')
  }

  // Validate updated date if provided
  await validateActivityDate(activity.tripId, updateData.startTime)

  // Apply update
  let updated = await Activity.findByIdAndUpdate(
    activityId,
    { $set: updateData },
    { new: true, runValidators: true }
  ).populate('placeId tripId')

  return updated
}

/**
 * Soft delete an activity
 */
let deleteActivity = async (activityId, userId) => {
  let activity = await Activity.findOneAndUpdate(
    { _id: activityId, isDeleted: false, userId },
    { isDeleted: true },
    { new: true }
  )

  if (!activity) {
    throw NotFoundError('Activity not found')
  }

  return { message: 'Activity deleted successfully' }
}

/**
 * Get activities for a specific date
 */
let getActivitiesByDate = async (tripId, date, userId) => {
  // Ownership check
  await checkTripOwnership(tripId, userId)

  // Build day range
  let startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)

  let endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  return Activity.find({
    tripId,
    isDeleted: false,
    startTime: { $gte: startOfDay, $lte: endOfDay }
  })
    .sort({ startTime: 1 })
    .populate('placeId')
    .lean()
}

/**
 * Update activity status
 */
let updateActivityStatus = async (activityId, status, userId) => {
  let activity = await Activity.findOneAndUpdate(
    { _id: activityId, isDeleted: false, userId },
    { status },
    { new: true, runValidators: true }
  ).populate('placeId')

  if (!activity) {
    throw NotFoundError('Activity not found')
  }

  return activity
}

/**
 * Get a single activity by ID
 */
let getActivityById = async (activityId, userId) => {
  let activity = await Activity.findOne({
    _id: activityId,
    isDeleted: false
  })
    .populate('placeId tripId')
    .lean()

  if (!activity) {
    throw NotFoundError('Activity not found')
  }

  // Authorization check
  if (activity.userId.toString() !== userId.toString()) {
    throw ForbiddenError('Not authorized for this activity')
  }

  return activity
}

/**
 * Export activity service functions
 */
module.exports = {
  createActivity,
  getActivitiesByTrip,
  getActivityById,
  updateActivity,
  deleteActivity,
  getActivitiesByDate,
  updateActivityStatus,
}
