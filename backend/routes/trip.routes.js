let express = require('express')
let router = express.Router()
let tripController = require('../controllers/trip.controller')
let { authenticate } = require('../middleware/auth.middleware')
let { validateTrip, validateTripUpdate } = require('../middleware/trip.validation.middleware')
let { uploadBanner } = require('../middleware/upload.middleware')

// All routes require authentication
router.use(authenticate)

// Trip CRUD
router.post('/', ...validateTrip, tripController.createTrip)
router.get('/', tripController.getUserTrips)
router.get('/:tripId', tripController.getTripById)
router.put('/:tripId', ...validateTripUpdate, tripController.updateTrip)
router.delete('/:tripId', tripController.deleteTrip)
router.patch('/:tripId/status', tripController.updateTripStatus)

// Banner upload routes
router.post('/:tripId/banner', uploadBanner.single('image'), tripController.uploadBanner)
router.delete('/:tripId/banner', tripController.removeBanner)

module.exports = router
