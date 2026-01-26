<<<<<<< HEAD
let express = require('express')
let router = express.Router()
let expenseController = require('../controllers/expense.controller')
let { authenticate } = require('../middleware/auth.middleware')
let { 
  validateExpense, 
  validateExpenseUpdate 
} = require('../middleware/expense.validation.middleware')

// All routes require authentication
router.use(authenticate)

// IMPORTANT: These routes expect to be mounted at /api/expenses
// So /api/expenses/trips/:tripId/expenses becomes the full path

router.post(
  '/trips/:tripId/expenses',
  validateExpense,
  async (req, res, next) => {
    try {
      await expenseController.createExpense(req, res)
    } catch (error) {
      next(error)
    }
  }
)

router.get(
  '/trips/:tripId/expenses',
  async (req, res, next) => {
    try {
      await expenseController.getExpensesByTrip(req, res)
    } catch (error) {
      next(error)
    }
  }
)

router.get(
  '/trips/:tripId/expenses/summary',
  async (req, res, next) => {
    try {
      await expenseController.getTripExpenseSummary(req, res)
    } catch (error) {
      next(error)
    }
  }
)

router.get(
  '/trips/:tripId/expenses/by-category',
  async (req, res, next) => {
    try {
      await expenseController.getExpensesByCategory(req, res)
    } catch (error) {
      next(error)
    }
  }
)

router.get(
  '/:expenseId',
  async (req, res, next) => {
    try {
      await expenseController.getExpenseById(req, res)
    } catch (error) {
      next(error)
    }
  }
)

router.put(
  '/:expenseId',
  validateExpenseUpdate,
  async (req, res, next) => {
    try {
      await expenseController.updateExpense(req, res)
    } catch (error) {
      next(error)
    }
  }
)

router.patch(
  '/:expenseId/receipt',
  async (req, res, next) => {
    try {
      await expenseController.attachReceipt(req, res)
    } catch (error) {
      next(error)
    }
  }
)

router.delete(
  '/:expenseId',
  async (req, res, next) => {
    try {
      await expenseController.deleteExpense(req, res)
    } catch (error) {
      next(error)
    }
  }
)

=======
let express = require('express')
let router = express.Router()
let expenseController = require('../controllers/expense.controller')
let { authenticate } = require('../middleware/auth.middleware')
let { 
  validateExpense, 
  validateExpenseUpdate 
} = require('../middleware/expense.validation.middleware')

// All routes require authentication
router.use(authenticate)

// IMPORTANT: These routes expect to be mounted at /api/expenses
// So /api/expenses/trips/:tripId/expenses becomes the full path

router.post(
  '/trips/:tripId/expenses',
  validateExpense,
  async (req, res, next) => {
    try {
      await expenseController.createExpense(req, res)
    } catch (error) {
      next(error)
    }
  }
)

router.get(
  '/trips/:tripId/expenses',
  async (req, res, next) => {
    try {
      await expenseController.getExpensesByTrip(req, res)
    } catch (error) {
      next(error)
    }
  }
)

router.get(
  '/trips/:tripId/expenses/summary',
  async (req, res, next) => {
    try {
      await expenseController.getTripExpenseSummary(req, res)
    } catch (error) {
      next(error)
    }
  }
)

router.get(
  '/trips/:tripId/expenses/by-category',
  async (req, res, next) => {
    try {
      await expenseController.getExpensesByCategory(req, res)
    } catch (error) {
      next(error)
    }
  }
)

router.get(
  '/:expenseId',
  async (req, res, next) => {
    try {
      await expenseController.getExpenseById(req, res)
    } catch (error) {
      next(error)
    }
  }
)

router.put(
  '/:expenseId',
  validateExpenseUpdate,
  async (req, res, next) => {
    try {
      await expenseController.updateExpense(req, res)
    } catch (error) {
      next(error)
    }
  }
)

router.patch(
  '/:expenseId/receipt',
  async (req, res, next) => {
    try {
      await expenseController.attachReceipt(req, res)
    } catch (error) {
      next(error)
    }
  }
)

router.delete(
  '/:expenseId',
  async (req, res, next) => {
    try {
      await expenseController.deleteExpense(req, res)
    } catch (error) {
      next(error)
    }
  }
)

>>>>>>> 0007615a5a7317e8689fc9727726ee86c5585786
module.exports = router