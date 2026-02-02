let Activity = require('../models/Activity.model')
let Trip = require('../models/Trip.model')
let { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/errors')

/**
 * Check if the trip exists and belongs to the user
 */
let checkTripOwnership = async (tripId, userId) => {
  let trip = await Trip.findById(tripId).lean()

  if (!trip) {
    throw NotFoundError('Trip not found')
  }

  if (trip.userId.toString() !== userId.toString()) {
    throw ForbiddenError('You do not have permission to access this trip')
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

  if (!trip) {
    throw NotFoundError('Trip not found')
  }

  let activityDate = new Date(startTime)
  let tripStart = new Date(trip.startDate)
  let tripEnd = new Date(trip.endDate)

  if (activityDate < tripStart || activityDate > tripEnd) {
    throw BadRequestError('Activity date must be within trip dates')
  }
}

/**
 * Create a new activity under a trip
 */
let createActivity = async (tripId, activityData, userId) => {
  await checkTripOwnership(tripId, userId)
  await validateActivityDate(tripId, activityData.startTime)

  return Activity.create({
    ...activityData,
    tripId,
    userId
  })
}

/**
 * Get all activities for a specific trip
 */
let getActivitiesByTrip = async (tripId, userId) => {
  await checkTripOwnership(tripId, userId)

  return Activity.find({ tripId })
    .sort({ startTime: 1 })
    .populate('placeId')
    .lean()
}

/**
 * Update an existing activity
 */
let updateActivity = async (activityId, updateData, userId) => {
  let activity = await Activity.findById(activityId).lean()
  if (!activity) {
    throw NotFoundError('Activity not found')
  }
  if (activity.userId.toString() !== userId.toString()) {
    throw ForbiddenError('You do not have permission to update this activity')
  }
  await validateActivityDate(activity.tripId, updateData.startTime)

  return Activity.findByIdAndUpdate(
    activityId,
    { $set: updateData },
    { new: true, runValidators: true }
  ).populate('placeId tripId')
}

/**
 * Delete an activity (hard delete)
 */
let deleteActivity = async (activityId, userId) => {
  let activity = await Activity.findById(activityId)

  if (!activity) {
    throw NotFoundError('Activity not found')
  }

  if (activity.userId.toString() !== userId.toString()) {
    throw ForbiddenError('You do not have permission to delete this activity')
  }

  await Activity.deleteOne({ _id: activityId })

  return { message: 'Activity deleted successfully' }
}

/**
 * Get a single activity by ID
 */
let getActivityById = async (activityId, userId) => {
  let activity = await Activity.findById(activityId)
    .populate('placeId tripId')
    .lean()

  if (!activity) {
    throw NotFoundError('Activity not found')
  }

  if (activity.userId.toString() !== userId.toString()) {
    throw ForbiddenError('Not authorized for this activity')
  }

  return activity
}

module.exports = {
  createActivity,
  getActivitiesByTrip,
  getActivityById,
  updateActivity,
  deleteActivity
}

