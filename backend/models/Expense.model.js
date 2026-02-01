const mongoose = require('mongoose')

//Expense Schema 
let expenseSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
      index: true,
    },
    //User who created / owns the expense
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    activityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Activity',
    },

    //Description of the expense
    description: {
      type: String,
      required: [true, 'Expense description is required'],
      trim: true,
      minlength: [3, 'Description must be at least 3 characters'],
      maxlength: [500, 'Description must not exceed 500 characters'],
    },

    //Expense amount
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },

    //Expense category
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

    //Payment method used
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

    //Date when the expense occurred
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

    // Optional notes about the expense
    notes: {
      type: String,
      maxlength: [1000, 'Notes must not exceed 1000 characters'],
    },

    //Optional tags for filtering and grouping
    tags: [
      {
        type: String,
        trim: true,
      },
    ],

    // Expense split details
     // Used when an expense is shared among multiple users
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

expenseSchema.index({ tripId: 1, date: -1 })

expenseSchema.index({ userId: 1, category: 1 })

expenseSchema.index({ tripId: 1, category: 1 })

const Expense = mongoose.model('Expense', expenseSchema)

module.exports = Expense

