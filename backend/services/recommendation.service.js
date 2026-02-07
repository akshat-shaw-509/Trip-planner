const groqService = require('./groq.service')
const geoapifyService = require('./geoapify.service')

// Shared distance helper (single source of truth)
const { calculateDistance } = require('../utils/helpers')

/**
 * Main recommendation service with enhanced filtering
 * Fetches AI recommendations for a trip with comprehensive options
 */
const getRecommendations = async (tripId, options = {}) => {
  try {
    const Trip = require('../models/Trip.model')
    const UserPreference = require('../models/UserPreference.model')
    
    const trip = await Trip.findById(tripId)

    if (!trip) {
      throw new Error('Trip not found')
    }

    /**
     * STEP 1: Resolve trip center coordinates
     */
    let centerLocation

    if (trip.destinationCoords?.length === 2) {
      centerLocation = {
        lat: trip.destinationCoords[1],
        lon: trip.destinationCoords[0]
      }
    } else {
      const query = trip.country
        ? `${trip.destination}, ${trip.country}`
        : trip.destination

      const geocoded = await geoapifyService.geocodeLocation(query)

      if (!geocoded) {
        throw new Error(
          `Unable to find location for "${trip.destination}". Please verify destination name.`
        )
      }

      centerLocation = { lat: geocoded.lat, lon: geocoded.lon }

      // Cache for future calls
      trip.destinationCoords = [geocoded.lon, geocoded.lat]
      await trip.save()
    }

    /**
     * STEP 2: Load user preferences
     */
    let userPreferences = null
    try {
      const prefs = await UserPreference.findOne({ userId: trip.userId })
      if (prefs) {
        userPreferences = {
          topCategories: prefs.topCategories || [],
          categoryWeights: prefs.categoryPreferences,
          ratingThreshold: prefs.ratingThreshold || 3.5
        }
      }
    } catch (err) {
      console.log('Could not load user preferences:', err.message)
    }

    /**
     * STEP 3: Parse and prepare recommendation options
     */
    const recommendationOptions = {
      // Base trip context
      budget: trip.budget,
      duration: trip.duration,
      peopleCount: trip.travelers,
      currency: trip.currency || 'INR',
      centerLocation,

      // Filtering options from query params
      minRating: parseFloat(options.minRating) || userPreferences?.ratingThreshold || 3.5,
      maxRadius: parseFloat(options.radius) || 10, // km
      
     
// Sorting
sortBy: options.sortBy === 'score'
  ? 'bestMatch'
  : options.sortBy || 'bestMatch',
      
      // Quick filters
      showHiddenGems: options.hiddenGems === 'true' || options.hiddenGems === true,
      topRatedOnly: options.topRated === 'true' || options.topRated === true,
      
      // Price range
      priceRange: options.minPrice || options.maxPrice ? {
        min: parseInt(options.minPrice) || 1,
        max: parseInt(options.maxPrice) || 5
      } : null,

      // User preferences
      userPreferences
    }

    /**
     * STEP 4: Determine categories
     */
    const categories =
      options.category && options.category !== 'all'
        ? [options.category]
        : ['restaurant', 'attraction', 'accommodation']

    /**
     * STEP 5: Fetch AI recommendations with enhanced options
     */
    let allPlaces = []

for (const category of categories) {
  const geoapifyPlaces = await geoapifyService.searchPlaces({
    lat: centerLocation.lat,
    lon: centerLocation.lon,
    radius: recommendationOptions.maxRadius * 1000, // km → meters
    categories: [category],
    limit: 20
  })

  console.log(
    '[DEBUG] Geoapify places for category:',
    category,
    geoapifyPlaces.length
  )

  allPlaces.push(...geoapifyPlaces)

  console.log(
    '[DEBUG] Total places collected so far:',
    allPlaces.length
  )
    }
    if (allPlaces.length === 0) {
      return {
        places: [],
        centerLocation,
        message: `No recommendations found matching your criteria`,
        appliedFilters: recommendationOptions
      }
    }

    /**
     * STEP 7: Apply final sorting if needed
     */
    if (options.sortBy === 'rating') {
      allPlaces.sort((a, b) => b.rating - a.rating)
    } else if (options.sortBy === 'distance') {
      allPlaces.sort((a, b) => {
        const distA = a.distanceFromCenter || Infinity
        const distB = b.distanceFromCenter || Infinity
        return distA - distB
      })
    }
    // bestMatch is already sorted by groqService

    /**
     * STEP 8: Apply limit
     */
    const limit = options.limit || 50

    return {
      places: allPlaces.slice(0, limit),
      centerLocation,
      message: `Found ${Math.min(allPlaces.length, limit)} recommendations`,
      appliedFilters: {
        category: options.category || 'all',
        minRating: recommendationOptions.minRating,
        maxRadius: recommendationOptions.maxRadius,
        sortBy: recommendationOptions.sortBy,
        hiddenGems: recommendationOptions.showHiddenGems,
        topRatedOnly: recommendationOptions.topRatedOnly,
        priceRange: recommendationOptions.priceRange
      }
    }
  } catch (error) {
    throw error
  }
}

module.exports = {
  getRecommendations
}
