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

    // ✅ STEP 1: Get center location coordinates - NO FALLBACKS TO WRONG CITIES
    let centerLocation = null
    
    if (trip.destinationCoords && trip.destinationCoords.length === 2) {
      centerLocation = {
        lat: trip.destinationCoords[1],
        lon: trip.destinationCoords[0]
      }
      console.log('  ✓ Using saved trip coords:', centerLocation)
    } else {
      // ✅ MUST GEOCODE - NO DEFAULT COORDINATES
      console.log('  🔍 Geocoding destination:', trip.destination)
      
      // Try multiple geocoding attempts with variations
      let geocoded = null
      
      // Attempt 1: Exact destination name
      geocoded = await geoapifyService.geocodeLocation(trip.destination)
      
      // Attempt 2: Add country if available
      if (!geocoded && trip.country) {
        console.log('  🔍 Retry with country:', `${trip.destination}, ${trip.country}`)
        geocoded = await geoapifyService.geocodeLocation(`${trip.destination}, ${trip.country}`)
      }
      
      // Attempt 3: Try city name only if comma-separated
      if (!geocoded && trip.destination.includes(',')) {
        const cityOnly = trip.destination.split(',')[0].trim()
        console.log('  🔍 Retry with city only:', cityOnly)
        geocoded = await geoapifyService.geocodeLocation(cityOnly)
      }
      
      if (geocoded) {
        centerLocation = { lat: geocoded.lat, lon: geocoded.lon }
        console.log('  ✓ Geocoded to:', geocoded.formatted)
        console.log('  ✓ Coordinates:', centerLocation)
        
        // Save to trip for future use
        trip.destinationCoords = [geocoded.lon, geocoded.lat]
        await trip.save()
        console.log('  ✓ Saved coordinates to trip')
      } else {
        // ✅ FAIL GRACEFULLY - NO WRONG CITY FALLBACK
        console.error('  ❌ CRITICAL: Cannot find location for:', trip.destination)
        throw new Error(
          `Unable to find coordinates for "${trip.destination}". ` +
          `Please verify the destination name is correct (e.g., "Venice, Italy" instead of just "Venice").`
        )
      }
    }

    // Verify we have valid coordinates
    if (!centerLocation || !centerLocation.lat || !centerLocation.lon) {
      throw new Error('Invalid center location coordinates')
    }

    // ✅ STEP 2: Determine categories to search
    let categories = []
    if (options.category && options.category !== 'all') {
      categories = [options.category]
    } else {
      categories = ['restaurant', 'attraction', 'accommodation']
    }

    console.log('  📋 Fetching categories:', categories.join(', '))
    console.log('  📍 Search center:', centerLocation)

    // ✅ STEP 3: Fetch AI recommendations
    let allPlaces = []

    for (const category of categories) {
      console.log(`\n  🔍 Fetching ${category}s for ${trip.destination}...`)
      
      try {
        const result = await groqService.getAIRecommendations(
          category,
          trip.destination,
          {
            budget: trip.budget,
            duration: trip.duration,
            peopleCount: trip.peopleCount,
            centerLocation: centerLocation
          }
        )

        if (result.places && result.places.length > 0) {
          console.log(`    ✓ AI returned ${result.places.length} ${category}s`)
          
          // ✅ STEP 4: GEOCODE EACH PLACE IN THE CORRECT CITY
          const placesWithCoords = await Promise.all(
            result.places.map(async (place) => {
              // Check if place already has coordinates
              if (place.location?.coordinates && 
                  place.location.coordinates[0] !== 0 && 
                  place.location.coordinates[1] !== 0) {
                
                // ✅ VERIFY coordinates are in correct city (within reasonable radius)
                const distance = calculateDistance(
                  centerLocation.lat,
                  centerLocation.lon,
                  place.location.coordinates[1],
                  place.location.coordinates[0]
                )
                
                // If place is more than 100km away, something is wrong
                if (distance > 100) {
                  console.warn(`    ⚠️ ${place.name} is ${distance}km away - re-geocoding`)
                } else {
                  console.log(`    ✓ ${place.name}: valid coordinates (${distance.toFixed(1)}km)`)
                  place.distanceFromCenter = distance
                  return place
                }
              }

              // ✅ GEOCODE WITH CITY CONTEXT
              console.log(`    🔍 Geocoding: ${place.name}`)
              
              try {
                // Include destination city in geocoding query for accuracy
                const query = `${place.name}, ${trip.destination}`
                console.log(`    🔍 Query: "${query}"`)
                
                const coords = await geoapifyService.geocodeLocation(query)
                
                if (coords) {
                  // ✅ VERIFY the geocoded place is in the right city
                  const distance = calculateDistance(
                    centerLocation.lat,
                    centerLocation.lon,
                    coords.lat,
                    coords.lon
                  )
                  
                  // Reject if place is too far from destination (>100km)
                  if (distance > 100) {
                    console.warn(`    ❌ ${place.name} geocoded to wrong city (${distance}km away)`)
                    console.warn(`    ❌ Expected: ${trip.destination}, Got: ${coords.formatted}`)
                    return null
                  }

                  console.log(`    ✓ Found in ${trip.destination}: [${coords.lon}, ${coords.lat}] (${distance.toFixed(1)}km)`)
                  
                  return {
                    ...place,
                    location: {
                      type: 'Point',
                      coordinates: [coords.lon, coords.lat]
                    },
                    lat: coords.lat,
                    lon: coords.lon,
                    address: coords.formatted || place.address,
                    distanceFromCenter: distance,
                    city: coords.city,
                    country: coords.country
                  }
                } else {
                  console.warn(`    ⚠️ Geocoding failed for: ${place.name}`)
                  return null
                }
              } catch (err) {
                console.error(`    ❌ Geocoding error for ${place.name}:`, err.message)
                return null
              }
            })
          )

          // Filter out places that couldn't be geocoded or are in wrong location
          const validPlaces = placesWithCoords.filter(p => p !== null)
          console.log(`    ✓ Valid places in ${trip.destination}: ${validPlaces.length}`)
          
          if (validPlaces.length < placesWithCoords.length) {
            const rejected = placesWithCoords.length - validPlaces.length
            console.log(`    ⚠️ Rejected ${rejected} places (wrong location or geocoding failed)`)
          }
          
          allPlaces.push(...validPlaces)
        } else {
          console.log(`    ⚠️ No AI results for ${category}`)
        }

      } catch (err) {
        console.error(`    ❌ AI failed for ${category}:`, err.message)
      }
    }

    console.log(`\n  📊 Total valid places for ${trip.destination}: ${allPlaces.length}`)

    // ✅ STEP 5: Score and rank
    if (allPlaces.length > 0 && centerLocation) {
      allPlaces = groqService.scoreAndRankPlaces(allPlaces, centerLocation)
    }

    // ✅ STEP 6: Apply limit
    const limit = options.limit || 50
    allPlaces = allPlaces.slice(0, limit)

    // ✅ STEP 7: Final validation - ensure all have coordinates IN THE RIGHT CITY
    const finalPlaces = allPlaces.filter(place => {
      const hasCoords = place.lat && place.lon && 
                       place.lat !== 0 && place.lon !== 0
      
      if (!hasCoords) {
        console.warn(`  ⚠️ Filtering out ${place.name} - missing coordinates`)
        return false
      }
      
      // Double-check distance
      if (place.distanceFromCenter > 100) {
        console.warn(`  ⚠️ Filtering out ${place.name} - too far (${place.distanceFromCenter}km)`)
        return false
      }
      
      return true
    })

    console.log(`  ✅ Returning ${finalPlaces.length} recommendations for ${trip.destination}`)

    if (finalPlaces.length === 0) {
      console.warn(`  ⚠️ No valid recommendations found for ${trip.destination}`)
      return {
        places: [],
        centerLocation: centerLocation,
        budgetAnalysis: null,
        message: `No recommendations found for ${trip.destination}. Try adjusting your search.`
      }
    }

    return {
      places: finalPlaces,
      centerLocation: centerLocation,
      budgetAnalysis: null,
      message: `Found ${finalPlaces.length} recommendations in ${trip.destination}`
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
