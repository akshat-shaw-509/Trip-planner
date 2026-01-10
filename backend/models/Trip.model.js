let mongoose = require('mongoose');

let tripSchema = new mongoose.Schema(
  {
     userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Trip title is required'],
      trim: true,
      minlength: [3, 'Trip title must be at least 3 characters long'],
      maxlength: [100, 'Trip title cannot exceed 100 characters']
    },
     description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: ''
    },
    destination: {
      type: String,
      required: [true, 'Destination is required'],
      trim: true,
      minlength: [2, 'Destination must be at least 2 characters long'],
      maxlength: [100, 'Destination cannot exceed 100 characters']
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    budget: {
      type: Number,
      min: [0, 'Budget cannot be negative'],
      default: 0
    },
    travelers: {
      type: Number,
      min: [1, 'Number of travelers must be at least 1'],
      default: 1
    },
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
    isPublic: {
      type: Boolean,
      default: false
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function(doc, ret) {
        delete ret.__v;
        return ret;
      }
    },
  }
);

// Indexes for better query performance
tripSchema.index({ userId: 1, createdAt: -1 }); // List all user trips newest first
tripSchema.index({ userId: 1, status: 1 }); // Filter by status per user 

tripSchema.pre('validate', function(next) {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    next(new Error('End date must be after start date'))
  } else {
    next()
  }
})

// Virtual property: trip duration in days
tripSchema.virtual('duration').get(function() {
  if (!this.startDate || !this.endDate) {
    return 0
  }
  let diffTime = Math.abs(this.endDate - this.startDate)
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
})

// Virtual property: check if trip is upcoming
tripSchema.virtual('isUpcoming').get(function() {
  return this.startDate > new Date() && this.status !== 'cancelled'
})

// Virtual property: check if trip is active/ongoing
tripSchema.virtual('isActive').get(function() {
  return this.startDate <= new Date() && this.endDate >= new Date() && this.status === 'ongoing'
})

// Virtual property: check if trip is past
tripSchema.virtual('isPast').get(function() {
  return this.endDate < new Date() || this.status === 'completed'
})

// Instance method: Get trip summary
tripSchema.methods.getSummary = function() {
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
    }
  }
}

// Static method: Find trips by user ID
tripSchema.statics.findByUserId = function(userId) {
  return this.find({ userId }).sort('-createdAt')
}

// Static method: Find trips by status for a user
tripSchema.statics.findByUserIdAndStatus = function(userId, status) {
  return this.find({ userId, status }).sort('-createdAt')
}

let Trip = mongoose.model('Trip', tripSchema);

module.exports = Trip;