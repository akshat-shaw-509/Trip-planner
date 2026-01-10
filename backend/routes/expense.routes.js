let express = require('express')
let router = express.Router()
let expenseController = require('../controllers/expense.controller')
let { authenticate } = require('../middleware/auth.middleware')
let { 
  validateExpense, 
  validateExpenseUpdate 
} = require('../middleware/expense.validation.middleware')

router.use(authenticate)

router.post(
  '/trips/:tripId/expenses',
  validateExpense,
  expenseController.createExpense
)

router.get(
  '/trips/:tripId/expenses',
  expenseController.getExpensesByTrip
)

router.get(
  '/trips/:tripId/expenses/summary',
  expenseController.getTripExpenseSummary
)

router.get(
  '/trips/:tripId/expenses/by-category',
  expenseController.getExpensesByCategory
)

router.get(
  '/:expenseId',
  expenseController.getExpenseById
)

router.put(
  '/:expenseId',
  validateExpenseUpdate,
  expenseController.updateExpense
)

router.patch(
  '/:expenseId/receipt',
  expenseController.attachReceipt
)

router.delete(
  '/:expenseId',
  expenseController.deleteExpense
)

module.exports = router