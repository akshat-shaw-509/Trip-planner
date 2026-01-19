// models/UserPreference.model.js
let mongoose = require('mongoose');

let userPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
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
    favoritePlaceIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Place'
    }],
    recentSearches: [{
      query: String,
      category: String,
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: [Number]
      },
      timestamp: { type: Date, default: Date.now }
    }],
    pricePreference: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 5 },
      avg: { type: Number, default: 2.5 }
    },
    ratingThreshold: {
      type: Number,
      default: 3.0,
      min: 0,
      max: 5
    },
    stats: {
      totalPlacesAdded: { type: Number, default: 0 },
      totalFavorites: { type: Number, default: 0 },
      totalTrips: { type: Number, default: 0 }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true }
  }
);

// Method to update category preference based on action
userPreferenceSchema.methods.updateCategoryPreference = function(category, weight = 1) {
  let current = this.categoryPreferences.get(category) || 0;
  this.categoryPreferences.set(category, current + weight);
  return this.save();
};

// Method to get top preferred categories
userPreferenceSchema.methods.getTopCategories = function(limit = 3) {
  let entries = Array.from(this.categoryPreferences.entries());
  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([category]) => category);
};

// Method to track new place addition
userPreferenceSchema.methods.trackPlaceAdded = async function(place) {
  this.stats.totalPlacesAdded += 1;
  await this.updateCategoryPreference(place.category, 2);
  
  if (place.priceLevel) {
    let current = this.pricePreference.avg;
    let total = this.stats.totalPlacesAdded;
    this.pricePreference.avg = ((current * (total - 1)) + place.priceLevel) / total;
  }
  
  return this.save();
};

// Method to track favorite
userPreferenceSchema.methods.trackFavorite = async function(placeId, category) {
  if (!this.favoritePlaceIds.includes(placeId)) {
    this.favoritePlaceIds.push(placeId);
    this.stats.totalFavorites += 1;
    await this.updateCategoryPreference(category, 3);
  }
  return this.save();
};

// Static method to get or create preferences
userPreferenceSchema.statics.getOrCreate = async function(userId) {
  let pref = await this.findOne({ userId });
  if (!pref) {
    pref = await this.create({ userId });
  }
  return pref;
};

let UserPreference = mongoose.model('UserPreference', userPreferenceSchema);
module.exports = UserPreference;