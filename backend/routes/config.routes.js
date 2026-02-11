const express = require('express')
const router = express.Router()

// return geoapify api key so frontend map features can use it
router.get('/geoapify-api-key', (req, res) => {
  try {
    const apiKey = process.env.GEOAPIFY_API_KEY || ''
    if (!apiKey) {
      console.warn('GEOAPIFY_API_KEY not set in environment variables')
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
module.exports = router
