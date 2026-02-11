const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activity.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { 
  validateActivity, 
  validateActivityUpdate 
} = require('../middleware/activity.validation.middleware');

router.use(authenticate);

// Create a new activity
router.post(
  '/trips/:tripId/activities',
  validateActivity,
  activityController.createActivity
);

// Get all activities for a trip
router.get(
  '/trips/:tripId/activities',
  activityController.getActivitiesByTrip
);

// Get activities by date
router.get(
  '/trips/:tripId/activities/by-date',
  activityController.getActivitiesByDate
);

// Get single activity
router.get(
  '/:activityId',
  activityController.getActivityById
);

// Update activity
router.put(
  '/:activityId',
  validateActivityUpdate,
  activityController.updateActivity
);

// Update activity status
router.patch(
  '/:activityId/status',
  activityController.updateActivityStatus
);

// Delete activity
router.delete(
  '/:activityId',
  activityController.deleteActivity
);

module.exports = router;
