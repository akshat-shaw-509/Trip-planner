const mongoose = require('mongoose')
const PLACE_CATEGORIES = [
  'accommodation',
  'restaurant',
  'attraction',
  'transport',
  'shopping',
  'entertainment',
  'other'
]
const VISIT_STATUS = ['planned', 'visited', 'skipped']

//Place Schema
//Represents a location/venue in a trip
const placeSchema = new mongoose.Schema(
  {
    // Reference to parent trip
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: [true, 'Trip ID is required'],
      index: true,
    }, 
    // User who added the place
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    // Place name
    name: {
      type: String,
      required: [true, 'Place name is required'],
      trim: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    // Place description
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    // Place category
    category: {
      type: String,
      enum: {
        values: PLACE_CATEGORIES,
        message: '{VALUE} is not a valid category'
      },
      default: 'other',
      lowercase: true,
    },
    // Physical address
    address: {
      type: String,
      trim: true,
      maxlength: [500, 'Address cannot exceed 500 characters'],
    },
    // GeoJSON location 
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: [true, 'Coordinates are required'],
        validate: {
          validator: function (coords) {
            if (!Array.isArray(coords) || coords.length !== 2) return false
            const [lng, lat] = coords
            return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90
          },
          message: 'Coordinates must be [longitude, latitude] with valid ranges',
        },
      },
    },
    // User rating (0-5 scale)
    rating: {
      type: Number,
      min: [0, 'Rating cannot be less than 0'],
      max: [5, 'Rating cannot exceed 5'],
      default: 0,
    },
    // Price level (0-5 scale, 0 = free)
    priceLevel: {
      type: Number,
      min: [0, 'Price level cannot be less than 0'],
      max: [5, 'Price level cannot exceed 5'],
      default: 0,
    },
    // Visit status
    visitStatus: {
      type: String,
      enum: {
        values: VISIT_STATUS,
        message: '{VALUE} is not a valid visit status'
      },
      default: 'planned',
      lowercase: true,
    },
    // Date when visited/planned
    visitDate: {
      type: Date,
    },
    // User notes
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },
    // Favorite flag
    isFavorite: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Source of place data
    source: {
      type: String,
      enum: ['manual', 'ai', 'imported'],
      default: 'manual',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.__v
        return ret
      },
    },
  }
)
// Geospatial index for proximity queries
placeSchema.index({ location: '2dsphere' })
// Compound indexes
placeSchema.index({ tripId: 1, createdAt: -1 })
placeSchema.index({ tripId: 1, visitStatus: 1 })
placeSchema.index({ tripId: 1, category: 1 })
//Find places by trip
placeSchema.statics.findByTripId = function (tripId) {
  return this.find({ tripId }).sort('-createdAt')
}
//Find planned places
placeSchema.statics.findPlannedByTripId = function (tripId) {
  return this.find({
    tripId,
    visitStatus: 'planned',
  }).sort('createdAt')
}
//Find nearby places using geospatial query
placeSchema.statics.findNearby = function (tripId, coordinates, radiusInMeters = 5000) {
  return this.find({
    tripId,
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates, 
        },
        $maxDistance: radiusInMeters,
      },
    },
  })
}
//Get summary
placeSchema.methods.getSummary = function () {
  return {
    id: this._id,
    name: this.name,
    category: this.category,
    status: this.visitStatus,
    location: this.location,
    rating: this.rating,
    priceLevel: this.priceLevel,
    isFavorite: this.isFavorite,
  }
}

module.exports = mongoose.model('Place', placeSchema)
