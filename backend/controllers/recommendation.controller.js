const recommendationService = require('../services/recommendation.service')
const userPreferenceService = require('../services/userPreference.service')

const sendSuccess = (res, statusCode, data = null, message = null, extra = {}) => {
  const response = { success: true }
  if (data) response.data = data
  if (message) response.message = message
  Object.assign(response, extra)
  res.status(statusCode).json(response)
}

//Get AI-powered recommendations for a trip
//GET /api/trips/:tripId/recommendations
const getRecommendations = async (req, res, next) => {
  try {
    const tripId = req.params.tripId
    const options = {
      limit: parseInt(req.query.limit) || 50,
      radius: parseInt(req.query.radius) || 10000,
      category: req.query.category
    }
    const recommendations = await recommendationService.getRecommendations(
      tripId,
      options
    )
    sendSuccess(
      res,
      200,
      { places: recommendations.places },
      recommendations.message,
      { count: recommendations.places.length }
    )    
  } catch (error) {
    console.error('Recommendation controller error:', error.message)
    next(error)
  }
}

// Get user preferences summary
// GET /api/preferences
const getUserPreferences = async (req, res, next) => {
  try {
    const summary = await userPreferenceService.getPreferenceSummary(req.user.id)
    sendSuccess(res, 200, summary)
  } catch (error) {
    console.error('Get preferences error:', error.message)
    next(error)
  }
}

//Track user search behavior
//POST /api/preferences/track-search
const trackSearch = async (req, res, next) => {
  try {
    const { query, category, location } = req.body
    await userPreferenceService.trackSearch(req.user.id, {
      query,
      category,
      location
    })
    sendSuccess(res, 200, null, 'Search tracked')
  } catch (error) {
    next(error)
  }
}

//Update minimum rating threshold
//PUT /api/preferences/rating-threshold
const updateRatingThreshold = async (req, res, next) => {
  try {
    const { threshold } = req.body
    const pref = await userPreferenceService.updateRatingThreshold(
      req.user.id,
      threshold
    )
    sendSuccess(res, 200, pref, 'Rating threshold updated')
  } catch (error) {
    next(error)
  }
}

// Reset user preferences to default
//POST /api/preferences/reset
const resetPreferences = async (req, res, next) => {
  try {
    await userPreferenceService.resetPreferences(req.user.id)
    sendSuccess(res, 200, null, 'Preferences reset successfully')
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getRecommendations,
  getUserPreferences,     
  trackSearch,            
  updateRatingThreshold,  
  resetPreferences        
}
