const tripService = require('../services/trip.service')
const { asyncHandler } = require('../middleware/error.middleware')
const { ValidationError } = require('../utils/errors')

const sendSuccess = (res, statusCode, data = null, message = null, extra = {}) => {
  const response = { success: true }
  if (data) response.data = data
  if (message) response.message = message
  Object.assign(response, extra)
  res.status(statusCode).json(response)
}

//Create a new trip
//POST /api/trips
const createTrip = asyncHandler(async (req, res) => {
  const trip = await tripService.createTrip(req.body, req.user._id)
  sendSuccess(res, 201, trip, 'Trip created successfully')
})

//Get all trips of logged-in user
 //GET /api/trips
const getUserTrips = asyncHandler(async (req, res) => {
  const filters = {
    status: req.query.status,
    search: req.query.search,
    sortBy: req.query.sortBy,
    page: req.query.page,
    limit: req.query.limit,
  }
  
  const result = await tripService.getTripsByUser(req.user._id, filters)
  
  sendSuccess(res, 200, result.trips, null, {
    pagination: result.pagination
  })
})

//Get a single trip by ID
//GET /api/trips/:tripId
const getTripById = asyncHandler(async (req, res) => {
  const trip = await tripService.getTripById(req.params.tripId, req.user._id)
  sendSuccess(res, 200, trip)
})

// Update trip details
// PUT /api/trips/:tripId
const updateTrip = asyncHandler(async (req, res) => {
  const trip = await tripService.updateTrip(
    req.params.tripId,
    req.body,
    req.user._id
  )
  sendSuccess(res, 200, trip, 'Trip updated successfully')
})

//Delete a trip
//DELETE /api/trips/:tripId
const deleteTrip = asyncHandler(async (req, res) => {
  const result = await tripService.deleteTrip(req.params.tripId, req.user._id)
  sendSuccess(res, 200, null, result.message)
})

//Update trip status (planning / ongoing / completed / cancelled)
//PATCH /api/trips/:tripId/status
const updateTripStatus = asyncHandler(async (req, res) => {
  if (!req.body.status) {
    return res.status(400).json({
      success: false,
      message: 'Status is required'
    })
  }
  const trip = await tripService.updateTripStatus(
    req.params.tripId,
    req.body.status,
    req.user._id
  )
  sendSuccess(res, 200, trip, 'Trip status updated successfully')
})

//Upload trip banner image
//POST /api/trips/:tripId/banner
const uploadBanner = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ValidationError('No image file provided')
  }
  const updatedTrip = await tripService.uploadBanner(
    req.params.tripId,
    req.user._id,
    req.file
  )
  res.status(200).json({
    success: true,
    message: 'Banner uploaded successfully',
    data: {
      _id: updatedTrip._id,
      coverImage: updatedTrip.coverImage
    }
  })
})

// Remove trip banner image
//DELETE /api/trips/:tripId/banner
const removeBanner = asyncHandler(async (req, res) => {
  const updatedTrip = await tripService.removeBanner(
    req.params.tripId,
    req.user._id
  )

  res.status(200).json({
    success: true,
    message: 'Banner removed successfully',
    data: {
      _id: updatedTrip._id,
      coverImage: null
    }
  })
})

module.exports = {
  createTrip,
  getUserTrips,
  getTripById,
  updateTrip,
  deleteTrip,
  updateTripStatus,
  uploadBanner,
  removeBanner  
}
