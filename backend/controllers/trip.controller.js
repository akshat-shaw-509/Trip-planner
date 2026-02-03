const tripService = require('../services/trip.service');
const { asyncHandler } = require('../middleware/error.middleware');
const { ValidationError } = require('../utils/errors');

// Fixed: always returns, handles falsy data properly
const sendSuccess = (res, statusCode, data = null, message = null, extra = {}) => {
  const response = { success: true };
  if (data !== null) response.data = data;  // allow [], 0, false
  if (message) response.message = message;
  Object.assign(response, extra);
  return res.status(statusCode).json(response);
};

// Create a new trip
// POST /api/trips
const createTrip = asyncHandler(async (req, res) => {
  const trip = await tripService.createTrip(req.body, req.user._id);
  return sendSuccess(res, 201, trip, 'Trip created successfully');
});

// Get all trips of logged-in user
// GET /api/trips
const getUserTrips = asyncHandler(async (req, res) => {
  const filters = {
    status: req.query.status || undefined,
    search: req.query.search || undefined,
    sortBy: req.query.sortBy || undefined,
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 10
  };
  
  const result = await tripService.getTripsByUser(req.user._id, filters);
  return sendSuccess(res, 200, result.trips, null, {
    pagination: result.pagination
  });
});

// Get a single trip by ID
// GET /api/trips/:tripId
const getTripById = asyncHandler(async (req, res) => {
  const trip = await tripService.getTripById(req.params.tripId, req.user._id);
  return sendSuccess(res, 200, trip);
});

// Update trip details
// PUT /api/trips/:tripId
const updateTrip = asyncHandler(async (req, res) => {
  const trip = await tripService.updateTrip(req.params.tripId, req.body, req.user._id);
  return sendSuccess(res, 200, trip, 'Trip updated successfully');
});

// Delete a trip
// DELETE /api/trips/:tripId
const deleteTrip = asyncHandler(async (req, res) => {
  const result = await tripService.deleteTrip(req.params.tripId, req.user._id);
  return sendSuccess(res, 200, null, result?.message || 'Trip deleted successfully');
});

// Update trip status (planning / ongoing / completed / cancelled)
// PATCH /api/trips/:tripId/status
const updateTripStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) throw new ValidationError('Status is required');
  
  const trip = await tripService.updateTripStatus(req.params.tripId, status, req.user._id);
  return sendSuccess(res, 200, trip, 'Trip status updated successfully');
});

// Upload trip banner image
// POST /api/trips/:tripId/banner
const uploadBanner = asyncHandler(async (req, res) => {
  if (!req.file) throw new ValidationError('No image file provided');
  
  const updatedTrip = await tripService.uploadBanner(req.params.tripId, req.user._id, req.file);
  return sendSuccess(res, 200, {
    _id: updatedTrip._id,
    coverImage: updatedTrip.coverImage
  }, 'Banner uploaded successfully');
});

// Remove trip banner image
// DELETE /api/trips/:tripId/banner
const removeBanner = asyncHandler(async (req, res) => {
  const updatedTrip = await tripService.removeBanner(req.params.tripId, req.user._id);
  return sendSuccess(res, 200, {
    _id: updatedTrip._id,
    coverImage: null
  }, 'Banner removed successfully');
});

module.exports = {
  createTrip,
  getUserTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  updateTripStatus,
  uploadBanner,
  removeBanner
};

