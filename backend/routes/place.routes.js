
let express = require('express')
let router = express.Router()
let placeController = require('../controllers/place.controller')
let { authenticate } = require('../middleware/auth.middleware')
let { validatePlace, validatePlaceUpdate } = require('../middleware/place.validation.middleware')

router.use(authenticate)

// Place routes for a specific trip
router.post('/trips/:tripId/places', validatePlace, placeController.createPlace)
router.get('/trips/:tripId/places', placeController.getPlacesByTrip)
router.get('/trips/:tripId/places/nearby', placeController.searchNearbyPlaces)
router.get('/trips/:tripId/places/by-category', placeController.getPlacesByCategory)

// Individual place routes
router.get('/places/:placeId', placeController.getPlaceById)
router.put('/places/:placeId', validatePlaceUpdate, placeController.updatePlace)
router.delete('/places/:placeId', placeController.deletePlace)
router.patch('/places/:placeId/favorite', placeController.toggleFavorite)
router.patch('/places/:placeId/visit-status', placeController.updateVisitStatus)

module.exports = router