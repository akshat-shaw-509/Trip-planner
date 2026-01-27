let express = require('express')
let router = express.Router()
let placeController = require('../controllers/place.controller')
let { authenticate } = require('../middleware/auth.middleware')
let { validatePlace, validatePlaceUpdate } = require('../middleware/place.validation.middleware')
let { geocodeLocation } = require('../services/geoapifyService') // ✅ ADD THIS

// ✅ ADD THIS PUBLIC ENDPOINT (before authenticate middleware)
router.post('/geocode', async (req, res) => {
  try {
    const { location } = req.body
    
    if (!location) {
      return res.status(400).json({ 
        success: false, 
        error: 'Location is required' 
      })
    }

    const coords = await geocodeLocation(location)
    
    if (!coords) {
      return res.status(404).json({ 
        success: false, 
        error: 'Location not found' 
      })
    }

    res.json({ 
      success: true, 
      data: coords 
    })
  } catch (error) {
    console.error('Geocoding error:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Geocoding failed' 
    })
  }
})

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
