// Import mongoose for schema and model creation
let mongoose = require('mongoose')

/**
 * -------------------- Place Schema --------------------
 */
let placeSchema = new mongoose.Schema(
  {
    /**
     * Reference to the trip this place belongs to
     */
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: [true, 'Trip ID is required'],
      index: true,
    },

    /**
     * Name of the place
     */
    name: {
      type: String,
      required: [true, 'Place name is required'],
      trim: true,
      maxlength: [200, 'Name must not exceed 200 characters'],
    },

    /**
     * Optional description of the place
     */
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description must not exceed 2000 characters'],
    },

    /**
     * Category of the place
     */
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

    /**
     * Physical address of the place
     */
    address: {
      type: String,
      trim: true,
      maxlength: [500, 'Address must not exceed 500 characters']
    },

    /**
     * GeoJSON location field
     * Used for map and proximity-based queries
     */
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },

      // Coordinates stored as [longitude, latitude]
      coordinates: {
        type: [Number],
        required: [true, 'Coordinates required'],
        validate: {
          validator: function (v) {
            // Ensure valid [lng, lat] format
            if (!Array.isArray(v) || v.length !== 2) return false
            const [lng, lat] = v
            return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90
          },
          message: 'Coordinates must be [lng, lat]'
        }
      }
    },

    /**
     * User rating for the place
     */
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },

    /**
     * Visit status of the place
     */
    visitStatus: {
      type: String,
      lowercase: true,
      enum: ['planned', 'visited', 'skipped'],
      default: 'planned',
    },

    /**
     * Date when the place was visited
     */
    visitDate: {
      type: Date,
    },

    /**
     * Additional user notes
     */
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes must not exceed 2000 characters'],
    }
  },
  {
    // Automatically manage createdAt & updatedAt
    timestamps: true,

    // Customize JSON output
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        // Remove internal version key
        delete ret.__v
        return ret
      }
    }
  }
)

/**
 * -------------------- Indexes --------------------
 */

// Geospatial index for map and distance queries
placeSchema.index({ location: '2dsphere' })

// Optimize queries by trip and creation time
placeSchema.index({ tripId: 1, createdAt: -1 })

// Optimize queries by trip and visit status
placeSchema.index({ tripId: 1, visitStatus: 1 })

/**
 * -------------------- Virtual Fields --------------------
 */

/**
 * Virtual: distanceFromCenter
 * Calculates distance from a given center point
 * (Note: uses simple Euclidean distance, not spherical distance)
 */
placeSchema.virtual('distanceFromCenter').get(function (centerLngLat) {
  if (!centerLngLat || !this.location?.coordinates) return 0

  const [centerLng, centerLat] = centerLngLat
  const [lng, lat] = this.location.coordinates

  return Math.sqrt(
    Math.pow(lng - centerLng, 2) + Math.pow(lat - centerLat, 2)
  )
})

/**
 * -------------------- Instance Methods --------------------
 */

/**
 * Returns a compact summary of the place
 */
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

/**
 * -------------------- Static Methods --------------------
 */

/**
 * Find all places for a trip (newest first)
 */
placeSchema.statics.findByTripId = function (tripId) {
  return this.find({ tripId }).sort('-createdAt')
}

/**
 * Find planned (not yet visited) places for a trip
 */
placeSchema.statics.findPlannedByTripId = function (tripId) {
  return this.find({
    tripId,
    visitStatus: 'planned',
    isDeleted: { $ne: true }
  }).sort('createdAt')
}

/**
 * Create and export Place model
 */
let Place = mongoose.model('Place', placeSchema)
module.exports = Place
