<<<<<<< HEAD
let mongoose = require('mongoose')

/**
 * -------------------- Trip Schema --------------------
 */
let tripSchema = new mongoose.Schema(
  {
    /**
     * User who owns the trip
     */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    /**
     * Trip title
     */
    title: {
      type: String,
      required: [true, 'Trip title is required'],
      trim: true,
      minlength: [3, 'Trip title must be at least 3 characters long'],
      maxlength: [100, 'Trip title cannot exceed 100 characters']
    },

    /**
     * Optional trip description
     */
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: ''
    },

    /**
     * Trip destination
     */
    destination: {
      type: String,
      required: [true, 'Destination is required'],
      trim: true,
      minlength: [2, 'Destination must be at least 2 characters long'],
      maxlength: [100, 'Destination cannot exceed 100 characters']
    },

    /**
     * Trip start date
     */
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },

    /**
     * Trip end date
     */
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },

    /**
     * Estimated trip budget
     */
    budget: {
      type: Number,
      min: [0, 'Budget cannot be negative'],
      default: 0
    },

    /**
     * Number of travelers
     */
    travelers: {
      type: Number,
      min: [1, 'Number of travelers must be at least 1'],
      default: 1
    },

    /**
     * Current trip status
     */
    status: {
      type: String,
      lowercase: true,
      trim: true,
      default: 'planning',
      enum: {
        values: ['planning', 'booked', 'ongoing', 'completed', 'cancelled'],
        message: '{VALUE} is not a valid trip status'
      }
    },

    /**
     * Visibility flag
     */
    isPublic: {
      type: Boolean,
      default: false
    },

    /**
     * Trip cover image URL
     */
    coverImage: {
      type: String,
      default: null,
      trim: true
    },

    /**
     * Optional tags for filtering and grouping
     */
    tags: {
      type: [String],
      default: []
    }
  },
  {
    // Automatically manage createdAt & updatedAt fields
    timestamps: true,

    // Customize JSON output
    toJSON: {
      transform: function (doc, ret) {
        // Remove internal version key
        delete ret.__v
        return ret
      }
    },
  }
)

/**
 * -------------------- Indexes --------------------
 */

// Optimize queries by user and creation time
tripSchema.index({ userId: 1, createdAt: -1 })

// Optimize queries by user and status
tripSchema.index({ userId: 1, status: 1 })

/**
 * -------------------- Schema Hooks --------------------
 */

// Ensure endDate is always after startDate
tripSchema.pre('validate', async function () {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    throw new Error('End date must be after start date')
  }
})

/**
 * -------------------- Virtual Fields --------------------
 */

/**
 * Virtual: trip duration (in days)
 */
tripSchema.virtual('duration').get(function () {
  if (!this.startDate || !this.endDate) {
    return 0
  }

  let diffTime = Math.abs(this.endDate - this.startDate)
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
})

/**
 * Virtual: check if trip is upcoming
 */
tripSchema.virtual('isUpcoming').get(function () {
  return this.startDate > new Date() && this.status !== 'cancelled'
})

/**
 * Virtual: check if trip is currently active
 */
tripSchema.virtual('isActive').get(function () {
  return (
    this.startDate <= new Date() &&
    this.endDate >= new Date() &&
    this.status === 'ongoing'
  )
})

/**
 * Virtual: check if trip is past
 */
tripSchema.virtual('isPast').get(function () {
  return this.endDate < new Date() || this.status === 'completed'
})

/**
 * -------------------- Instance Methods --------------------
 */

/**
 * Returns a compact summary of the trip
 */
tripSchema.methods.getSummary = function () {
  return {
    id: this._id,
    title: this.title,
    destination: this.destination,
    dates: {
      start: this.startDate,
      end: this.endDate,
      duration: this.duration
    },
    status: this.status,
    travelers: this.travelers,
    budget: {
      amount: this.budget,
    },
    coverImage: this.coverImage
  }
}

/**
 * -------------------- Static Methods --------------------
 */

/**
 * Find all trips for a user (newest first)
 */
tripSchema.statics.findByUserId = function (userId) {
  return this.find({ userId }).sort('-createdAt')
}

/**
 * Find trips for a user filtered by status
 */
tripSchema.statics.findByUserIdAndStatus = function (userId, status) {
  return this.find({ userId, status }).sort('-createdAt')
}

/**
 * Create and export Trip model
 */
let Trip = mongoose.model('Trip', tripSchema)
module.exports = Trip
=======
let mongoose = require('mongoose')

