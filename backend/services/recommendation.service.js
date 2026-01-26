
const groqService = require('./groq.service')
const geoapifyService = require('./geoapify.service')

/**
 * Main recommendation service
 * Fetches AI recommendations for a trip
 */
const getRecommendations = async (tripId, options = {}) => {
  console.log('recommendation.service.getRecommendations called')
  console.log('Trip ID:', tripId)
  console.log('Options:', options)

  try {
    const Trip = require('../models/Trip.model')
    const trip = await Trip.findById(tripId)

    if (!trip) {
      throw new Error('Trip not found')
    }

    console.log('Destination:', trip.destination)
    console.log('Category:', options.category || 'all')

    // Geocode destination
    let centerLocation = null
    
    if (trip.destinationCoords && trip.destinationCoords.length === 2) {
      centerLocation = {
        lat: trip.destinationCoords[1],
        lon: trip.destinationCoords[0]
      }
      console.log('Using trip coords:', centerLocation)
    } else {
      console.log('Geocoding:', trip.destination)
      const geocoded = await geoapifyService.geocodeLocation(trip.destination)
      
      if (geocoded) {
        centerLocation = { lat: geocoded.lat, lon: geocoded.lon }
        console.log('Geocoded to:', geocoded.formatted)
        console.log('Rank info:', geocoded.rank)
      } else {
        console.warn('Geocoding failed, using default')
        centerLocation = { lat: 48.8566, lon: 2.3522 } // Paris default
      }
    }

    // Determine categories
    let categories = []
    if (options.category && options.category !== 'all') {
      categories = [options.category]
    } else {
      categories = ['restaurant', 'attraction', 'accommodation']
    }

    console.log('Fetching AI recommendations for categories:', categories)

    // Fetch AI recommendations for each category
    let allPlaces = []

    for (const category of categories) {
      console.log(`\nFetching ${category}s via Groq AI...`)
      
      try {
        const result = await groqService.getAIRecommendations(
          category,
          trip.destination,
          {
            budget: trip.budget,
            duration: trip.duration,
            peopleCount: trip.peopleCount
          }
        )

        console.log(`  AI returned ${result.places?.length || 0} ${category}s`)
        
        if (result.places && result.places.length > 0) {
          allPlaces.push(...result.places)
        } else {
          console.log(`  No AI results for ${category}`)
          console.log(`  Message: ${result.message}`)
        }

      } catch (err) {
        console.error(`  AI failed for ${category}:`, err.message)
        console.error(`  Stack:`, err.stack)
      }
    }

    console.log(`\nTotal places from AI: ${allPlaces.length}`)

    // Score and rank
    if (allPlaces.length > 0 && centerLocation) {
      allPlaces = groqService.scoreAndRankPlaces(allPlaces, centerLocation)
    }

    // Apply limit
    const limit = options.limit || 20
    allPlaces = allPlaces.slice(0, limit)

    if (allPlaces.length === 0) {
      console.log('No AI recommendations generated')
    } else {
      console.log(`Returning ${allPlaces.length} recommendations`)
    }

    return {
      places: allPlaces,
      budgetAnalysis: null,
      message: allPlaces.length > 0 
        ? `Found ${allPlaces.length} recommendations` 
        : 'No recommendations available'
    }

  } catch (error) {
    console.error('Error in getRecommendations:', error.message)
    console.error('Stack:', error.stack)
    throw error
  }
}

/**
 * Generate day plans
 */
const getDayPlans = async (tripId) => {
  console.log('getDayPlans called for trip:', tripId)
  
  try {
    const Place = require('../models/Place.model')
    const Trip = require('../models/Trip.model')

    const trip = await Trip.findById(tripId)
    if (!trip) {
      throw new Error('Trip not found')
    }

    const places = await Place.find({ tripId })

    if (places.length === 0) {
      console.log('No places found, returning empty day plans')
      return []
    }

    // Simple day plan generation
    const dayPlans = []
    const tripDuration = Math.ceil(
      (new Date(trip.endDate) - new Date(trip.startDate)) / (1000 * 60 * 60 * 24)
    ) || 1

    const placesPerDay = Math.ceil(places.length / tripDuration)

    for (let day = 1; day <= tripDuration; day++) {
      const startIdx = (day - 1) * placesPerDay
      const endIdx = Math.min(startIdx + placesPerDay, places.length)
      const dayPlaces = places.slice(startIdx, endIdx)

      if (dayPlaces.length > 0) {
        dayPlans.push({
          day,
          date: new Date(
            new Date(trip.startDate).getTime() + (day - 1) * 24 * 60 * 60 * 1000
          ),
          places: dayPlaces.map(p => ({
            name: p.name,
            category: p.category,
            rating: p.rating
          })),
          totalPlaces: dayPlaces.length,
          estimatedDuration: dayPlaces.length * 2 // 2 hours per place
        })
      }
    }

    console.log(`Generated ${dayPlans.length} day plans`)
    return dayPlans

  } catch (error) {
    console.error('Error generating day plans:', error.message)
    throw error
  }
}

module.exports = {
  getRecommendations,
  getDayPlans
}