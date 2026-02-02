let Expense = require('../models/Expense.model')
let Trip = require('../models/Trip.model')

let { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/errors')

/**
 * -------------------- Helper Functions --------------------
 */

/**
 * Verify that the user owns the given trip
 */
let checkTripOwnership = async (tripId, userId) => {
  let trip = await Trip.findById(tripId).lean()

  if (!trip) {
    throw NotFoundError('Trip not found')
  }

  if (trip.userId.toString() !== userId.toString()) {
    throw ForbiddenError('You do not have permission to access this trip')
  }

  return trip
}

/**
 * Verify that the user owns the given expense
 */
let checkExpenseOwnership = async (expenseId, userId) => {
  let expense = await Expense.findById(expenseId).lean()

  if (!expense) {
    throw NotFoundError('Expense not found')
  }

  if (expense.userId.toString() !== userId.toString()) {
    throw ForbiddenError('You do not have permission to access this expense')
  }

  return expense
}

/**
 * -------------------- Service Functions --------------------
 */

/**
 * Create a new expense under a trip
 */
let createExpense = async (tripId, expenseData, userId) => {
  await checkTripOwnership(tripId, userId)

  return Expense.create({
    ...expenseData,
    tripId,
    userId
  })
}

/**
 * Get all expenses for a trip (with optional filters)
 */
let getExpensesByTrip = async (tripId, userId, filters = {}) => {
  await checkTripOwnership(tripId, userId)

  let query = { tripId }

  if (filters.category) {
    query.category = filters.category
  }

  if (filters.startDate || filters.endDate) {
    query.date = {}

    if (filters.startDate) {
      query.date.$gte = new Date(filters.startDate)
    }

    if (filters.endDate) {
      query.date.$lte = new Date(filters.endDate)
    }
  }

  return Expense.find(query)
    .sort({ date: -1 })
    .populate('activityId', 'title')
    .lean()
}

/**
 * Get a single expense by ID
 */
let getExpenseById = async (expenseId, userId) => {
  let expense = await Expense.findById(expenseId)
    .populate('activityId tripId')
    .lean()

  if (!expense) {
    throw NotFoundError('Expense not found')
  }

  if (expense.userId.toString() !== userId.toString()) {
    throw ForbiddenError('You do not have permission to view this expense')
  }

  return expense
}

/**
 * Update an existing expense
 */
let updateExpense = async (expenseId, updateData, userId) => {
  await checkExpenseOwnership(expenseId, userId)

  return Expense.findByIdAndUpdate(
    expenseId,
    { $set: updateData },
    { new: true, runValidators: true }
  ).populate('activityId')
}

/**
 * Delete an expense (hard delete)
 */
let deleteExpense = async (expenseId, userId) => {
  await checkExpenseOwnership(expenseId, userId)

  await Expense.deleteOne({ _id: expenseId })

  return { message: 'Expense deleted successfully' }
}

/**
 * Get summarized expense data for a trip
 */
let getTripExpenseSummary = async (tripId, userId) => {
  let trip = await checkTripOwnership(tripId, userId)

  let expenses = await Expense.find({ tripId }).lean()

  let totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0)

  let byCategory = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount
    return acc
  }, {})

  return {
    totalExpenses: expenses.length,
    totalAmount,
    byCategory,
    budget: trip.budget,
    budgetRemaining: trip.budget ? trip.budget - totalAmount : null,
    budgetPercentUsed: trip.budget
      ? ((totalAmount / trip.budget) * 100).toFixed(2)
      : null
  }
}

/**
 * Get expense statistics grouped by category
 */
let getExpensesByCategory = async (tripId, userId) => {
  await checkTripOwnership(tripId, userId)

  return Expense.aggregate([
    { $match: { tripId } },
    {
      $group: {
        _id: '$category',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
        averageAmount: { $avg: '$amount' }
      }
    },
    { $sort: { totalAmount: -1 } }
  ])
}

module.exports = {
  createExpense,
  getExpensesByTrip,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getTripExpenseSummary,
  getExpensesByCategory
}
