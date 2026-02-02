const groqService = require('./groq.service')
const geoapifyService = require('./geoapify.service')

// Shared distance helper (single source of truth)
const { calculateDistance } = require('../utils/helpers')

/**
 * Main recommendation service
 * Fetches AI recommendations for a trip
 */
const getRecommendations = async (tripId, options = {}) => {
  try {
    const Trip = require('../models/Trip.model')
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
     * STEP 2: Determine categories
     */
    const categories =
      options.category && options.category !== 'all'
        ? [options.category]
        : ['restaurant', 'attraction', 'accommodation']

    /**
     * STEP 3: Fetch AI recommendations
     */
    let allPlaces = []

    for (const category of categories) {
      const result = await groqService.getAIRecommendations(
        category,
        trip.destination,
        {
          budget: trip.budget,
          duration: trip.duration,
          peopleCount: trip.peopleCount,
          centerLocation
        }
      )

      if (!result?.places?.length) continue

      /**
       * STEP 4: Distance validation only (no re-geocoding)
       */
      const validPlaces = result.places.filter(place => {
        if (!place.location?.coordinates) return false

        const [lon, lat] = place.location.coordinates
        const distance = calculateDistance(
          centerLocation.lat,
          centerLocation.lon,
          lat,
          lon
        )

        return distance <= 50
      })

      allPlaces.push(...validPlaces)
    }

    if (allPlaces.length === 0) {
      return {
        places: [],
        centerLocation,
        message: `No recommendations found for ${trip.destination}`
      }
    }

    /**
     * STEP 5: Score & rank
     */
    allPlaces = groqService.scoreAndRankPlaces(allPlaces, centerLocation)

    /**
     * STEP 6: Apply limit
     */
    const limit = options.limit || 50

    return {
      places: allPlaces.slice(0, limit),
      centerLocation,
      message: `Found ${Math.min(allPlaces.length, limit)} recommendations`
    }
  } catch (error) {
    throw error
  }
}

module.exports = {
  getRecommendations
}
