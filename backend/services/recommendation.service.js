const groqService = require('./groq.service')
const geoapifyService = require('./geoapify.service')

/**
 * Main recommendation service
 * Fetches AI recommendations with guaranteed coordinates
 */
const getRecommendations = async (tripId, options = {}) => {
  console.log('📍 recommendation.service.getRecommendations called')
  console.log('  Trip ID:', tripId)
  console.log('  Options:', options)

  try {
    const Trip = require('../models/Trip.model')
    const trip = await Trip.findById(tripId)

    if (!trip) {
      throw new Error('Trip not found')
    }

    console.log('  Destination:', trip.destination)
    console.log('  Category:', options.category || 'all')

    // ✅ STEP 1: Get center location coordinates
    let centerLocation = null
    
    if (trip.destinationCoords && trip.destinationCoords.length === 2) {
      centerLocation = {
        lat: trip.destinationCoords[1],
        lon: trip.destinationCoords[0]
      }
      console.log('  Using trip coords:', centerLocation)
    } else {
      console.log('  Geocoding destination:', trip.destination)
      const geocoded = await geoapifyService.geocodeLocation(trip.destination)
      
      if (geocoded) {
        centerLocation = { lat: geocoded.lat, lon: geocoded.lon }
        console.log('  ✓ Geocoded to:', geocoded.formatted)
        console.log('  ✓ Coordinates:', centerLocation)
        
        // Save to trip for future use
        trip.destinationCoords = [geocoded.lon, geocoded.lat]
        await trip.save()
      } else {
        console.warn('  ⚠️ Geocoding failed, using default (Paris)')
        centerLocation = { lat: 48.8566, lon: 2.3522 }
      }
    }

    // ✅ STEP 2: Determine categories to search
    let categories = []
    if (options.category && options.category !== 'all') {
      categories = [options.category]
    } else {
      categories = ['restaurant', 'attraction', 'accommodation']
    }

    console.log('  Fetching categories:', categories.join(', '))

    // ✅ STEP 3: Fetch AI recommendations
    let allPlaces = []

    for (const category of categories) {
      console.log(`\n  📍 Fetching ${category}s...`)
      
      try {
        const result = await groqService.getAIRecommendations(
          category,
          trip.destination,
          {
            budget: trip.budget,
            duration: trip.duration,
            peopleCount: trip.peopleCount,
            centerLocation: centerLocation // Pass center for distance calc
          }
        )

        if (result.places && result.places.length > 0) {
          console.log(`    ✓ AI returned ${result.places.length} ${category}s`)
          
          // ✅ STEP 4: GEOCODE EACH PLACE IF MISSING COORDINATES
          const placesWithCoords = await Promise.all(
            result.places.map(async (place) => {
              // Check if place already has coordinates
              if (place.location?.coordinates && 
                  place.location.coordinates[0] !== 0 && 
                  place.location.coordinates[1] !== 0) {
                console.log(`    ✓ ${place.name}: has coordinates`)
                return place
              }

              // ✅ GEOCODE THE PLACE
              console.log(`    🔍 Geocoding: ${place.name}`)
              
              try {
                const query = place.address || `${place.name}, ${trip.destination}`
                const coords = await geoapifyService.geocodeLocation(query)
                
                if (coords) {
                  console.log(`    ✓ Found: [${coords.lon}, ${coords.lat}]`)
                  
                  // Calculate distance from center
                  const distance = calculateDistance(
                    centerLocation.lat,
                    centerLocation.lon,
                    coords.lat,
                    coords.lon
                  )

                  return {
                    ...place,
                    location: {
                      type: 'Point',
                      coordinates: [coords.lon, coords.lat]
                    },
                    lat: coords.lat,  // ✅ Add explicit lat/lon
                    lon: coords.lon,  // ✅ for frontend convenience
                    address: coords.formatted || place.address,
                    distanceFromCenter: distance
                  }
                } else {
                  console.warn(`    ⚠️ Geocoding failed for: ${place.name}`)
                  return null // Will be filtered out
                }
              } catch (err) {
                console.error(`    ❌ Geocoding error for ${place.name}:`, err.message)
                return null
              }
            })
          )

          // Filter out places that couldn't be geocoded
          const validPlaces = placesWithCoords.filter(p => p !== null)
          console.log(`    ✓ Valid places with coordinates: ${validPlaces.length}`)
          
          allPlaces.push(...validPlaces)
        } else {
          console.log(`    ⚠️ No AI results for ${category}`)
        }

      } catch (err) {
        console.error(`    ❌ AI failed for ${category}:`, err.message)
      }
    }

    console.log(`\n  📊 Total places with coordinates: ${allPlaces.length}`)

    // ✅ STEP 5: Score and rank
    if (allPlaces.length > 0 && centerLocation) {
      allPlaces = groqService.scoreAndRankPlaces(allPlaces, centerLocation)
    }

    // ✅ STEP 6: Apply limit
    const limit = options.limit || 50
    allPlaces = allPlaces.slice(0, limit)

    // ✅ STEP 7: Final validation - ensure all have coordinates
    const finalPlaces = allPlaces.filter(place => {
      const hasCoords = place.lat && place.lon && 
                       place.lat !== 0 && place.lon !== 0
      
      if (!hasCoords) {
        console.warn(`  ⚠️ Filtering out ${place.name} - missing coordinates`)
      }
      
      return hasCoords
    })

    console.log(`  ✅ Returning ${finalPlaces.length} recommendations with valid coordinates`)

    return {
      places: finalPlaces,
      centerLocation: centerLocation,
      budgetAnalysis: null,
      message: finalPlaces.length > 0 
        ? `Found ${finalPlaces.length} recommendations` 
        : 'No recommendations available'
    }

  } catch (error) {
    console.error('❌ Error in getRecommendations:', error.message)
    console.error('   Stack:', error.stack)
    throw error
  }
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  
  return Math.round(distance * 10) / 10 // Round to 1 decimal
}

function toRad(degrees) {
  return degrees * (Math.PI / 180)
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
            rating: p.rating,
            location: p.location
          })),
          totalPlaces: dayPlaces.length,
          estimatedDuration: dayPlaces.length * 2
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
