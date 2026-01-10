let mongoose = require('mongoose')

let expenseSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    activityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Activity',
    },
    description: {
      type: String,
      required: [true, 'Expense description is required'],
      trim: true,
      minlength: [3, 'Description must be at least 3 characters'],
      maxlength: [500, 'Description must not exceed 500 characters'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      default: 'USD',
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'accommodation',
        'food',
        'transport',
        'activities',
        'shopping',
        'entertainment',
        'miscellaneous',
      ],
    },
    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required'],
      enum: [
        'cash',
        'credit_card',
        'debit_card',
        'digital_wallet',
        'bank_transfer',
        'other',
      ],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now,
    },
    location: {
      type: String,
      trim: true,
    },
    vendor: {
      type: String,
      trim: true,
    },
    receipt: {
      type: String,
    },
    notes: {
      type: String,
      maxlength: [1000, 'Notes must not exceed 1000 characters'],
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    splitWith: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        amount: Number,
      },
    ],
    isReimbursable: {
      type: Boolean,
      default: false,
    },
    isReimbursed: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes
expenseSchema.index({ tripId: 1, date: -1 })
expenseSchema.index({ userId: 1, category: 1 })
expenseSchema.index({ tripId: 1, category: 1 })

const Expense = mongoose.model('Expense', expenseSchema)

module.exports = Expense