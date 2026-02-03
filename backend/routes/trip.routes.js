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

// Trip collection routes
router.post('/', validateTrip, tripController.createTrip)
router.get('/', tripController.getUserTrips)

// Place routes scoped to a trip — MUST come before /:tripId
// In Express 5, /:tripId is greedy and will swallow /places if it comes first
router.get('/:tripId/places/nearby', placeController.searchNearbyPlaces)
router.get('/:tripId/places', placeController.getPlacesByTrip)
router.post('/:tripId/places', validatePlace, placeController.createPlace)

// Banner routes — also before bare /:tripId
router.post('/:tripId/banner', uploadBanner.single('image'), tripController.uploadBanner)
router.delete('/:tripId/banner', tripController.removeBanner)
router.patch('/:tripId/status', tripController.updateTripStatus)

// Trip single-resource routes — these MUST be last
router.get('/:tripId', tripController.getTripById)
router.put('/:tripId', validateTripUpdate, tripController.updateTrip)
router.delete('/:tripId', tripController.deleteTrip)

module.exports = router
