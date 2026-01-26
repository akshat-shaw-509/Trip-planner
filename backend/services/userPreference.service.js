<<<<<<< HEAD
let UserPreference = require('../models/UserPreference.model')
let Place = require('../models/Place.model')

/**
 * -------------------- Get User Preferences --------------------
 * Creates preferences document if not exists
 */
let getUserPreferences = async (userId) => {
  return UserPreference.getOrCreate(userId)
}

/**
 * -------------------- Track Place Added --------------------
 * Boosts category & price preference when user adds a place
 */
let trackPlaceAdded = async (userId, place) => {
  let pref = await UserPreference.getOrCreate(userId)
  return pref.trackPlaceAdded(place)
}

/**
 * -------------------- Track Favorite Place --------------------
 * Strong signal for category preference
 */
let trackFavorite = async (userId, placeId) => {
  let place = await Place.findById(placeId).lean()
  if (!place) return null

  let pref = await UserPreference.getOrCreate(userId)
  return pref.trackFavorite(placeId, place.category)
}

/**
 * -------------------- Track Search Behavior --------------------
 * Keeps last 50 searches
 * Slightly boosts searched category
 */
let trackSearch = async (userId, searchData) => {
  let pref = await UserPreference.getOrCreate(userId)

  // Keep only last 50 searches
  if (pref.recentSearches.length >= 50) {
    pref.recentSearches = pref.recentSearches.slice(-49)
  }

  pref.recentSearches.push({
    query: searchData.query,
    category: searchData.category,
    location: searchData.location,
    timestamp: new Date()
  })

  // Soft signal: category interest
  if (searchData.category) {
    await pref.updateCategoryPreference(searchData.category, 0.5)
  }

  return pref.save()
}

/**
 * -------------------- Preference Summary --------------------
 * Used by recommendation engine & analytics
 */
let getPreferenceSummary = async (userId) => {
  let pref = await UserPreference.getOrCreate(userId)

  let topCategories = pref.getTopCategories(5)
  let categoryScores = {}

  topCategories.forEach(category => {
    categoryScores[category] = pref.categoryPreferences.get(category) || 0
  })

  return {
    topCategories,
    categoryScores,
    priceRange: {
      min: pref.pricePreference.min,
      max: pref.pricePreference.max,
      preferred: Math.round(pref.pricePreference.avg)
    },
    ratingThreshold: pref.ratingThreshold,
    stats: pref.stats,
    recentSearches: pref.recentSearches.slice(-10).reverse()
  }
}

/**
 * -------------------- Update Rating Threshold --------------------
 * Dynamically adapts recommendation strictness
 */
let updateRatingThreshold = async (userId, threshold) => {
  let pref = await UserPreference.getOrCreate(userId)
  pref.ratingThreshold = Math.max(0, Math.min(5, threshold))
  return pref.save()
}

/**
 * -------------------- Reset Preferences --------------------
 * Used for user reset / cold-start scenarios
 */
let resetPreferences = async (userId) => {
  let pref = await UserPreference.findOne({ userId })
  if (!pref) return null

  pref.categoryPreferences = new Map([
    ['restaurant', 0],
    ['attraction', 0],
    ['accommodation', 0],
    ['transport', 0],
    ['other', 0]
  ])

  pref.recentSearches = []
  pref.favoritePlaceIds = []
  pref.pricePreference = { min: 0, max: 5, avg: 2.5 }
  pref.ratingThreshold = 3.0

  return pref.save()
}

module.exports = {
  getUserPreferences,
  trackPlaceAdded,
  trackFavorite,
  trackSearch,
  getPreferenceSummary,
  updateRatingThreshold,
  resetPreferences
}
=======
let UserPreference = require('../models/UserPreference.model')
let Place = require('../models/Place.model')

/**
 * -------------------- Get User Preferences --------------------
 * Creates preferences document if not exists
 */
let getUserPreferences = async (userId) => {
  return UserPreference.getOrCreate(userId)
}

/**
 * -------------------- Track Place Added --------------------
 * Boosts category & price preference when user adds a place
 */
let trackPlaceAdded = async (userId, place) => {
  let pref = await UserPreference.getOrCreate(userId)
  return pref.trackPlaceAdded(place)
}

/**
 * -------------------- Track Favorite Place --------------------
 * Strong signal for category preference
 */
let trackFavorite = async (userId, placeId) => {
  let place = await Place.findById(placeId).lean()
  if (!place) return null

  let pref = await UserPreference.getOrCreate(userId)
  return pref.trackFavorite(placeId, place.category)
}

/**
 * -------------------- Track Search Behavior --------------------
 * Keeps last 50 searches
 * Slightly boosts searched category
 */
let trackSearch = async (userId, searchData) => {
  let pref = await UserPreference.getOrCreate(userId)

  // Keep only last 50 searches
  if (pref.recentSearches.length >= 50) {
    pref.recentSearches = pref.recentSearches.slice(-49)
  }

  pref.recentSearches.push({
    query: searchData.query,
    category: searchData.category,
    location: searchData.location,
    timestamp: new Date()
  })

  // Soft signal: category interest
  if (searchData.category) {
    await pref.updateCategoryPreference(searchData.category, 0.5)
  }

  return pref.save()
}

/**
 * -------------------- Preference Summary --------------------
 * Used by recommendation engine & analytics
 */
let getPreferenceSummary = async (userId) => {
  let pref = await UserPreference.getOrCreate(userId)

  let topCategories = pref.getTopCategories(5)
  let categoryScores = {}

  topCategories.forEach(category => {
    categoryScores[category] = pref.categoryPreferences.get(category) || 0
  })

  return {
    topCategories,
    categoryScores,
    priceRange: {
      min: pref.pricePreference.min,
      max: pref.pricePreference.max,
      preferred: Math.round(pref.pricePreference.avg)
    },
    ratingThreshold: pref.ratingThreshold,
    stats: pref.stats,
    recentSearches: pref.recentSearches.slice(-10).reverse()
  }
}

/**
 * -------------------- Update Rating Threshold --------------------
 * Dynamically adapts recommendation strictness
 */
let updateRatingThreshold = async (userId, threshold) => {
  let pref = await UserPreference.getOrCreate(userId)
  pref.ratingThreshold = Math.max(0, Math.min(5, threshold))
  return pref.save()
}

/**
 * -------------------- Reset Preferences --------------------
 * Used for user reset / cold-start scenarios
 */
let resetPreferences = async (userId) => {
  let pref = await UserPreference.findOne({ userId })
  if (!pref) return null

  pref.categoryPreferences = new Map([
    ['restaurant', 0],
    ['attraction', 0],
    ['accommodation', 0],
    ['transport', 0],
    ['other', 0]
  ])

  pref.recentSearches = []
  pref.favoritePlaceIds = []
  pref.pricePreference = { min: 0, max: 5, avg: 2.5 }
  pref.ratingThreshold = 3.0

  return pref.save()
}

module.exports = {
  getUserPreferences,
  trackPlaceAdded,
  trackFavorite,
  trackSearch,
  getPreferenceSummary,
  updateRatingThreshold,
  resetPreferences
}
>>>>>>> 0007615a5a7317e8689fc9727726ee86c5585786
