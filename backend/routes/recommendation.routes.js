<<<<<<< HEAD
// routes/recommendation.routes.js
let express = require('express');
let router = express.Router();
let recommendationController = require('../controllers/recommendation.controller');
let { authenticate } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);

// Recommendation routes
router.get('/trips/:tripId/recommendations', recommendationController.getRecommendations);
router.get('/trips/:tripId/day-plans', recommendationController.getDayPlans);

// User preference routes
router.get('/preferences', recommendationController.getUserPreferences);
router.post('/preferences/track-search', recommendationController.trackSearch);
router.put('/preferences/rating-threshold', recommendationController.updateRatingThreshold);
router.delete('/preferences', recommendationController.resetPreferences);

=======
// routes/recommendation.routes.js
let express = require('express');
let router = express.Router();
let recommendationController = require('../controllers/recommendation.controller');
let { authenticate } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);

// Recommendation routes
router.get('/trips/:tripId/recommendations', recommendationController.getRecommendations);
router.get('/trips/:tripId/day-plans', recommendationController.getDayPlans);

// User preference routes
router.get('/preferences', recommendationController.getUserPreferences);
router.post('/preferences/track-search', recommendationController.trackSearch);
router.put('/preferences/rating-threshold', recommendationController.updateRatingThreshold);
router.delete('/preferences', recommendationController.resetPreferences);

>>>>>>> 0007615a5a7317e8689fc9727726ee86c5585786
module.exports = router;