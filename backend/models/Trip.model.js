const mongoose = require('mongoose')
const TRIP_STATUS = ['planning', 'booked', 'upcoming', 'ongoing', 'completed', 'cancelled'
/**
 * Trip Schema
 * Represents a travel itinerary
 */
const tripSchema = new mongoose.Schema(
  {
    // User who owns the trip
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    // Trip title
    title: {
      type: String,
      required: [true, 'Trip title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    // Trip description
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: '',
    },
    // Destination (city/region name)
    destination: {
      type: String,
      required: [true, 'Destination is required'],
      trim: true,
      minlength: [2, 'Destination must be at least 2 characters'],
      maxlength: [200, 'Destination cannot exceed 200 characters'],
    },
    //Country name
    country: {
      type: String,
      trim: true,
      maxlength: [100, 'Country cannot exceed 100 characters'],
    },
    // Destination coordinates [longitude, latitude]
    destinationCoords: {
      type: [Number],
      validate: {
        validator: function (coords) {
          if (!coords || coords.length === 0) return true
          if (coords.length !== 2) return false
          const [lng, lat] = coords
          return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90
        },
        message: 'Destination coordinates must be [longitude, latitude]',
      },
    },
    // Trip start date
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    // Trip end date
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    // Estimated budget
    budget: {
      type: Number,
      min: [0, 'Budget cannot be negative'],
      default: 0,
    },
    // Currency code
    currency: {
      type: String,
      default: 'INR',
      trim: true,
      uppercase: true,
      maxlength: 3,
    },
    // Number of travelers
    travelers: {
      type: Number,
      min: [1, 'Number of travelers must be at least 1'],
      default: 1,
    },
    // Current trip status
    status: {
      type: String,
      enum: {
        values: TRIP_STATUS,
        message: '{VALUE} is not a valid trip status',
      },
      default: 'planning',
      lowercase: true,
      index: true,
    },
    // Cover/banner image URL
    coverImage: {
      type: String,
      default: null,
      trim: true,
    },
    // Trip tags for categorization
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: function(tags) {
          return tags.every(tag => tag.length <= 50)
        },
        message: 'Each tag must be 50 characters or less'
      }
    },
    // Public/private flag (for future sharing features)
    isPublic: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.__v
        return ret
      },
    },
  }
)
// Indexes for performance
tripSchema.index({ userId: 1, createdAt: -1 })
tripSchema.index({ userId: 1, status: 1 })
tripSchema.index({ userId: 1, startDate: 1 })
// Pre-save validation hook
tripSchema.pre('save', function (next) {
  // Validate date range
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    return next(new Error('End date must be after start date'))
  }
  next()
})
// Virtual: Calculate trip duration in days
tripSchema.virtual('duration').get(function () {
  if (!this.startDate || !this.endDate) return 0
  const diffTime = Math.abs(this.endDate - this.startDate)
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
})
// Virtual: Check if trip is upcoming
tripSchema.virtual('isUpcoming').get(function () {
  const now = new Date()
  return this.startDate > now && this.status !== 'cancelled'
})
// Virtual: Check if trip is currently active
tripSchema.virtual('isActive').get(function () {
  const now = new Date()
  return (
    this.startDate <= now &&
    this.endDate >= now &&
    this.status === 'ongoing'
  )
})
// Virtual: Check if trip is past
tripSchema.virtual('isPast').get(function () {
  const now = new Date()
  return this.endDate < now || this.status === 'completed'
})
// Instance method: Get trip summary
tripSchema.methods.getSummary = function () {
  return {
    id: this._id,
    title: this.title,
    destination: this.destination,
    country: this.country,
    destinationCoords: this.destinationCoords,
    dates: {
      start: this.startDate,
      end: this.endDate,
      duration: this.duration,
    },
    status: this.status,
    travelers: this.travelers,
    budget: this.budget,
    currency: this.currency,
    coverImage: this.coverImage,
  }
}
// Static method: Find trips by user
tripSchema.statics.findByUserId = function (userId) {
  return this.find({ userId }).sort('-createdAt')
}
// Static method: Find trips by user and status
tripSchema.statics.findByUserIdAndStatus = function (userId, status) {
  return this.find({ userId, status }).sort('-createdAt')
}

module.exports = mongoose.model('Trip', tripSchema)
