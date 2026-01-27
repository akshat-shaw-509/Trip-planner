// routes/config.routes.js
const express = require('express')
const router = express.Router()

/**
 * GET /api/config/geoapify-api-key
 * Returns the Geoapify API key for frontend map features
 * Public endpoint - no authentication required
 */
router.get('/geoapify-api-key', (req, res) => {
  try {
    const apiKey = process.env.GEOAPIFY_API_KEY || ''
    
    if (!apiKey) {
      console.warn('⚠️ GEOAPIFY_API_KEY not set in environment variables')
    }
    
    res.json({
      success: true,
      data: {
        apiKey: apiKey
      }
    })
  } catch (error) {
    console.error('Error fetching Geoapify API key:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch API key'
    })
  }
})

/**
 * GET /api/config/google-maps-key (optional - for future use)
 * Returns Google Maps API key if you need it
 */
router.get('/google-maps-key', (req, res) => {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || ''
    
    res.json({
      success: true,
      data: {
        apiKey: apiKey
      }
    })
  } catch (error) {
    console.error('Error fetching Google Maps API key:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch API key'
    })
  }
})

module.exports = router
