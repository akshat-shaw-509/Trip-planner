const activityService = require('../services/activity.service');

// Standardized success response
const sendSuccess = (res, statusCode, data = null, message = null, extra = {}) => {
  const response = { success: true };
  if (data !== null) response.data = data;
  if (message) response.message = message;
  Object.assign(response, extra);
  return res.status(statusCode).json(response);
};

// Standardized error response (fallback)
const sendError = (res, statusCode, message) => {
  return res.status(statusCode).json({ success: false, message });
};

// Async wrapper so rejected promises go to Express error middleware
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next); // recommended pattern [web:12]

// Create a new activity for a trip
// POST /api/trips/:tripId/activities
const createActivity = asyncHandler(async (req, res) => {
  const activity = await activityService.createActivity(
    req.params.tripId,
    req.body,
    req.user.id
  );
  return sendSuccess(res, 201, activity, 'Activity created successfully');
});

// Get all activities for a trip
// GET /api/trips/:tripId/activities
const getActivitiesByTrip = asyncHandler(async (req, res) => {
  const activities = await activityService.getActivitiesByTrip(
    req.params.tripId,
    req.user.id
  );
  return sendSuccess(res, 200, activities, null, { count: activities.length });
});

// Get a single activity by ID
// GET /api/activities/:activityId
const getActivityById = asyncHandler(async (req, res) => {
  const activity = await activityService.getActivityById(
    req.params.activityId,
    req.user.id
  );
  return sendSuccess(res, 200, activity);
});

// Update an activity
// PUT /api/activities/:activityId
const updateActivity = asyncHandler(async (req, res) => {
  const activity = await activityService.updateActivity(
    req.params.activityId,
    req.body,
    req.user.id
  );
  return sendSuccess(res, 200, activity, 'Activity updated successfully');
});

// Delete an activity
// DELETE /api/activities/:activityId
const deleteActivity = asyncHandler(async (req, res) => {
  const result = await activityService.deleteActivity(
    req.params.activityId,
    req.user.id
  );
  return sendSuccess(res, 200, null, result?.message || 'Activity deleted');
});

// Get activities for a specific date
// GET /api/trips/:tripId/activities/by-date?date=YYYY-MM-DD
const getActivitiesByDate = asyncHandler(async (req, res) => {
  const { date } = req.query;
  if (!date) return sendError(res, 400, 'Date query parameter required');

  const activities = await activityService.getActivitiesByDate(
    req.params.tripId,
    date,
    req.user.id
  );
  return sendSuccess(res, 200, activities, null, { count: activities.length });
});

// Update activity status
// PATCH /api/activities/:activityId/status
const updateActivityStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) return sendError(res, 400, 'Status required');

  const activity = await activityService.updateActivityStatus(
    req.params.activityId,
    status,
    req.user.id
  );
  return sendSuccess(res, 200, activity, 'Activity status updated successfully');
});

module.exports = {
  createActivity,
  getActivitiesByTrip,
  getActivityById,
  updateActivity,
  deleteActivity,
  getActivitiesByDate,
  updateActivityStatus
};
