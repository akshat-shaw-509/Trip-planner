const express = require('express')
const router = express.Router()
const tripController = require('../controllers/trip.controller')
const placeController = require('../controllers/place.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { validateTrip, validateTripUpdate } = require('../middleware/trip.validation.middleware')
const { validatePlace } = require('../middleware/place.validation.middleware')
const { uploadBanner } = require('../middleware/upload.middleware')

console.log('AUTHENTICATE TYPE:', typeof authenticate)

// All routes require authentication
router.use(authenticate)

// Trip CRUD
router.post('/', validateTrip, tripController.createTrip)
router.get('/', tripController.getUserTrips)
router.get('/:tripId', tripController.getTripById)
router.put('/:tripId', validateTripUpdate, tripController.updateTrip)
router.delete('/:tripId', tripController.deleteTrip)
router.patch('/:tripId/status', tripController.updateTripStatus)

// Banner upload routes
router.post('/:tripId/banner', uploadBanner.single('image'), tripController.uploadBanner)
router.delete('/:tripId/banner', tripController.removeBanner)

// Place routes scoped to a trip — these live here because the frontend
// calls /api/trips/:tripId/places and this router is mounted at /api/trips
router.get('/:tripId/places', placeController.getPlacesByTrip)
router.post('/:tripId/places', validatePlace, placeController.createPlace)
router.get('/:tripId/places/nearby', placeController.searchNearbyPlaces)

module.exports = router
