<<<<<<< HEAD
let mongoose = require('mongoose')

/**
 * -------------------- User Preference Schema --------------------
 * Stores personalized preferences and interaction statistics for a user
 */
let userPreferenceSchema = new mongoose.Schema(
  {
    /**
     * Reference to the user
     * One-to-one relationship (one preference doc per user)
     */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },

    /**
     * Category-based preference weights
     * Higher number = stronger preference
     */
    categoryPreferences: {
      type: Map,
      of: Number,
      default: new Map([
        ['restaurant', 0],
        ['attraction', 0],
        ['accommodation', 0],
        ['transport', 0],
        ['other', 0]
      ])
    },

    /**
     * List of user’s favorite places
     */
    favoritePlaceIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Place'
      }
    ],

    /**
     * Recently searched queries
     * Used for recommendations and personalization
     */
    recentSearches: [
      {
        query: String,
        category: String,
        location: {
          type: { type: String, enum: ['Point'], default: 'Point' },
          coordinates: [Number]
        },
        timestamp: { type: Date, default: Date.now }
      }
    ],

    /**
     * User price preference profile
     */
    pricePreference: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 5 },
      avg: { type: Number, default: 2.5 }
    },

    /**
     * Minimum acceptable rating for recommendations
     */
    ratingThreshold: {
      type: Number,
      default: 3.0,
      min: 0,
      max: 5
    },

    /**
     * Usage statistics
     */
    stats: {
      totalPlacesAdded: { type: Number, default: 0 },
      totalFavorites: { type: Number, default: 0 },
      totalTrips: { type: Number, default: 0 }
    }
  },
  {
    // Automatically manage createdAt & updatedAt
    timestamps: true,

    // Include virtuals when converting to JSON
    toJSON: { virtuals: true }
  }
)

/**
 * -------------------- Instance Methods --------------------
 */

/**
 * Update category preference weight
 * Used when user interacts with a category
 */
userPreferenceSchema.methods.updateCategoryPreference = function (
  category,
  weight = 1
) {
  let current = this.categoryPreferences.get(category) || 0
  this.categoryPreferences.set(category, current + weight)
  return this.save()
}

/**
 * Get top preferred categories
 */
userPreferenceSchema.methods.getTopCategories = function (limit = 3) {
  let entries = Array.from(this.categoryPreferences.entries())

  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([category]) => category)
}

/**
 * Track when a new place is added by the user
 * Updates category weight and price preference average
 */
userPreferenceSchema.methods.trackPlaceAdded = async function (place) {
  this.stats.totalPlacesAdded += 1

  // Stronger weight for explicit place addition
  await this.updateCategoryPreference(place.category, 2)

  // Update rolling average for price preference
  if (place.priceLevel) {
    let current = this.pricePreference.avg
    let total = this.stats.totalPlacesAdded

    this.pricePreference.avg =
      (current * (total - 1) + place.priceLevel) / total
  }

  return this.save()
}

/**
 * Track when a place is marked as favorite
 */
userPreferenceSchema.methods.trackFavorite = async function (
  placeId,
  category
) {
  if (!this.favoritePlaceIds.includes(placeId)) {
    this.favoritePlaceIds.push(placeId)
    this.stats.totalFavorites += 1

    // Higher weight for favorite action
    await this.updateCategoryPreference(category, 3)
  }

  return this.save()
}

/**
 * -------------------- Static Methods --------------------
 */

/**
 * Get existing preferences or create new ones for a user
 */
userPreferenceSchema.statics.getOrCreate = async function (userId) {
  let pref = await this.findOne({ userId })

  if (!pref) {
    pref = await this.create({ userId })
  }

  return pref
}

/**
 * Create and export UserPreference model
 */
let UserPreference = mongoose.model('UserPreference', userPreferenceSchema)
module.exports = UserPreference
=======
let mongoose = require('mongoose')

/**
 * -------------------- User Preference Schema --------------------
 * Stores personalized preferences and interaction statistics for a user
 */
let userPreferenceSchema = new mongoose.Schema(
  {
    /**
     * Reference to the user
     * One-to-one relationship (one preference doc per user)
     */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },

    /**
     * Category-based preference weights
     * Higher number = stronger preference
     */
    categoryPreferences: {
      type: Map,
      of: Number,
      default: new Map([
        ['restaurant', 0],
        ['attraction', 0],
        ['accommodation', 0],
        ['transport', 0],
        ['other', 0]
      ])
    },

    /**
     * List of user’s favorite places
     */
    favoritePlaceIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Place'
      }
    ],

    /**
     * Recently searched queries
     * Used for recommendations and personalization
     */
    recentSearches: [
      {
        query: String,
        category: String,
        location: {
          type: { type: String, enum: ['Point'], default: 'Point' },
          coordinates: [Number]
        },
        timestamp: { type: Date, default: Date.now }
      }
    ],

    /**
     * User price preference profile
     */
    pricePreference: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 5 },
      avg: { type: Number, default: 2.5 }
    },

    /**
     * Minimum acceptable rating for recommendations
     */
    ratingThreshold: {
      type: Number,
      default: 3.0,
      min: 0,
      max: 5
    },

    /**
     * Usage statistics
     */
    stats: {
      totalPlacesAdded: { type: Number, default: 0 },
      totalFavorites: { type: Number, default: 0 },
      totalTrips: { type: Number, default: 0 }
    }
  },
  {
    // Automatically manage createdAt & updatedAt
    timestamps: true,

    // Include virtuals when converting to JSON
    toJSON: { virtuals: true }
  }
)

/**
 * -------------------- Instance Methods --------------------
 */

/**
 * Update category preference weight
 * Used when user interacts with a category
 */
userPreferenceSchema.methods.updateCategoryPreference = function (
  category,
  weight = 1
) {
  let current = this.categoryPreferences.get(category) || 0
  this.categoryPreferences.set(category, current + weight)
  return this.save()
}

/**
 * Get top preferred categories
 */
userPreferenceSchema.methods.getTopCategories = function (limit = 3) {
  let entries = Array.from(this.categoryPreferences.entries())

  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([category]) => category)
}

/**
 * Track when a new place is added by the user
 * Updates category weight and price preference average
 */
userPreferenceSchema.methods.trackPlaceAdded = async function (place) {
  this.stats.totalPlacesAdded += 1

  // Stronger weight for explicit place addition
  await this.updateCategoryPreference(place.category, 2)

  // Update rolling average for price preference
  if (place.priceLevel) {
    let current = this.pricePreference.avg
    let total = this.stats.totalPlacesAdded

    this.pricePreference.avg =
      (current * (total - 1) + place.priceLevel) / total
  }

  return this.save()
}

/**
 * Track when a place is marked as favorite
 */
userPreferenceSchema.methods.trackFavorite = async function (
  placeId,
  category
) {
  if (!this.favoritePlaceIds.includes(placeId)) {
    this.favoritePlaceIds.push(placeId)
    this.stats.totalFavorites += 1

    // Higher weight for favorite action
    await this.updateCategoryPreference(category, 3)
  }

  return this.save()
}

/**
 * -------------------- Static Methods --------------------
 */

/**
 * Get existing preferences or create new ones for a user
 */
userPreferenceSchema.statics.getOrCreate = async function (userId) {
  let pref = await this.findOne({ userId })

  if (!pref) {
    pref = await this.create({ userId })
  }

  return pref
}

/**
 * Create and export UserPreference model
 */
let UserPreference = mongoose.model('UserPreference', userPreferenceSchema)
module.exports = UserPreference
>>>>>>> 0007615a5a7317e8689fc9727726ee86c5585786
