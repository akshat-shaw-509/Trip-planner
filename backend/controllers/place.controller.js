const placeService = require('../services/place.service');

const sendSuccess = (res, statusCode, data = null, message = null, extra = {}) => {
  const response = { success: true };
  if (data !== null) response.data = data;  // allow [], 0, false
  if (message) response.message = message;
  Object.assign(response, extra);
  return res.status(statusCode).json(response);
};

const sendError = (res, statusCode, message) => {
  return res.status(statusCode).json({ success: false, message });
};

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Create a new place in a trip
// POST /api/trips/:tripId/places
const createPlace = asyncHandler(async (req, res) => {
  const place = await placeService.createPlace(req.params.tripId, req.body, req.user.id);
  return sendSuccess(res, 201, place, 'Place created successfully');
});

// Get all places for a trip
// GET /api/trips/:tripId/places
const getPlacesByTrip = asyncHandler(async (req, res) => {
  const filters = {
    category: req.query.category || undefined,
    visitStatus: req.query.visitStatus || undefined
  };
  const places = await placeService.getPlacesByTrip(req.params.tripId, req.user.id, filters);
  return sendSuccess(res, 200, places, null, { count: places.length });
});

// Get a single place by ID
// GET /api/places/:placeId
const getPlaceById = asyncHandler(async (req, res) => {
  const place = await placeService.getPlaceById(req.params.placeId, req.user.id);
  return sendSuccess(res, 200, place);
});

// Update place details
// PUT /api/places/:placeId
const updatePlace = asyncHandler(async (req, res) => {
  const place = await placeService.updatePlace(req.params.placeId, req.body, req.user.id);
  return sendSuccess(res, 200, place, 'Place updated successfully');
});

// Delete a place from a trip
// DELETE /api/places/:placeId
const deletePlace = asyncHandler(async (req, res) => {
  const result = await placeService.deletePlace(req.params.placeId, req.user.id);
  return sendSuccess(res, 200, null, result?.message || 'Place deleted');
});

// Toggle favorite status for a place
// PATCH /api/places/:placeId/favorite
const toggleFavorite = asyncHandler(async (req, res) => {
  const place = await placeService.toggleFavorite(req.params.placeId, req.user.id);
  return sendSuccess(res, 200, place, 'Favorite status updated');
});

// Update visit status (planned / visited / skipped)
// PATCH /api/places/:placeId/visit-status
const updateVisitStatus = asyncHandler(async (req, res) => {
  const { visitStatus } = req.body;
  if (!visitStatus) return sendError(res, 400, 'Visit status required');
  
  const place = await placeService.updateVisitStatus(req.params.placeId, visitStatus, req.user.id);
  return sendSuccess(res, 200, place, 'Visit status updated successfully');
});

// Search nearby places based on trip center
// GET /api/trips/:tripId/places/nearby
const searchNearbyPlaces = asyncHandler(async (req, res) => {
  const places = await placeService.searchNearby(req.params.tripId, req.query, req.user.id);
  return sendSuccess(res, 200, places, null, { count: places.length });
});

module.exports = {
  createPlace,
  getPlacesByTrip,
  getPlaceById,
  updatePlace,
  deletePlace,
  toggleFavorite,
  updateVisitStatus,
  searchNearbyPlaces
};
