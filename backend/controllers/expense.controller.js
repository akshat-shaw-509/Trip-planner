<<<<<<< HEAD
const expenseService = require('../services/expense.service')

/**
 * Standard success response helper
 */
const sendSuccess = (res, statusCode, data = null, message = null, extra = {}) => {
  const response = { success: true }
  if (data) response.data = data
  if (message) response.message = message
  Object.assign(response, extra)
  res.status(statusCode).json(response)
}

/**
 * Standard error response helper
 */
const sendError = (res, statusCode, message) => {
  res.status(statusCode).json({ success: false, message })
}

/**
 * Create a new expense for a trip
 * POST /api/trips/:tripId/expenses
 */
const createExpense = async (req, res) => {
  const expense = await expenseService.createExpense(
    req.params.tripId,
    req.body,
    req.user.id
  )

  sendSuccess(res, 201, expense, 'Expense created successfully')
}

/**
 * Get all expenses for a trip (with optional filters)
 * GET /api/trips/:tripId/expenses
 */
const getExpensesByTrip = async (req, res) => {
  const filters = {
    category: req.query.category,
    paymentMethod: req.query.paymentMethod,
    startDate: req.query.startDate,
    endDate: req.query.endDate
  }

  const expenses = await expenseService.getExpensesByTrip(
    req.params.tripId,
    req.user.id,
    filters
  )

  sendSuccess(res, 200, expenses, null, { count: expenses.length })
}

/**
 * Get single expense by ID
 * GET /api/expenses/:expenseId
 */
const getExpenseById = async (req, res) => {
  const expense = await expenseService.getExpenseById(
    req.params.expenseId,
    req.user.id
  )

  sendSuccess(res, 200, expense)
}

/**
 * Update an existing expense
 * PUT /api/expenses/:expenseId
 */
const updateExpense = async (req, res) => {
  const expense = await expenseService.updateExpense(
    req.params.expenseId,
    req.body,
    req.user.id
  )

  sendSuccess(res, 200, expense, 'Expense updated successfully')
}

/**
 * Delete an expense
 * DELETE /api/expenses/:expenseId
 */
const deleteExpense = async (req, res) => {
  const result = await expenseService.deleteExpense(
    req.params.expenseId,
    req.user.id
  )

  sendSuccess(res, 200, null, result.message)
}

/**
 * Get summarized expense data for a trip
 * (total spent, category breakdown, etc.)
 * GET /api/trips/:tripId/expenses/summary
 */
const getTripExpenseSummary = async (req, res) => {
  const summary = await expenseService.getTripExpenseSummary(
    req.params.tripId,
    req.user.id
  )

  sendSuccess(res, 200, summary)
}

/**
 * Get expenses grouped by category
 * GET /api/trips/:tripId/expenses/category
 */
const getExpensesByCategory = async (req, res) => {
  const expenses = await expenseService.getExpensesByCategory(
    req.params.tripId,
    req.user.id
  )

  sendSuccess(res, 200, expenses)
}

/**
 * Attach receipt URL to an expense
 * POST /api/expenses/:expenseId/receipt
 */
const attachReceipt = async (req, res) => {
  if (!req.body.receiptUrl) {
    return sendError(res, 400, 'Receipt URL required')
  }

  const expense = await expenseService.attachReceipt(
    req.params.expenseId,
    req.body.receiptUrl,
    req.user.id
  )

  sendSuccess(res, 200, expense, 'Receipt attached successfully')
}

module.exports = {
  createExpense,
  getExpensesByTrip,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getTripExpenseSummary,
  getExpensesByCategory,
  attachReceipt
}
=======
const expenseService = require('../services/expense.service')

/**
 * Standard success response helper
 */
const sendSuccess = (res, statusCode, data = null, message = null, extra = {}) => {
  const response = { success: true }
  if (data) response.data = data
  if (message) response.message = message
  Object.assign(response, extra)
  res.status(statusCode).json(response)
}

/**
 * Standard error response helper
 */
const sendError = (res, statusCode, message) => {
  res.status(statusCode).json({ success: false, message })
}

/**
 * Create a new expense for a trip
 * POST /api/trips/:tripId/expenses
 */
const createExpense = async (req, res) => {
  const expense = await expenseService.createExpense(
    req.params.tripId,
    req.body,
    req.user.id
  )

  sendSuccess(res, 201, expense, 'Expense created successfully')
}

/**
 * Get all expenses for a trip (with optional filters)
 * GET /api/trips/:tripId/expenses
 */
const getExpensesByTrip = async (req, res) => {
  const filters = {
    category: req.query.category,
    paymentMethod: req.query.paymentMethod,
    startDate: req.query.startDate,
    endDate: req.query.endDate
  }

  const expenses = await expenseService.getExpensesByTrip(
    req.params.tripId,
    req.user.id,
    filters
  )

  sendSuccess(res, 200, expenses, null, { count: expenses.length })
}

/**
 * Get single expense by ID
 * GET /api/expenses/:expenseId
 */
const getExpenseById = async (req, res) => {
  const expense = await expenseService.getExpenseById(
    req.params.expenseId,
    req.user.id
  )

  sendSuccess(res, 200, expense)
}

/**
 * Update an existing expense
 * PUT /api/expenses/:expenseId
 */
const updateExpense = async (req, res) => {
  const expense = await expenseService.updateExpense(
    req.params.expenseId,
    req.body,
    req.user.id
  )

  sendSuccess(res, 200, expense, 'Expense updated successfully')
}

/**
 * Delete an expense
 * DELETE /api/expenses/:expenseId
 */
const deleteExpense = async (req, res) => {
  const result = await expenseService.deleteExpense(
    req.params.expenseId,
    req.user.id
  )

  sendSuccess(res, 200, null, result.message)
}

/**
 * Get summarized expense data for a trip
 * (total spent, category breakdown, etc.)
 * GET /api/trips/:tripId/expenses/summary
 */
const getTripExpenseSummary = async (req, res) => {
  const summary = await expenseService.getTripExpenseSummary(
    req.params.tripId,
    req.user.id
  )

  sendSuccess(res, 200, summary)
}

/**
 * Get expenses grouped by category
 * GET /api/trips/:tripId/expenses/category
 */
const getExpensesByCategory = async (req, res) => {
  const expenses = await expenseService.getExpensesByCategory(
    req.params.tripId,
    req.user.id
  )

  sendSuccess(res, 200, expenses)
}

/**
 * Attach receipt URL to an expense
 * POST /api/expenses/:expenseId/receipt
 */
const attachReceipt = async (req, res) => {
  if (!req.body.receiptUrl) {
    return sendError(res, 400, 'Receipt URL required')
  }

  const expense = await expenseService.attachReceipt(
    req.params.expenseId,
    req.body.receiptUrl,
    req.user.id
  )

  sendSuccess(res, 200, expense, 'Receipt attached successfully')
}

module.exports = {
  createExpense,
  getExpensesByTrip,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getTripExpenseSummary,
  getExpensesByCategory,
  attachReceipt
}
>>>>>>> 0007615a5a7317e8689fc9727726ee86c5585786
