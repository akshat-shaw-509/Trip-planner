const mongoose = require('mongoose')
/**
 * UserPreference Schema
 * Stores user's personalized preferences for recommendations
 */
const userPreferenceSchema = new mongoose.Schema(
  {
    // Reference to user (one-to-one relationship)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true,
      index: true,
    },
    // Category preference weights
    // Higher number = stronger preference
    categoryPreferences: {
      type: Map,
      of: Number,
      default: new Map([
        ['restaurant', 0],
        ['attraction', 0],
        ['accommodation', 0],
        ['transport', 0],
        ['shopping', 0],
        ['entertainment', 0],
        ['other', 0],
      ]),
    },
    // Top 3 preferred categories (pre-computed)
    topCategories: {
      type: [String],
      default: [],
    },
    // Minimum acceptable rating for recommendations
    ratingThreshold: {
      type: Number,
      default: 3.0,
      min: [0, 'Rating threshold cannot be less than 0'],
      max: [5, 'Rating threshold cannot exceed 5'],
    },
    // Recent search history (last 10 searches)
    searchHistory: [
      {
        query: {
          type: String,
          trim: true,
        },
        category: {
          type: String,
          trim: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
)

// Pre-save hook: Limit search history to 10 items
userPreferenceSchema.pre('save', function (next) {
  if (this.searchHistory && this.searchHistory.length > 10) {
    this.searchHistory = this.searchHistory.slice(-10)
  }
  next()
})

// Instance method: Update category preference
userPreferenceSchema.methods.updateCategoryPreference = function (category, weight = 1) {
  const current = this.categoryPreferences.get(category) || 0
  this.categoryPreferences.set(category, current + weight)
  
  // Recalculate top categories
  this.topCategories = this.getTopCategories()
  
  return this.save()
}

// Instance method: Get top N categories
userPreferenceSchema.methods.getTopCategories = function (limit = 3) {
  const entries = Array.from(this.categoryPreferences.entries())
  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([category]) => category)
}

// Instance method: Track place addition
userPreferenceSchema.methods.trackPlaceAdded = async function (place) {
  // Stronger weight for explicit place addition
  await this.updateCategoryPreference(place.category, 2)
  return this
}

// Instance method: Track favorite
userPreferenceSchema.methods.trackFavorite = async function (category) {
  // Higher weight for favorite action
  await this.updateCategoryPreference(category, 3)
  return this
}

// Instance method: Add to search history
userPreferenceSchema.methods.addSearchToHistory = function (query, category = null) {
  this.searchHistory.push({
    query,
    category,
    timestamp: new Date(),
  })
  
  // Keep only last 10 searches
  if (this.searchHistory.length > 10) {
    this.searchHistory = this.searchHistory.slice(-10)
  }
  
  return this.save()
}

// Static method: Get or create preferences for a user
userPreferenceSchema.statics.getOrCreate = async function (userId) {
  let pref = await this.findOne({ userId })
  
  if (!pref) {
    pref = await this.create({ userId })
  }
  
  return pref
}

// Static method: Reset preferences to default
userPreferenceSchema.statics.resetForUser = async function (userId) {
  await this.findOneAndUpdate(
    { userId },
    {
      $set: {
        categoryPreferences: new Map([
          ['restaurant', 0],
          ['attraction', 0],
          ['accommodation', 0],
          ['transport', 0],
          ['shopping', 0],
          ['entertainment', 0],
          ['other', 0],
        ]),
        topCategories: [],
        ratingThreshold: 3.0,
        searchHistory: [],
      },
    },
    { upsert: true, new: true }
  )
}

module.exports = mongoose.model('UserPreference', userPreferenceSchema)
