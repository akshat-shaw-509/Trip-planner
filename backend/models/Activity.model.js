const mongoose = require('mongoose')
const ACTIVITY_TYPES = [
  'flight',
  'accommodation',
  'restaurant',
  'attraction',
  'transport',
  'shopping',
  'entertainment',
  'other',
]
const ACTIVITY_STATUS = ['planned', 'in_progress', 'completed', 'cancelled']

const activitySchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: [true, 'Trip ID is required'],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    placeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Place',
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: '',
    },
    type: {
      type: String,
      enum: {
        values: ACTIVITY_TYPES,
        message: '{VALUE} is not a valid activity type'
      },
      required: [true, 'Activity type is required'],
      default: 'other',
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
    },
    endTime: {
  type: Date,
  validate: {
    validator: function (value) {
      // If either value is missing, skip validation
      if (!value || !this.startTime) return true
      return value > this.startTime
    },
    message: 'End time must be after start time',
  },
},
    status: {
      type: String,
      enum: {
        values: ACTIVITY_STATUS,
        message: '{VALUE} is not a valid status'
      },
      default: 'planned',
      index: true,
    },
    location: {
      type: String,
      trim: true,
      maxlength: [500, 'Location cannot exceed 500 characters'],
    },
    cost: {
      type: Number,
      min: [0, 'Cost cannot be negative'],
      default: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
      uppercase: true,
      maxlength: 3,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

// Indexes for better query performance
activitySchema.index({ tripId: 1, startTime: 1 })
activitySchema.index({ userId: 1, status: 1 })
activitySchema.index({ tripId: 1, status: 1 })

// Virtual: Calculate duration in minutes
activitySchema.virtual('duration').get(function () {
  if (!this.startTime || !this.endTime) return null
  return Math.floor((this.endTime - this.startTime) / (1000 * 60))
})

// Pre-save hook: Validate date logic
activitySchema.pre('save', function () {
  if (this.endTime && this.endTime <= this.startTime) {
    throw new Error('End time must be after start time')
  }
})

module.exports = mongoose.model('Activity', activitySchema)

