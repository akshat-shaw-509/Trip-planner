const activityService = require('../services/activity.service')

/**
 * Send standardized success response
 */
const sendSuccess = (res, statusCode, data = null, message = null, extra = {}) => {
  const response = { success: true }

  if (data) response.data = data
  if (message) response.message = message

  Object.assign(response, extra)

  res.status(statusCode).json(response)
}

/**
 * Send standardized error response
 */
const sendError = (res, statusCode, message) => {
  res.status(statusCode).json({
    success: false,
    message
  })
}

/**
 * Create a new activity for a trip
 * POST /api/trips/:tripId/activities
 */
const createActivity = async (req, res) => {
  const activity = await activityService.createActivity(
    req.params.tripId,
    req.body,
    req.user.id
  )

  sendSuccess(res, 201, activity, 'Activity created successfully')
}

/**
 * Get all activities for a trip
 * GET /api/trips/:tripId/activities
 */
const getActivitiesByTrip = async (req, res) => {
  const activities = await activityService.getActivitiesByTrip(
    req.params.tripId,
    req.user.id
  )

  sendSuccess(res, 200, activities, null, {
    count: activities.length
  })
}

/**
 * Get a single activity by ID
 * GET /api/activities/:activityId
 */
const getActivityById = async (req, res) => {
  const activity = await activityService.getActivityById(
    req.params.activityId,
    req.user.id
  )

  sendSuccess(res, 200, activity)
}

/**
 * Update an activity
 * PUT /api/activities/:activityId
 */
const updateActivity = async (req, res) => {
  const activity = await activityService.updateActivity(
    req.params.activityId,
    req.body,
    req.user.id
  )

  sendSuccess(res, 200, activity, 'Activity updated successfully')
}

/**
 * Delete an activity
 * DELETE /api/activities/:activityId
 */
const deleteActivity = async (req, res) => {
  const result = await activityService.deleteActivity(
    req.params.activityId,
    req.user.id
  )

  sendSuccess(res, 200, null, result.message)
}

/**
 * Get activities for a specific date
 * GET /api/trips/:tripId/activities/by-date?date=YYYY-MM-DD
 */
const getActivitiesByDate = async (req, res) => {
  if (!req.query.date) {
    return sendError(res, 400, 'Date query parameter required')
  }

  const activities = await activityService.getActivitiesByDate(
    req.params.tripId,
    req.query.date,
    req.user.id
  )

  sendSuccess(res, 200, activities, null, {
    count: activities.length
  })
}

/**
 * Update activity status (planned / completed / cancelled)
 * PATCH /api/activities/:activityId/status
 */
const updateActivityStatus = async (req, res) => {
  if (!req.body.status) {
    return sendError(res, 400, 'Status required')
  }

  const activity = await activityService.updateActivityStatus(
    req.params.activityId,
    req.body.status,
    req.user.id
  )

  sendSuccess(res, 200, activity, 'Activity status updated successfully')
}

/**
 * Export controller methods
 */
module.exports = {
  createActivity,
  getActivitiesByTrip,
  getActivityById,
  updateActivity,
  deleteActivity,
  getActivitiesByDate,
  updateActivityStatus
}
