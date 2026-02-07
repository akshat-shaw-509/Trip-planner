const recommendationService = require('../services/recommendation.service')
const userPreferenceService = require('../services/userPreference.service')

const sendSuccess = (res, statusCode, data = null, message = null, extra = {}) => {
  const response = { success: true }
  if (data) response.data = data
  if (message) response.message = message
  Object.assign(response, extra)
  res.status(statusCode).json(response)
}

/**
 * Get AI-powered recommendations for a trip
 * GET /api/trips/:tripId/recommendations
 * 
 * Query parameters:
 * - limit: Number of results (default: 50)
 * - radius: Search radius in km (default: 10)
 * - category: Filter by category (all/restaurant/attraction/accommodation)
 * - minRating: Minimum rating filter (default: 3.5)
 * - sortBy: Sort order (bestMatch/rating/distance)
 * - hiddenGems: Show hidden gems (true/false)
 * - topRated: Only top-rated places (true/false)
 * - minPrice: Minimum price level (1-5)
 * - maxPrice: Maximum price level (1-5)
 */
const getRecommendations = async (req, res, next) => {
  try {
    const tripId = req.params.tripId
    
    // Parse query parameters with defaults
    const options = {
      limit: parseInt(req.query.limit) || 50,
      radius: parseFloat(req.query.radius) || 10,
      category: req.query.category || 'all',
      
      // Rating filters
      minRating: req.query.minRating ? parseFloat(req.query.minRating) : undefined,
      
      // Sorting
      sortBy: req.query.sortBy || 'bestMatch', // bestMatch, rating, distance
      
      // Quick filters
      hiddenGems: req.query.hiddenGems === 'true',
      topRated: req.query.topRated === 'true',
      
      // Price range
      minPrice: req.query.minPrice ? parseInt(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? parseInt(req.query.maxPrice) : undefined
    }

    console.log('Fetching recommendations with options:', options)

    const recommendations = await recommendationService.getRecommendations(
      tripId,
      options
    )

    sendSuccess(
      res,
      200,
      { 
        places: recommendations.places,
        centerLocation: recommendations.centerLocation,
        appliedFilters: recommendations.appliedFilters
      },
      recommendations.message,
      { 
        count: recommendations.places.length,
        totalFound: recommendations.places.length
      }
    )    
  } catch (error) {
    console.error('Recommendation controller error:', error.message)
    next(error)
  }
}

/**
 * Get user preferences summary
 * GET /api/preferences
 */
const getUserPreferences = async (req, res, next) => {
  try {
    const summary = await userPreferenceService.getPreferenceSummary(req.user.id)
    sendSuccess(res, 200, summary)
  } catch (error) {
    console.error('Get preferences error:', error.message)
    next(error)
  }
}

/**
 * Track user search behavior
 * POST /api/preferences/track-search
 * Body: { query, category, location }
 */
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

/**
 * Update minimum rating threshold
 * PUT /api/preferences/rating-threshold
 * Body: { threshold }
 */
const updateRatingThreshold = async (req, res, next) => {
  try {
    const { threshold } = req.body
    
    if (threshold < 0 || threshold > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating threshold must be between 0 and 5'
      })
    }

    const pref = await userPreferenceService.updateRatingThreshold(
      req.user.id,
      threshold
    )
    sendSuccess(res, 200, pref, 'Rating threshold updated')
  } catch (error) {
    next(error)
  }
}

/**
 * Reset user preferences to default
 * POST /api/preferences/reset
 */
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


