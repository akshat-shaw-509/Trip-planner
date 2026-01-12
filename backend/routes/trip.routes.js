let express = require('express');
let router = express.Router();
let tripController = require('../controllers/trip.controller');
let { authenticate } = require('../middleware/auth.middleware');
let { validateTrip, validateTripUpdate } = require('../middleware/trip.validation.middleware');

router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Route works without auth' })
})
// All routes require authentication
router.use(authenticate);

// Trip CRUD
router.post('/trips', validateTrip, tripController.createTrip);
router.get('/trips', tripController.getUserTrips);
router.get('/trips/upcoming', tripController.getUpcomingTrips);
router.get('/trips/ongoing', tripController.getOngoingTrips);
router.get('/trips/past', tripController.getPastTrips);
router.get('/trips/:tripId', tripController.getTripById);
router.put('/trips/:tripId', validateTripUpdate, tripController.updateTrip);
router.delete('/trips/:tripId', tripController.deleteTrip);
router.patch('/trips/:tripId/status', tripController.updateTripStatus);

// Collaborators
router.post('/trips/:tripId/collaborators', tripController.addCollaborator);
router.delete('/trips/:tripId/collaborators/:collaboratorId', tripController.removeCollaborator);

module.exports = router;