// controllers/recommendation.controller.js - WITH DEBUG LOGS

let recommendationService = require('../services/recommendation.service');
let userPreferenceService = require('../services/userPreference.service');

let sendSuccess = (res, statusCode, data = null, message = null, extra = {}) => {
  let response = { success: true };
  if (data) response.data = data;
  if (message) response.message = message;
  Object.assign(response, extra);
  res.status(statusCode).json(response);
};

/**
 * GET /api/trips/:tripId/recommendations
 */
let getRecommendations = async (req, res, next) => {
  try {
    console.log('\n🟢 Controller: getRecommendations called');
    console.log('   Trip ID:', req.params.tripId);
    console.log('   User ID:', req.user.id);
    console.log('   Query params:', req.query);
    
    const { tripId } = req.params;
    const options = {
      limit: parseInt(req.query.limit) || 50,
      radius: parseInt(req.query.radius) || 10000,
      category: req.query.category
    };
    
    console.log('   Options:', options);
    console.log('   Calling recommendationService.getRecommendations...');
    
    const recommendations = await recommendationService.getRecommendations(
      tripId,
      req.user.id,
      options
    );
    
    console.log('   ✅ Service returned', recommendations.length, 'recommendations');
    
    sendSuccess(res, 200, recommendations, null, { count: recommendations.length });
    
    console.log('   ✅ Response sent successfully\n');
    
  } catch (error) {
    console.error('   ❌ Controller error:', error.message);
    console.error('   Stack:', error.stack);
    next(error);
  }
};

/**
 * GET /api/trips/:tripId/day-plans
 */
let getDayPlans = async (req, res, next) => {
  try {
    console.log('\n🟢 Controller: getDayPlans called');
    console.log('   Trip ID:', req.params.tripId);
    
    const { tripId } = req.params;
    const dayPlans = await recommendationService.generateDayPlans(tripId, req.user.id);
    
    console.log('   ✅ Generated', dayPlans.length, 'day plans');
    
    sendSuccess(res, 200, dayPlans, null, { 
      totalDays: dayPlans.length,
      totalPlaces: dayPlans.reduce((sum, day) => sum + day.totalPlaces, 0)
    });
    
    console.log('   ✅ Response sent successfully\n');
    
  } catch (error) {
    console.error('   ❌ Controller error:', error.message);
    next(error);
  }
};

/**
 * GET /api/preferences
 */
let getUserPreferences = async (req, res, next) => {
  try {
    console.log('\n🟢 Controller: getUserPreferences called');
    
    const summary = await userPreferenceService.getPreferenceSummary(req.user.id);
    sendSuccess(res, 200, summary);
    
    console.log('   ✅ Preferences sent\n');
    
  } catch (error) {
    console.error('   ❌ Controller error:', error.message);
    next(error);
  }
};

/**
 * POST /api/preferences/track-search
 */
let trackSearch = async (req, res, next) => {
  try {
    const { query, category, location } = req.body;
    await userPreferenceService.trackSearch(req.user.id, {
      query,
      category,
      location
    });
    sendSuccess(res, 200, null, 'Search tracked');
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/preferences/rating-threshold
 */
let updateRatingThreshold = async (req, res, next) => {
  try {
    const { threshold } = req.body;
    const pref = await userPreferenceService.updateRatingThreshold(
      req.user.id,
      threshold
    );
    sendSuccess(res, 200, pref, 'Rating threshold updated');
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/preferences
 */
let resetPreferences = async (req, res, next) => {
  try {
    await userPreferenceService.resetPreferences(req.user.id);
    sendSuccess(res, 200, null, 'Preferences reset successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRecommendations,
  getDayPlans,
  getUserPreferences,
  trackSearch,
  updateRatingThreshold,
  resetPreferences
};