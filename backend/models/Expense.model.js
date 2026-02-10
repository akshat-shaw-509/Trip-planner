const mongoose = require('mongoose')
const EXPENSE_CATEGORIES = [
  'accommodation',
  'food',
  'transport',
  'activities',
  'shopping',
  'entertainment',
  'miscellaneous',
]
const PAYMENT_METHODS = [
  'cash',
  'credit_card',
  'debit_card',
  'upi',
  'wallet',
  'net_banking',
  'other',
]

//Expense Schema
//Tracks spending during a trip
const expenseSchema = new mongoose.Schema(
  {
    // Reference to parent trip
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: [true, 'Trip ID is required'],
      index: true,
    },   
    // User who created the expense
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    // Optional link to an activity
    activityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Activity',
    },
    // Expense description
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [3, 'Description must be at least 3 characters'],
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    // Expense amount
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    /
    // Expense category
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: EXPENSE_CATEGORIES,
        message: '{VALUE} is not a valid category'
      },
      lowercase: true,
    },
    // Payment method used
    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required'],
      enum: {
        values: PAYMENT_METHODS,
        message: '{VALUE} is not a valid payment method'
      },
      lowercase: true,
    },
    // Date of expense
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now,
    },
    // Person who paid
    paidBy: {
      type: String,
      trim: true,
      maxlength: [200, 'Paid by cannot exceed 200 characters'],
    },
    // Additional notes
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
  }
)
// Indexes for performance
expenseSchema.index({ tripId: 1, date: -1 })
expenseSchema.index({ userId: 1, category: 1 })
expenseSchema.index({ tripId: 1, category: 1 })
// Get total expenses for a trip
expenseSchema.statics.getTotalByTrip = async function(tripId) {
  const result = await this.aggregate([
    { $match: { tripId: mongoose.Types.ObjectId(tripId) } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ])
  return result.length > 0 ? result[0].total : 0
}

// Get expenses grouped by category
expenseSchema.statics.getByCategory = async function(tripId) {
  return this.aggregate([
    { $match: { tripId: mongoose.Types.ObjectId(tripId) } },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    { $sort: { total: -1 } }
  ])
}

module.exports = mongoose.model('Expense', expenseSchema)
