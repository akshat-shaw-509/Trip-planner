let mongoose = require('mongoose');

let placeSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: [true, 'Trip ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Place name is required'],
      trim: true,
      maxlength: [200, 'Name must not exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description must not exceed 2000 characters'],
    },
    category: {
      type: String,
      enum: [
        'accommodation',
        'restaurant',
        'attraction',
        'transport',
        'other',
      ],
      default: 'other',
    },
    address: {
      type: String,
      trim: true,
      maxlength: [500, 'Address must not exceed 500 characters']
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        required: [true, 'Coordinates required'],
        validate: {
          validator: function (v) {
            if (!Array.isArray(v) || v.length !== 2) return false
            const [lng, lat] = v
            return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90
          },
          message: 'Coordinates must be [lng, lat]'
        }
      }
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    visitStatus: {
      type: String,
      lowercase: true,
      enum: ['planned', 'visited', 'skipped'],
      default: 'planned',
    },
    visitDate: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes must not exceed 2000 characters'],
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.__v
        return ret;
      }
    }
  }
)

// Geospatial index for location-based queries
placeSchema.index({ location: '2dsphere' })
placeSchema.index({ tripId: 1, createdAt: -1 })
placeSchema.index({ tripId: 1, visitStatus: 1 })

placeSchema.virtual('distanceFromCenter').get(function (centerLngLat) {
  if (!centerLngLat || !this.location?.coordinates) return 0
  const [centerLng, centerLat] = centerLngLat
  const [lng, lat] = this.location.coordinates
  return Math.sqrt(
    Math.pow(lng - centerLng, 2) + Math.pow(lat - centerLat, 2)
  )
})

placeSchema.methods.getSummary = function () {
  return {
    id: this._id,
    name: this.name,
    category: this.category,
    status: this.visitStatus,
    location: this.location,
    rating: this.rating
  }
}

placeSchema.statics.findByTripId = function (tripId) {
  return this.find({ tripId }).sort('-createdAt')
}

placeSchema.statics.findPlannedByTripId = function (tripId) {
  return this.find({
    tripId,
    visitStatus: 'planned',
    isDeleted: { $ne: true }
  }).sort('createdAt')
}

let Place = mongoose.model('Place', placeSchema)
module.exports = Place