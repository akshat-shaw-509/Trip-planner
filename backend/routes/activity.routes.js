let express = require('express')
let router = express.Router()
let activityController = require('../controllers/activity.controller')
let { authenticate } = require('../middleware/auth.middleware')
let { 
  validateActivity, 
  validateActivityUpdate 
} = require('../middleware/activity.validation.middleware')


router.use(authenticate)

router.post(
  '/trips/:tripId/activities',
  validateActivity,
  activityController.createActivity
)

router.get(
  '/trips/:tripId/activities',
  activityController.getActivitiesByTrip
)

router.get(
  '/trips/:tripId/activities/by-date',
  activityController.getActivitiesByDate
)

router.get(
  '/:activityId',
  activityController.getActivityById
)

router.put(
  '/:activityId',
  validateActivityUpdate,
  activityController.updateActivity
)

router.patch(
  '/:activityId/status',
  activityController.updateActivityStatus
)

router.delete(
  '/:activityId',
  activityController.deleteActivity
)

module.exports = router
