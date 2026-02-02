// routes/recommendation.routes.js
let express = require('express');
let router = express.Router();
let recommendationController = require('../controllers/recommendation.controller');
let { authenticate } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);

// Recommendation routes
router.get('/trips/:tripId/recommendations', recommendationController.getRecommendations);

// User preference routes
router.get('/preferences', recommendationController.getUserPreferences);
router.post('/preferences/track-search', recommendationController.trackSearch);
router.put('/preferences/rating-threshold', recommendationController.updateRatingThreshold);
router.delete('/preferences', recommendationController.resetPreferences);

module.exports = router;
