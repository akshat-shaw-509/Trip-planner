const expenseService = require('../services/expense.service');

// Standardized success response
const sendSuccess = (res, statusCode, data = null, message = null, extra = {}) => {
  const response = { success: true };
  if (data !== null) response.data = data;      // allow [], 0, false
  if (message) response.message = message;
  Object.assign(response, extra);
  return res.status(statusCode).json(response);
};

// Standardized error response (for validation-style early returns)
const sendError = (res, statusCode, message) => {
  return res.status(statusCode).json({ success: false, message });
};

// Wrap async controllers so thrown/rejected errors go to Express error middleware
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next); // common pattern [web:12]

// Create a new expense for a trip
// POST /api/trips/:tripId/expenses
const createExpense = asyncHandler(async (req, res) => {
  const expense = await expenseService.createExpense(
    req.params.tripId,
    req.body,
    req.user.id
  );
  return sendSuccess(res, 201, expense, 'Expense created successfully');
});

// Get all expenses for a trip
// GET /api/trips/:tripId/expenses
const getExpensesByTrip = asyncHandler(async (req, res) => {
  const filters = {
    category: req.query.category || undefined,
    paymentMethod: req.query.paymentMethod || undefined,
    startDate: req.query.startDate || undefined,
    endDate: req.query.endDate || undefined
  };

  const expenses = await expenseService.getExpensesByTrip(
    req.params.tripId,
    req.user.id,
    filters
  );

  return sendSuccess(res, 200, expenses, null, { count: expenses.length });
});

// Get single expense by ID
// GET /api/expenses/:expenseId
const getExpenseById = asyncHandler(async (req, res) => {
  const expense = await expenseService.getExpenseById(
    req.params.expenseId,
    req.user.id
  );
  return sendSuccess(res, 200, expense);
});

// Update an existing expense
// PUT /api/expenses/:expenseId
const updateExpense = asyncHandler(async (req, res) => {
  const expense = await expenseService.updateExpense(
    req.params.expenseId,
    req.body,
    req.user.id
  );
  return sendSuccess(res, 200, expense, 'Expense updated successfully');
});

// Delete an expense
// DELETE /api/expenses/:expenseId
const deleteExpense = asyncHandler(async (req, res) => {
  const result = await expenseService.deleteExpense(
    req.params.expenseId,
    req.user.id
  );
  return sendSuccess(res, 200, null, result?.message || 'Expense deleted');
});

// Get summarized expense data for a trip
// GET /api/trips/:tripId/expenses/summary
const getTripExpenseSummary = asyncHandler(async (req, res) => {
  const summary = await expenseService.getTripExpenseSummary(
    req.params.tripId,
    req.user.id
  );
  return sendSuccess(res, 200, summary);
});

// Get expenses grouped by category
// GET /api/trips/:tripId/expenses/category
const getExpensesByCategory = asyncHandler(async (req, res) => {
  const expenses = await expenseService.getExpensesByCategory(
    req.params.tripId,
    req.user.id
  );
  return sendSuccess(res, 200, expenses);
});

module.exports = {
  createExpense,
  getExpensesByTrip,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getTripExpenseSummary,
  getExpensesByCategory
};
