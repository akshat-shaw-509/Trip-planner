<<<<<<< HEAD
let mongoose = require('mongoose')

/**
 * -------------------- Expense Schema --------------------
 */
let expenseSchema = new mongoose.Schema(
  {
    /**
     * Reference to the trip this expense belongs to
     */
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
      index: true,
    },

    /**
     * User who created / owns the expense
     */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    /**
     * Optional reference to an activity
     * Useful for linking expenses to specific trip activities
     */
    activityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Activity',
    },

    /**
     * Short description of the expense
     */
    description: {
      type: String,
      required: [true, 'Expense description is required'],
      trim: true,
      minlength: [3, 'Description must be at least 3 characters'],
      maxlength: [500, 'Description must not exceed 500 characters'],
    },

    /**
     * Expense amount
     */
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },

    /**
     * Currency code (default: USD)
     */
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      default: 'USD',
    },

    /**
     * Expense category
     */
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

    /**
     * Payment method used
     */
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

    /**
     * Date when the expense occurred
     */
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now,
    },

    /**
     * Optional location where the expense was made
     */
    location: {
      type: String,
      trim: true,
    },

    /**
     * Optional vendor / merchant name
     */
    vendor: {
      type: String,
      trim: true,
    },

    /**
     * Receipt URL or file reference
     */
    receipt: {
      type: String,
    },

    /**
     * Optional notes about the expense
     */
    notes: {
      type: String,
      maxlength: [1000, 'Notes must not exceed 1000 characters'],
    },

    /**
     * Optional tags for filtering and grouping
     */
    tags: [
      {
        type: String,
        trim: true,
      },
    ],

    /**
     * Expense split details
     * Used when an expense is shared among multiple users
     */
    splitWith: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        amount: Number,
      },
    ],

    /**
     * Reimbursement flags
     */
    isReimbursable: {
      type: Boolean,
      default: false,
    },
    isReimbursed: {
      type: Boolean,
      default: false,
    },

    /**
     * Soft delete flag
     */
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    // Automatically manage createdAt & updatedAt fields
    timestamps: true,
  }
)

/**
 * -------------------- Indexes --------------------
 */

// Optimize queries by trip and date
expenseSchema.index({ tripId: 1, date: -1 })

// Optimize queries by user and category
expenseSchema.index({ userId: 1, category: 1 })

// Optimize category-based queries within a trip
expenseSchema.index({ tripId: 1, category: 1 })

/**
 * Create and export Expense model
 */
const Expense = mongoose.model('Expense', expenseSchema)

module.exports = Expense
=======
let mongoose = require('mongoose')

/**
 * -------------------- Expense Schema --------------------
 */
let expenseSchema = new mongoose.Schema(
  {
    /**
     * Reference to the trip this expense belongs to
     */
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
      index: true,
    },

    /**
     * User who created / owns the expense
     */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    /**
     * Optional reference to an activity
     * Useful for linking expenses to specific trip activities
     */
    activityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Activity',
    },

    /**
     * Short description of the expense
     */
    description: {
      type: String,
      required: [true, 'Expense description is required'],
      trim: true,
      minlength: [3, 'Description must be at least 3 characters'],
      maxlength: [500, 'Description must not exceed 500 characters'],
    },

    /**
     * Expense amount
     */
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },

    /**
     * Currency code (default: USD)
     */
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      default: 'USD',
    },

    /**
     * Expense category
     */
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

    /**
     * Payment method used
     */
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

    /**
     * Date when the expense occurred
     */
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now,
    },

    /**
     * Optional location where the expense was made
     */
    location: {
      type: String,
      trim: true,
    },

    /**
     * Optional vendor / merchant name
     */
    vendor: {
      type: String,
      trim: true,
    },

    /**
     * Receipt URL or file reference
     */
    receipt: {
      type: String,
    },

    /**
     * Optional notes about the expense
     */
    notes: {
      type: String,
      maxlength: [1000, 'Notes must not exceed 1000 characters'],
    },

    /**
     * Optional tags for filtering and grouping
     */
    tags: [
      {
        type: String,
        trim: true,
      },
    ],

    /**
     * Expense split details
     * Used when an expense is shared among multiple users
     */
    splitWith: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        amount: Number,
      },
    ],

    /**
     * Reimbursement flags
     */
    isReimbursable: {
      type: Boolean,
      default: false,
    },
    isReimbursed: {
      type: Boolean,
      default: false,
    },

    /**
     * Soft delete flag
     */
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    // Automatically manage createdAt & updatedAt fields
    timestamps: true,
  }
)

/**
 * -------------------- Indexes --------------------
 */

// Optimize queries by trip and date
expenseSchema.index({ tripId: 1, date: -1 })

// Optimize queries by user and category
expenseSchema.index({ userId: 1, category: 1 })

// Optimize category-based queries within a trip
expenseSchema.index({ tripId: 1, category: 1 })

/**
 * Create and export Expense model
 */
const Expense = mongoose.model('Expense', expenseSchema)

module.exports = Expense
>>>>>>> 0007615a5a7317e8689fc9727726ee86c5585786
