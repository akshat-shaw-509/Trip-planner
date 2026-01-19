// services/userPreference.service.js
let UserPreference = require('../models/UserPreference.model');
let Place = require('../models/Place.model');

/**
 * Get user preferences
 */
let getUserPreferences = async (userId) => {
  return UserPreference.getOrCreate(userId);
};

/**
 * Update preferences when user adds a place
 */
let trackPlaceAdded = async (userId, place) => {
  const pref = await UserPreference.getOrCreate(userId);
  return pref.trackPlaceAdded(place);
};

/**
 * Update preferences when user favorites a place
 */
let trackFavorite = async (userId, placeId) => {
  const place = await Place.findById(placeId).lean();
  if (!place) return null;
  
  const pref = await UserPreference.getOrCreate(userId);
  return pref.trackFavorite(placeId, place.category);
};

/**
 * Track search behavior
 */
let trackSearch = async (userId, searchData) => {
  const pref = await UserPreference.getOrCreate(userId);
  
  // Keep only last 50 searches
  if (pref.recentSearches.length >= 50) {
    pref.recentSearches = pref.recentSearches.slice(-49);
  }
  
  pref.recentSearches.push({
    query: searchData.query,
    category: searchData.category,
    location: searchData.location,
    timestamp: new Date()
  });
  
  // Update category preference if category was searched
  if (searchData.category) {
    await pref.updateCategoryPreference(searchData.category, 0.5);
  }
  
  return pref.save();
};

/**
 * Get user's preference summary
 */
let getPreferenceSummary = async (userId) => {
  const pref = await UserPreference.getOrCreate(userId);
  
  const topCategories = pref.getTopCategories(5);
  const categoryScores = {};
  
  topCategories.forEach(cat => {
    categoryScores[cat] = pref.categoryPreferences.get(cat) || 0;
  });
  
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
  };
};

/**
 * Update rating threshold based on user behavior
 */
let updateRatingThreshold = async (userId, threshold) => {
  const pref = await UserPreference.getOrCreate(userId);
  pref.ratingThreshold = Math.max(0, Math.min(5, threshold));
  return pref.save();
};

/**
 * Reset user preferences
 */
let resetPreferences = async (userId) => {
  const pref = await UserPreference.findOne({ userId });
  if (!pref) return null;
  
  pref.categoryPreferences = new Map([
    ['restaurant', 0],
    ['attraction', 0],
    ['accommodation', 0],
    ['transport', 0],
    ['other', 0]
  ]);
  pref.recentSearches = [];
  pref.favoritePlaceIds = [];
  pref.pricePreference = { min: 0, max: 5, avg: 2.5 };
  pref.ratingThreshold = 3.0;
  
  return pref.save();
};

module.exports = {
  getUserPreferences,
  trackPlaceAdded,
  trackFavorite,
  trackSearch,
  getPreferenceSummary,
  updateRatingThreshold,
  resetPreferences
};