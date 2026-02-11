let express = require('express');
let router = express.Router();
let recommendationController = require('../controllers/recommendation.controller');
let { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/:tripId', recommendationController.getRecommendations);

// Recommendation routes
router.get('/trips/:tripId/recommendations', recommendationController.getRecommendations);

// User preference routes
router.get('/preferences', recommendationController.getUserPreferences);
router.post('/preferences/track-search', recommendationController.trackSearch);
router.put('/preferences/rating-threshold', recommendationController.updateRatingThreshold);
router.post('/preferences/reset', recommendationController.resetPreferences);

module.exports = router;
