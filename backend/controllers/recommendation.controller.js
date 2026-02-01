let recommendationService = require('../services/recommendation.service')
let userPreferenceService = require('../services/userPreference.service')
let sendSuccess = (res, statusCode, data = null, message = null, extra = {}) => {
  let response = { success: true }
  if (data) response.data = data
  if (message) response.message = message
  Object.assign(response, extra)
  res.status(statusCode).json(response)
}

let getRecommendations = async (req, res, next) => {
  try {
    let tripId = req.params.tripId
    let options = {
      limit: parseInt(req.query.limit) || 50,
      radius: parseInt(req.query.radius) || 10000,
      category: req.query.category
    }
    let recommendations = await recommendationService.getRecommendations(
      tripId,
      options
    )
sendSuccess(res,200,
  { places: recommendations.places },
  recommendations.message,
  { count: recommendations.places.length }
)    
  } catch (error) {
    console.error(' Controller error:', error.message)
    console.error(' Stack:', error.stack)
    next(error)
  }
}

let getUserPreferences = async (req, res, next) => {
  try {
    console.log('\nController: getUserPreferences called')
    
    let summary = await userPreferenceService.getPreferenceSummary(req.user.id)
    sendSuccess(res, 200, summary)
    
    console.log('  Preferences sent\n')
    
  } catch (error) {
    console.error('  Controller error:', error.message)
    next(error)
  }
}

let trackSearch = async (req, res, next) => {
  try {
    let query = req.body.query
    let category = req.body.category
    let location = req.body.location
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

let updateRatingThreshold = async (req, res, next) => {
  try {
    let threshold = req.body.threshold
    let pref = await userPreferenceService.updateRatingThreshold(
      req.user.id,
      threshold
    )
    sendSuccess(res, 200, pref, 'Rating threshold updated')
  } catch (error) {
    next(error)
  }
}

let resetPreferences = async (req, res, next) => {
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