/**
 * -------------------- Trip Schema --------------------
 */
let tripSchema = new mongoose.Schema(
  {
    /**
     * User who owns the trip
     */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    /**
     * Trip title
     */
    title: {
      type: String,
      required: [true, 'Trip title is required'],
      trim: true,
      minlength: [3, 'Trip title must be at least 3 characters long'],
      maxlength: [100, 'Trip title cannot exceed 100 characters']
    },

    /**
     * Optional trip description
     */
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: ''
    },

    /**
     * Trip destination
     */
    destination: {
      type: String,
      required: [true, 'Destination is required'],
      trim: true,
      minlength: [2, 'Destination must be at least 2 characters long'],
      maxlength: [100, 'Destination cannot exceed 100 characters']
    },

    /**
     * Trip start date
     */
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },

    /**
     * Trip end date
     */
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },

    /**
     * Estimated trip budget
     */
    budget: {
      type: Number,
      min: [0, 'Budget cannot be negative'],
      default: 0
    },

    /**
     * Number of travelers
     */
    travelers: {
      type: Number,
      min: [1, 'Number of travelers must be at least 1'],
      default: 1
    },

    /**
     * Current trip status
     */
    status: {
      type: String,
      lowercase: true,
      trim: true,
      default: 'planning',
      enum: {
        values: ['planning', 'booked', 'ongoing', 'completed', 'cancelled'],
        message: '{VALUE} is not a valid trip status'
      }
    },

    /**
     * Visibility flag
     */
    isPublic: {
      type: Boolean,
      default: false
    },

    /**
     * Trip cover image URL
     */
    coverImage: {
      type: String,
      default: null,
      trim: true
    },

    /**
     * Optional tags for filtering and grouping
     */
    tags: {
      type: [String],
      default: []
    }
  },
  {
    // Automatically manage createdAt & updatedAt fields
    timestamps: true,

    // Customize JSON output
    toJSON: {
      transform: function (doc, ret) {
        // Remove internal version key
        delete ret.__v
        return ret
      }
    },
  }
)

/**
 * -------------------- Indexes --------------------
 */

// Optimize queries by user and creation time
tripSchema.index({ userId: 1, createdAt: -1 })

// Optimize queries by user and status
tripSchema.index({ userId: 1, status: 1 })

/**
 * -------------------- Schema Hooks --------------------
 */

// Ensure endDate is always after startDate
tripSchema.pre('validate', async function () {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    throw new Error('End date must be after start date')
  }
})

/**
 * -------------------- Virtual Fields --------------------
 */

/**
 * Virtual: trip duration (in days)
 */
tripSchema.virtual('duration').get(function () {
  if (!this.startDate || !this.endDate) {
    return 0
  }

  let diffTime = Math.abs(this.endDate - this.startDate)
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
})

/**
 * Virtual: check if trip is upcoming
 */
tripSchema.virtual('isUpcoming').get(function () {
  return this.startDate > new Date() && this.status !== 'cancelled'
})

/**
 * Virtual: check if trip is currently active
 */
tripSchema.virtual('isActive').get(function () {
  return (
    this.startDate <= new Date() &&
    this.endDate >= new Date() &&
    this.status === 'ongoing'
  )
})

/**
 * Virtual: check if trip is past
 */
tripSchema.virtual('isPast').get(function () {
  return this.endDate < new Date() || this.status === 'completed'
})

/**
 * -------------------- Instance Methods --------------------
 */

/**
 * Returns a compact summary of the trip
 */
tripSchema.methods.getSummary = function () {
  return {
    id: this._id,
    title: this.title,
    destination: this.destination,
    dates: {
      start: this.startDate,
      end: this.endDate,
      duration: this.duration
    },
    status: this.status,
    travelers: this.travelers,
    budget: {
      amount: this.budget,
    },
    coverImage: this.coverImage
  }
}

/**
 * -------------------- Static Methods --------------------
 */

/**
 * Find all trips for a user (newest first)
 */
tripSchema.statics.findByUserId = function (userId) {
  return this.find({ userId }).sort('-createdAt')
}

/**
 * Find trips for a user filtered by status
 */
tripSchema.statics.findByUserIdAndStatus = function (userId, status) {
  return this.find({ userId, status }).sort('-createdAt')
}

/**
 * Create and export Trip model
 */
let Trip = mongoose.model('Trip', tripSchema)
module.exports = Trip
>>>>>>> 0007615a5a7317e8689fc9727726ee86c5585786
