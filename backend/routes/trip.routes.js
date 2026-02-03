const express = require('express')
const router = express.Router()

const tripController = require('../controllers/trip.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { validateTrip, validateTripUpdate } = require('../middleware/trip.validation.middleware')
const { uploadBanner } = require('../middleware/upload.middleware')

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

module.exports = router
