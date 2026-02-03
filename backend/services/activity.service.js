let Activity = require('../models/Activity.model')
let Trip = require('../models/Trip.model')
let { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/errors')

let checkTripOwnership = async (tripId, userId) => {
  let trip = await Trip.findById(tripId).lean()
  if (!trip) {
    throw new NotFoundError('Trip not found')
  }
  if (trip.userId.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to access this trip')
  }
  return trip
}

let validateActivityDate = async (tripId, startTime) => {
  if (!startTime) return
  let trip = await Trip.findById(tripId)
    .select('startDate endDate')
    .lean()
  if (!trip) {
    throw new NotFoundError('Trip not found')
  }
  let activityDate = new Date(startTime)
  let tripStart = new Date(trip.startDate)
  let tripEnd = new Date(trip.endDate)
  if (activityDate < tripStart || activityDate > tripEnd) {
    throw new BadRequestError('Activity date must be within trip dates')
  }
}

let createActivity = async (tripId, activityData, userId) => {
  await checkTripOwnership(tripId, userId)
  await validateActivityDate(tripId, activityData.startTime)
  return Activity.create({
    ...activityData,
    tripId,
    userId
  })
}

let getActivitiesByTrip = async (tripId, userId) => {
  await checkTripOwnership(tripId, userId)
  return Activity.find({ tripId })
    .sort({ startTime: 1 })
    .populate('placeId')
    .lean()
}

let getActivityById = async (activityId, userId) => {
  let activity = await Activity.findById(activityId)
    .populate('placeId tripId')
    .lean()
  if (!activity) {
    throw new NotFoundError('Activity not found')
  }
  if (activity.userId.toString() !== userId.toString()) {
    throw new ForbiddenError('Not authorized for this activity')
  }
  return activity
}

let updateActivity = async (activityId, updateData, userId) => {
  let activity = await Activity.findById(activityId).lean()
  if (!activity) {
    throw new NotFoundError('Activity not found')
  }
  if (activity.userId.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to update this activity')
  }
  await validateActivityDate(activity.tripId, updateData.startTime)
  return Activity.findByIdAndUpdate(
    activityId,
    { $set: updateData },
    { new: true, runValidators: true }
  ).populate('placeId tripId')
}

let updateActivityStatus = async (activityId, status, userId) => {
  let activity = await Activity.findById(activityId).lean()
  if (!activity) {
    throw new NotFoundError('Activity not found')
  }
  if (activity.userId.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to update this activity')
  }
  return Activity.findByIdAndUpdate(
    activityId,
    { $set: { status } },
    { new: true }
  ).populate('placeId tripId')
}

let deleteActivity = async (activityId, userId) => {
  let activity = await Activity.findById(activityId)
  if (!activity) {
    throw new NotFoundError('Activity not found')
  }
  if (activity.userId.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to delete this activity')
  }
  await Activity.deleteOne({ _id: activityId })
  return { message: 'Activity deleted successfully' }
}

let getActivitiesByDate = async (tripId, date, userId) => {
  await checkTripOwnership(tripId, userId)
  let startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  let endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)
  return Activity.find({
    tripId,
    startTime: { $gte: startOfDay, $lte: endOfDay }
  })
    .sort({ startTime: 1 })
    .populate('placeId')
    .lean()
}

module.exports = {
  createActivity,
  getActivitiesByTrip,
  getActivityById,
  updateActivity,
  updateActivityStatus,
  deleteActivity,
  getActivitiesByDate
}
