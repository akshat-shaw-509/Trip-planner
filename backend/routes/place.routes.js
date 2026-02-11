let express = require('express')
let router = express.Router()
let placeController = require('../controllers/place.controller')
let { authenticate } = require('../middleware/auth.middleware')
let { validatePlaceUpdate } = require('../middleware/place.validation.middleware')

let geocodeLocation
// try loading geoapify service; if it fails we just skip the geocode route
try {
  const geoapifyService = require('../services/geoapify.service')
  geocodeLocation = geoapifyService.geocodeLocation
  console.log('Geoapify service loaded successfully')
} catch (error) {
  console.error('Failed to load geoapify.service:', error.message)
  console.error('Geocoding endpoint will not be available')
}

// geocode route
if (geocodeLocation) {
  router.post('/geocode', async (req, res) => {
    try {
      const { location } = req.body
      
      if (!location) {
        return res.status(400).json({ 
          success: false, 
          error: 'Location is required' 
        })
      }

      console.log('Geocoding request for:', location)
      const coords = await geocodeLocation(location)
      
      if (!coords) {
        return res.status(404).json({ 
          success: false, 
          error: 'Location not found' 
        })
      }

      console.log('Geocoded successfully:', coords.formatted)
      res.json({ 
        success: true, 
        data: coords 
      })
    } catch (error) {
      console.error('Geocoding error:', error)
      res.status(500).json({ 
        success: false, 
        error: 'Geocoding failed: ' + error.message 
      })
    }
  })
  console.log('Geocoding endpoint registered at POST /api/places/geocode')
} else {
  console.warn('Geocoding endpoint not available - service not loaded')
}

// All other routes require authentication
router.use(authenticate)

router.get('/:placeId', placeController.getPlaceById)
router.put('/:placeId', validatePlaceUpdate, placeController.updatePlace)
router.delete('/:placeId', placeController.deletePlace)
router.patch('/:placeId/favorite', placeController.toggleFavorite)
router.patch('/:placeId/visit-status', placeController.updateVisitStatus)

module.exports = router
