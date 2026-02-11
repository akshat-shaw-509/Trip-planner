const groqService = require('./groq.service')
const geoapifyService = require('./geoapify.service')
const { calculateDistance } = require('../utils/helpers')

// Main recommendation service
const getRecommendations = async (tripId, options = {}) => {
  const Trip = require('../models/Trip.model')

const trip = await Trip.findById(tripId)
if (!trip) {
  throw new Error('Trip not found')
}

  try {
    // determine trip center coordinates
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

    // load user preferences if available
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

   // build recommendation options
    const recommendationOptions = {
      budget: trip.budget,
      duration: trip.duration,
      peopleCount: trip.travelers,
      currency: trip.currency || 'INR',
      centerLocation,
      minRating: parseFloat(options.minRating) || userPreferences?.ratingThreshold || 3.5,
      maxRadius: parseFloat(options.radius) || 10, // km
      
      sortBy: options.sortBy === 'score'
        ? 'bestMatch'
        : options.sortBy || 'bestMatch',
      
      showHiddenGems: options.hiddenGems === 'true' || options.hiddenGems === true,
      topRatedOnly: options.topRated === 'true' || options.topRated === true,
      priceRange: options.minPrice || options.maxPrice ? {
        min: parseInt(options.minPrice) || 1,
        max: parseInt(options.maxPrice) || 5
      } : null,
      userPreferences
    }

    //  determine which categories to fetch
    const categories =
      options.category && options.category !== 'all'
        ? [options.category]
        : ['restaurant', 'attraction', 'accommodation']

   // get AI recommendations
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

    // remove duplicates and normalize categories
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

  // final sorting
    if (options.sortBy === 'rating') {
      allPlaces.sort((a, b) => b.rating - a.rating)
    } else if (options.sortBy === 'distance') {
      allPlaces.sort((a, b) => {
        const distA = a.distanceFromCenter || Infinity
        const distB = b.distanceFromCenter || Infinity
        return distA - distB
      })
    }
    
    const TARGET_TOTAL = options.limit || 20
// category balancing
    const BUCKETS = {
      attraction: 7,
      restaurant: 7,
      accommodation: 6
    }

    const bucketed = []
    const usedNames = new Set()

    for (const [category, limit] of Object.entries(BUCKETS)) {
      let candidates = allPlaces.filter(p => p.category === category)
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
