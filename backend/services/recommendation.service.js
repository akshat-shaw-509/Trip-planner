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
      const aiResult = await groqService.getAIRecommendations(
        category,
        trip.destination,
        recommendationOptions
      )
      if (aiResult?.places?.length) {
        allPlaces.push(...aiResult.places)
      }
    }
    
    console.log('[DEBUG] Total places collected so far:', allPlaces.length)
    
    if (allPlaces.length === 0) {
      return {
        places: [],
        centerLocation,
        message: `No recommendations found matching your criteria`,
        appliedFilters: recommendationOptions
      }
    }

    /**
     * STEP 6: Remove duplicates and normalize categories
     */
    allPlaces = Object.values(
      allPlaces.reduce((acc, place) => {
        const key = place.name.toLowerCase()
        acc[key] = acc[key] || place
        return acc
      }, {})
    )
    
    allPlaces = allPlaces.map(p => ({
      ...p,
      category: String(p.category || '')
        .toLowerCase()
        .replace('hotels', 'accommodation')
        .replace('hotel', 'accommodation')
        .replace('lodging', 'accommodation')
        .replace('restaurants', 'restaurant')
        .replace('attractions', 'attraction')
    }))

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
     * STEP 8: Category Bucketing (BALANCE RESULTS)
     */
    const TARGET_TOTAL = options.limit || 20

    const BUCKETS = {
      attraction: 7,
      restaurant: 7,
      accommodation: 6
    }

    const bucketed = []
    const usedNames = new Set()

    for (const [category, limit] of Object.entries(BUCKETS)) {
      let candidates = allPlaces.filter(p => p.category === category)

      // ✅ APPLY TOP RATED HERE (FIX)
      if (recommendationOptions.topRatedOnly) {
        candidates = candidates.filter(p => (p.rating || 0) >= 4.5)
      }

      const selected = candidates
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, limit)

      for (const item of selected) {
        if (!usedNames.has(item.name)) {
          usedNames.add(item.name)
          bucketed.push(item)
        }
      }
    }
    
    const leftovers = allPlaces
      .filter(p => !usedNames.has(p.name))
      .filter(p => !recommendationOptions.topRatedOnly || (p.rating || 0) >= 4.5)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))

    while (bucketed.length < TARGET_TOTAL && leftovers.length) {
      const next = leftovers.shift()
      if (!usedNames.has(next.name)) {
        usedNames.add(next.name)
        bucketed.push(next)
      }
    }
    
    bucketed.sort((a, b) => {
      if ((b.rating || 0) !== (a.rating || 0)) {
        return (b.rating || 0) - (a.rating || 0)
      }
      return (b.recommendationScore || 0) - (a.recommendationScore || 0)
    })

    return {
      places: bucketed,
      centerLocation,
      message: `Found ${bucketed.length} balanced recommendations`,
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
    console.error('[RECOMMENDATION SERVICE ERROR]', error)
    throw error
  }
}

module.exports = {
  getRecommendations
}
