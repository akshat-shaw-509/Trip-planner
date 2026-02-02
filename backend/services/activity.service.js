let Activity = require('../models/Activity.model')
let Trip = require('../models/Trip.model')
let { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/errors')

//Check if the trip exists and belongs to the user
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

//Validate that activity date lies within trip date range
let validateActivityDate = async (tripId, startTime) => {
  if (!startTime) return
  let trip = await Trip.findById(tripId)
    .select('startDate endDate')
    .lean()
  let activityDate = new Date(startTime)
  let tripStart = new Date(trip.startDate)
  let tripEnd = new Date(trip.endDate)
  if (isNaN(activityDate.getTime())) throw BadRequestError('Invalid activity startTime')
  if (activityDate < tripStart || activityDate > tripEnd) {
    throw BadRequestError('Activity date must be within trip dates')
  }
}

// Create a new activity under a trip
let createActivity = async (tripId, activityData, userId) => {
  // Ensure user owns the trip
 const trip = await checkTripOwnership(tripId, userId)
  // Validate activity date
  await validateActivityDate(tripId, activityData.startTime)
  // Create activity
  const payload = {
    ...activityData,
    tripId,
    userId
  }
   const activity = await Activity.create(payload)
  return activity
}

//Get all activities for a specific trip
const getActivitiesByTrip = async (tripId, userId, options = {}) => {
  await checkTripOwnership(tripId, userId)
  const { sort = { startTime: 1 }, limit = 0 } = options
  return Activity.find({ tripId })
    .sort(sort)
    .limit(limit || undefined)
    .populate('placeId')
    .lean()
}
//Update an existing activity
const updateActivity = async (activityId, updateData, userId) => {
  // fetch the activity to check ownership & trip context
  let activity = await Activity.findById(activityId)
  if (!activity) throw NotFoundError('Activity not found')
  if (activity.userId.toString() !== userId.toString()) {
    throw ForbiddenError('You do not have permission to update this activity')
  }

  // Prevent changing protected/system fields
  const prohibited = ['_id', 'userId', 'tripId', 'createdAt', 'updatedAt']
  for (const p of prohibited) {
    if (p in updateData) delete updateData[p]
  }

  // if startTime provided, validate against trip dates
  if (updateData.startTime) {
    const trip = await Trip.findById(activity.tripId).lean()
    validateActivityDate(trip, updateData.startTime)
  }

  const updated = await Activity.findByIdAndUpdate(
    activityId,
    { $set: updateData },
    { new: true, runValidators: true }
  ).populate('placeId tripId')

  return updated
}
// Delete an activity
const deleteActivity = async (activityId, userId) => {
  const activity = await Activity.findById(activityId)
  if (!activity) throw NotFoundError('Activity not found')
  if (activity.userId.toString() !== userId.toString()) {
    throw ForbiddenError('You do not have permission to delete this activity')
  }

  await Activity.deleteOne({ _id: activityId })
  return { message: 'Activity deleted successfully' }
}

//Get activities for a specific date
const getActivitiesByDate = async (tripId, date, userId) => {
  await checkTripOwnership(tripId, userId)
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  return Activity.find({
    tripId,
    startTime: { $gte: startOfDay, $lte: endOfDay }
  })
    .sort({ startTime: 1 })
    .populate('placeId')
    .lean()
}
//Update activity status
const updateActivityStatus = async (activityId, status, userId) => {
  const activity = await Activity.findById(activityId)
  if (!activity) throw NotFoundError('Activity not found')
  if (activity.userId.toString() !== userId.toString()) {
    throw ForbiddenError('You do not have permission to update this activity')
  }

  activity.status = status
  await activity.save()
  return activity.populate('placeId')
}

//Get a single activity by ID
const getActivityById = async (activityId, userId) => {
  const activity = await Activity.findById(activityId).populate('placeId tripId').lean()
  if (!activity) throw NotFoundError('Activity not found')
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
  deleteActivity,
  getActivitiesByDate,
  updateActivityStatus
}
