let Activity = require('../models/Activity.model')
let Trip = require('../models/Trip.model')
let { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/errors')

let checkTripOwnership = async (tripId, userId) => {
    let trip = await Trip.findById(tripId).lean()
    if (!trip) {
        throw NotFoundError('Trip not found');
    }
    if (trip.userId.toString() !== userId.toString()) {
        throw ForbiddenError('You do not have permission to add activities to this trip');
    }
    return trip
}

let validateActivityDate = async (tripId, startTime) => {
    if (!startTime) return
    let trip = await Trip.findById(tripId).select('startDate endDate').lean()
    let activityDate = new Date(startTime)
    let tripStart = new Date(trip.startDate)
    let tripEnd = new Date(trip.endDate)
    if (activityDate < tripStart || activityDate > tripEnd) {
        throw BadRequestError('Activity date must be within trip dates')
    }
}

let createActivity = async (tripId, activityData, userId) => {
    await checkTripOwnership(tripId, userId)
    await validateActivityDate(tripId, activityData.startTime)
    let activity = await Activity.create({
        ...activityData,
        tripId,
        userId,
    })
    return activity
}

let getActivitiesByTrip = async (tripId, userId) => {
   await checkTripOwnership(tripId, userId)
    return Activity.find({
        tripId,
        isDeleted: false
    })
     .sort({ startTime: 1 })
    .populate('placeId')
    .lean()
  }

let updateActivity = async (activityId, updateData, userId) => {
    let activity = await Activity.findOne({
        _id: activityId,
        isDeleted: false
    }).lean()

    if (!activity) {
        throw NotFoundError('Activity not found')
    }
    if(activity.userId.toString() !== userId.toString()) {
        throw ForbiddenError('You do not have permission to update this activity')
    }
    await validateActivityDate(activity.tripId, updateData.startTime)
    let updated=await Activity.findByIdAndUpdate(
        activityId,
        {$set: updateData},
        {new: true,runValidators: true}
    ).populate('placeId tripId')
    return updated
}

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

let getActivitiesByDate = async (tripId, date, userId) => {
  await checkTripOwnership(tripId, userId)
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
    .lean();
}

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
  updateActivityStatus,
}