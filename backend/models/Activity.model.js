const mongoose = require('mongoose')
let ACTIVITY_TYPES = [
  'flight',
  'accommodation',
  'restaurant',
  'attraction',
  'transport',
  'shopping',
  'entertainment',
  'other',
]
let ACTIVITY_STATUS = ['planned', 'confirmed', 'completed', 'cancelled']
let PRIORITY_LEVELS = ['low', 'medium', 'high']

//Activity Schema 
let activitySchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
      index: true,
    },

    // User who created / owns the activity
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    //Optional reference to a saved place
    placeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Place',
    },

    //Activity title
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 200,
    },

    //Optional activity description
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },

    //Type of activity
    type: {
      type: String,
      enum: ACTIVITY_TYPES,
      required: true,
      default: 'other',
    },

    //Activity start time
    startTime: {
      type: Date,
      required: true,
    },

    //Activity end time
     //Must always be after startTime
    endTime: {
      type: Date,
      validate: {
        validator: function (value) {
          return !value || value > this.startTime
        },
        message: 'End time must be after start time',
      },
    },

    //Current status of the activity
    status: {
      type: String,
      enum: ACTIVITY_STATUS,
      default: 'planned',
      index: true,
    },

    //Priority level of the activity
    priority: {
      type: String,
      enum: PRIORITY_LEVELS,
      default: 'medium',
    },

    //Cost details
    cost: {
      type: Number,
      min: 0,
      default: 0,
    },
    currency: {
      type: String,
      default: 'USD',
      trim: true,
    },

    //Booking and reference information
    bookingReference: { type: String, trim: true, default: '' },
    confirmationNumber: { type: String, trim: true, default: '' },
    url: { type: String, trim: true, default: '' },

    /**
     * Additional notes
     */
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    reminders: [
      {
        time: { type: Date, required: true },
        message: { type: String, trim: true, default: '' },
        sent: { type: Boolean, default: false },
      },
    ],
    attendees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

//Indexes 
activitySchema.index({ tripId: 1, startTime: 1 })
activitySchema.index({ userId: 1, status: 1 })

//Virtual Fields 

activitySchema.virtual('duration').get(function () {
  if (!this.startTime || !this.endTime) return null
  return Math.floor((this.endTime - this.startTime) / (1000 * 60))
})

module.exports = mongoose.model('Activity', activitySchema)
