let mongoose = require('mongoose')
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

let activitySchema = new mongoose.Schema(
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
      index: true,
    },
    placeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Place',
    },

    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },

    type: {
      type: String,
      enum: ACTIVITY_TYPES,
      required: true,
      default: 'other',
    },

    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      validate: {
        validator: function (value) {
          return !value || value > this.startTime;
        },
        message: 'End time must be after start time',
      },
    },

    status: {
      type: String,
      enum: ACTIVITY_STATUS,
      default: 'planned',
      index: true,
    },
    priority: {
      type: String,
      enum: PRIORITY_LEVELS,
      default: 'medium',
    },

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

    bookingReference: { type: String, trim: true, default: '' },
    confirmationNumber: { type: String, trim: true, default: '' },
    url: { type: String, trim: true, default: '' },

    documents: [
      {
        name: { type: String, trim: true },
        url: { type: String, trim: true },
        type: { type: String, trim: true },
      },
    ],

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
    toJSON: { virtuals: true },   // include virtuals in API output [web:14][web:75]
    toObject: { virtuals: true }, // include virtuals in toObject() [web:14][web:75]
  }
)

// Compound indexes for common queries
activitySchema.index({ tripId: 1, startTime: 1 })
activitySchema.index({ userId: 1, status: 1 })

// Virtual: duration (minutes)
activitySchema.virtual('duration').get(function () {
  if (!this.startTime || !this.endTime) return null
  return Math.floor((this.endTime - this.startTime) / (1000 * 60))
})

module.exports = mongoose.model('Activity', activitySchema)
