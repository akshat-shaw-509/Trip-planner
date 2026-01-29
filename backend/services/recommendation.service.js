const groqService = require('./groq.service')
const geoapifyService = require('./geoapify.service')

/**
 * Main recommendation service
 * Fetches AI recommendations with STRICT city validation
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
    console.log('  Country:', trip.country)
    console.log('  Category:', options.category || 'all')

    // ✅ STEP 1: Get center location coordinates
    let centerLocation = null
    
    if (trip.destinationCoords && trip.destinationCoords.length === 2) {
      centerLocation = {
        lat: trip.destinationCoords[1],
        lon: trip.destinationCoords[0]
      }
      console.log('  ✓ Using saved trip coords:', centerLocation)
    } else {
      // ✅ GEOCODE THE DESTINATION
      console.log('  🔍 Geocoding destination:', trip.destination)
      
      let geocoded = null
      
      // Build a precise query
      const searchQuery = trip.country 
        ? `${trip.destination}, ${trip.country}`
        : trip.destination
      
      console.log('  🔍 Search query:', searchQuery)
      
      geocoded = await geoapifyService.geocodeLocation(searchQuery)
      
      if (geocoded) {
        centerLocation = { lat: geocoded.lat, lon: geocoded.lon }
        console.log('  ✓ Geocoded successfully:', geocoded.formatted)
        console.log('  ✓ Coordinates:', centerLocation)
        
        // Save to trip for future use
        trip.destinationCoords = [geocoded.lon, geocoded.lat]
        await trip.save()
        console.log('  ✓ Saved coordinates to trip')
      } else {
        // ✅ CRITICAL: FAIL if we can't find the destination
        console.error('  ❌ GEOCODING FAILED for:', searchQuery)
        throw new Error(
          `Unable to find location for "${trip.destination}". ` +
          `Please verify the destination name. Examples: "Venice, Italy", "Paris, France", "Tokyo, Japan"`
        )
      }
    }

    // Verify we have valid coordinates
    if (!centerLocation || !centerLocation.lat || !centerLocation.lon) {
      throw new Error('Invalid center location coordinates')
    }

    console.log('  ✅ Trip center established:', centerLocation)

    // ✅ STEP 2: Determine categories to search
    let categories = []
    if (options.category && options.category !== 'all') {
      categories = [options.category]
    } else {
      categories = ['restaurant', 'attraction', 'accommodation']
    }

    console.log('  📋 Fetching categories:', categories.join(', '))

    // ✅ STEP 3: Fetch AI recommendations
    let allPlaces = []

    for (const category of categories) {
      console.log(`\n  🤖 Requesting ${category}s from AI for ${trip.destination}...`)
      
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
          
          // ✅ STEP 4: GEOCODE & VALIDATE EACH PLACE
          const validatedPlaces = []
          
          for (const place of result.places) {
            try {
              // Build precise geocoding query including destination city
              const placeQuery = `${place.name}, ${trip.destination}${trip.country ? ', ' + trip.country : ''}`
              
              console.log(`    🔍 Geocoding: ${placeQuery}`)
              
              const coords = await geoapifyService.geocodeLocation(placeQuery)
              
              if (!coords) {
                console.warn(`    ⚠️ Geocoding failed for: ${place.name}`)
                continue
              }
              
              // ✅ STRICT VALIDATION: Check distance from trip center
              const distance = calculateDistance(
                centerLocation.lat,
                centerLocation.lon,
                coords.lat,
                coords.lon
              )
              
              // ✅ REJECT if place is more than 50km from destination center
              if (distance > 50) {
                console.warn(`    ❌ REJECTED ${place.name}: ${distance.toFixed(1)}km away (expected <50km)`)
                console.warn(`       AI suggested: ${coords.formatted}`)
                console.warn(`       Expected near: ${trip.destination}`)
                continue
              }
              
              // ✅ ADDITIONAL VALIDATION: Check if city name matches
              const resultCity = coords.city || coords.county || ''
              const expectedCity = trip.destination.toLowerCase()
              
              if (resultCity && !resultCity.toLowerCase().includes(expectedCity.split(',')[0].trim().toLowerCase())) {
                console.warn(`    ❌ REJECTED ${place.name}: Wrong city`)
                console.warn(`       Found: ${resultCity}`)
                console.warn(`       Expected: ${trip.destination}`)
                continue
              }
              
              console.log(`    ✅ VALIDATED ${place.name}: ${distance.toFixed(1)}km from center`)
              
              // Add the validated place
              validatedPlaces.push({
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
              })
              
              // Rate limiting
              await sleep(100)
              
            } catch (err) {
              console.error(`    ❌ Error processing ${place.name}:`, err.message)
            }
          }
          
          console.log(`    ✅ Validated ${validatedPlaces.length}/${result.places.length} ${category}s`)
          allPlaces.push(...validatedPlaces)
          
        } else {
          console.log(`    ⚠️ No AI results for ${category}`)
        }

      } catch (err) {
        console.error(`    ❌ AI request failed for ${category}:`, err.message)
      }
    }

    console.log(`\n  📊 Total validated places for ${trip.destination}: ${allPlaces.length}`)

    if (allPlaces.length === 0) {
      console.warn(`  ⚠️ No valid recommendations found for ${trip.destination}`)
      return {
        places: [],
        centerLocation: centerLocation,
        budgetAnalysis: null,
        message: `No recommendations found for ${trip.destination}. The AI may need more specific guidance.`
      }
    }

    // ✅ STEP 5: Score and rank
    if (centerLocation) {
      allPlaces = groqService.scoreAndRankPlaces(allPlaces, centerLocation)
    }

    // ✅ STEP 6: Apply limit
    const limit = options.limit || 50
    allPlaces = allPlaces.slice(0, limit)

    console.log(`  ✅ Returning ${allPlaces.length} recommendations for ${trip.destination}`)

    return {
      places: allPlaces,
      centerLocation: centerLocation,
      budgetAnalysis: null,
      message: `Found ${allPlaces.length} recommendations in ${trip.destination}`
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
  
  return Math.round(distance * 10) / 10
}

function toRad(degrees) {
  return degrees * (Math.PI / 180)
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
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

console.log('✅ recommendation.service.js loaded with STRICT CITY VALIDATION')
