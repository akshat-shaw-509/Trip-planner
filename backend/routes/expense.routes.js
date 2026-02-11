let express = require('express')
let router = express.Router()
let expenseController = require('../controllers/expense.controller')
let { authenticate } = require('../middleware/auth.middleware')
let { 
  validateExpense, 
  validateExpenseUpdate 
} = require('../middleware/expense.validation.middleware')

router.use(authenticate)
// routes are mounted at /api/expenses
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
//create a new expense under a trip
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
//get total summary for a trip
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
// group expenses by category
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
// get a single expense
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
// update an expense
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
// delete an expense
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

module.exports = router
