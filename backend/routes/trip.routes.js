const express = require('express')
const router = express.Router()
const tripController = require('../controllers/trip.controller')
const placeController = require('../controllers/place.controller')
const recommendationController = require('../controllers/recommendation.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { validateTrip, validateTripUpdate } = require('../middleware/trip.validation.middleware')
const { validatePlace } = require('../middleware/place.validation.middleware')
const { uploadBanner } = require('../middleware/upload.middleware')

router.use(authenticate)
// create a trip
router.post('/', validateTrip, tripController.createTrip)
// get all trips for logged in user
router.get('/', tripController.getUserTrips)

// place routes inside a trip
// keep these above /:tripId so they don't get matched incorrectly
router.get('/:tripId/places/nearby', placeController.searchNearbyPlaces)
router.get('/:tripId/places', placeController.getPlacesByTrip)
router.post('/:tripId/places', validatePlace, placeController.createPlace)
// fetch recommendations for a trip
router.get('/:tripId/recommendations', recommendationController.getRecommendations)

// banner upload/remove
router.post('/:tripId/banner', uploadBanner.single('image'), tripController.uploadBanner)
router.delete('/:tripId/banner', tripController.removeBanner)
// update trip status only
router.patch('/:tripId/status', tripController.updateTripStatus)

router.get('/:tripId', tripController.getTripById)
router.put('/:tripId', validateTripUpdate, tripController.updateTrip)
router.delete('/:tripId', tripController.deleteTrip)

module.exports = router
