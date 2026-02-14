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

   // build recommendation options
    const recommendationOptions = {
      budget: trip.budget,
      duration: trip.duration,
      peopleCount: trip.travelers,
      currency: trip.currency || 'INR',
      centerLocation,
      minRating: parseFloat(options.minRating) || 3.5,
      maxRadius: parseFloat(options.radius) || 10, // km
      
      sortBy: options.sortBy === 'score'
        ? 'bestMatch'
        : options.sortBy || 'bestMatch',
      
      hiddenGems: options.hiddenGems === 'true' || options.hiddenGems === true,
      topRatedOnly: options.topRated === 'true' || options.topRated === true,
      priceRange: options.minPrice || options.maxPrice ? {
        min: parseInt(options.minPrice) || 1,
        max: parseInt(options.maxPrice) || 5
      } : null
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
    // Sort before filterin
if (recommendationOptions.sortBy === 'rating') {
  allPlaces = allPlaces.sort((a, b) => (b.rating || 0) - (a.rating || 0))
}
    let radiusFilteredPlaces = allPlaces.filter(place => {
  if (centerLocation && place.location?.coordinates?.length === 2) {
    const dist = calculateDistance(
      centerLocation.lat,
      centerLocation.lon,
      place.location.coordinates[1],
      place.location.coordinates[0]
    )
    place.distanceFromCenter = dist
    return dist <= recommendationOptions.maxRadius
  }
  return true
})
if (recommendationOptions.sortBy === 'distance') {
  radiusFilteredPlaces.sort((a, b) => {
    const distA = a.distanceFromCenter || Infinity
    const distB = b.distanceFromCenter || Infinity
    return distA - distB
  })
}

    if (radiusFilteredPlaces.length === 0) {
      return {
        places: [],
        centerLocation,
        message: `No recommendations found matching your criteria`,
        appliedFilters: recommendationOptions
      }
    }
    const TARGET_TOTAL = parseInt(options.limit) || 20
// category balancing
    const BUCKETS = {
  attraction: Math.ceil(TARGET_TOTAL * 0.35),
  restaurant: Math.ceil(TARGET_TOTAL * 0.35),
  accommodation: Math.ceil(TARGET_TOTAL * 0.30)
}

    const bucketed = []
    const usedNames = new Set()

    for (const [category, limit] of Object.entries(BUCKETS)) {
      let candidates = radiusFilteredPlaces.filter(p => p.category === category)
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
    
    if (bucketed.length < TARGET_TOTAL) {
  const remaining = radiusFilteredPlaces.filter(p => !usedNames.has(p.name))
  const needed = TARGET_TOTAL - bucketed.length
  const fillIn = remaining.slice(0, needed)
  bucketed.push(...fillIn)
}

    return {
      places: bucketed,
      centerLocation,
     message: `Successfully retrieved ${bucketed.length} recommendations`,
appliedFilters: {
  minRating: recommendationOptions.minRating,
  maxRadius: recommendationOptions.maxRadius,
  sortBy: recommendationOptions.sortBy,
  topRatedOnly: recommendationOptions.topRatedOnly
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
