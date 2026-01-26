
let express = require('express')
let router = express.Router()
let activityController = require('../controllers/activity.controller')
let { authenticate } = require('../middleware/auth.middleware')
let { 
  validateActivity, 
  validateActivityUpdate 
} = require('../middleware/activity.validation.middleware')

// All routes require authentication
router.use(authenticate)

router.post(
  '/trips/:tripId/activities',
  validateActivity,
  async (req, res, next) => {
    try {
      await activityController.createActivity(req, res)
    } catch (error) {
      next(error)
    }
  }
)

router.get(
  '/trips/:tripId/activities',
  async (req, res, next) => {
    try {
      await activityController.getActivitiesByTrip(req, res)
    } catch (error) {
      next(error)
    }
  }
)

router.get(
  '/trips/:tripId/activities/by-date',
  async (req, res, next) => {
    try {
      await activityController.getActivitiesByDate(req, res)
    } catch (error) {
      next(error)
    }
  }
)

router.get(
  '/:activityId',
  async (req, res, next) => {
    try {
      await activityController.getActivityById(req, res)
    } catch (error) {
      next(error)
    }
  }
)

router.put(
  '/:activityId',
  validateActivityUpdate,
  async (req, res, next) => {
    try {
      await activityController.updateActivity(req, res)
    } catch (error) {
      next(error)
    }
  }
)

router.patch(
  '/:activityId/status',
  async (req, res, next) => {
    try {
      await activityController.updateActivityStatus(req, res)
    } catch (error) {
      next(error)
    }
  }
)

router.delete(
  '/:activityId',
  async (req, res, next) => {
    try {
      await activityController.deleteActivity(req, res)
    } catch (error) {
      next(error)
    }
  }
)