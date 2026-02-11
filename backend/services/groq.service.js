const axios = require('axios')
const geoapifyService = require('./geoapify.service')
const { calculateDistance } = require('../utils/helpers')

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const MODEL = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

const POPULAR_LANDMARK_KEYWORDS = [
  'mahal', 'palace', 'fort', 'temple', 'mosque',
  'church', 'cathedral', 'monument', 'memorial',
  'museum', 'heritage', 'historic', 'tower', 'gate'
]
// check if a place should be treated as must-visit
const isMustVisit = (place) => {
  if (!place?.name) return false
  const name = place.name.toLowerCase()
  return (
    place.category === 'attraction' &&
    POPULAR_LANDMARK_KEYWORDS.some(k => name.includes(k))
  )
}
// build prompt based on filters actually selected
const buildDynamicPrompt = (category, destination, tripContext = {}) => {
  const {
    budget,
    duration,
    peopleCount,
    currency = 'INR',
    minRating,
    maxRadius,
    sortBy,
    showHiddenGems,
    topRatedOnly,
    priceRange,
    userPreferences
  } = tripContext

  let promptSections = []
  promptSections.push(`You are a knowledgeable local travel expert for ${destination}.`)
  promptSections.push(`\nGenerate exactly 35 ${category} recommendations in ${destination}.`)

  const tripContextItems = []
  if (budget) tripContextItems.push(`- Budget: ${budget} ${currency}`)
  if (duration) tripContextItems.push(`- Trip duration: ${duration} days`)
  if (peopleCount) tripContextItems.push(`- Number of travelers: ${peopleCount}`)
  if (maxRadius) tripContextItems.push(`- Search area: Within ${maxRadius} km of city center`)

  if (tripContextItems.length > 0) {
    promptSections.push(`\n TRIP DETAILS:`)
    promptSections.push(tripContextItems.join('\n'))
  }

  const qualityFilters = []
  
  if (minRating && minRating > 0) {
    qualityFilters.push(`- Minimum rating: ${minRating}/5.0 stars (DO NOT include places below this rating)`)
  }
  
  if (topRatedOnly) {
    qualityFilters.push(`- ONLY include top-rated places (4.5+ rating, highly acclaimed)`)
  }
  
  if (showHiddenGems) {
    qualityFilters.push(`- PRIORITIZE hidden gems, local favorites, and off-the-beaten-path spots`)
    qualityFilters.push(`- Avoid overly touristy or mainstream places`)
  }

  if (qualityFilters.length > 0) {
    promptSections.push(`\nQUALITY REQUIREMENTS:`)
    promptSections.push(qualityFilters.join('\n'))
  }

  // ========== PRICE RANGE (only if specified) ==========
  if (priceRange && (priceRange.min || priceRange.max)) {
    promptSections.push(`\nPRICE CONSTRAINTS:`)
    if (priceRange.min && priceRange.max) {
      promptSections.push(`- Only include places with price level ${priceRange.min} to ${priceRange.max}`)
    } else if (priceRange.min) {
      promptSections.push(`- Minimum price level: ${priceRange.min}`)
    } else if (priceRange.max) {
      promptSections.push(`- Maximum price level: ${priceRange.max}`)
    }
    promptSections.push(`- Price scale: 1=Budget, 2=Moderate, 3=Expensive, 4=Luxury, 5=Ultra-luxury`)
  }

  // ========== USER PREFERENCES (only if available) ==========
  if (userPreferences && userPreferences.topCategories?.length > 0) {
    promptSections.push(`\nUSER PREFERENCES:`)
    promptSections.push(`- This user frequently enjoys: ${userPreferences.topCategories.join(', ')}`)
    promptSections.push(`- Tailor recommendations to match these interests`)
  }

  // ========== SORTING INSTRUCTIONS (only if not default) ==========
  if (sortBy && sortBy !== 'bestMatch') {
    promptSections.push(`\nSORTING PRIORITY:`)
    if (sortBy === 'rating') {
      promptSections.push(`- Prioritize the HIGHEST-RATED places first`)
      promptSections.push(`- List in descending order by rating`)
    } else if (sortBy === 'distance') {
      promptSections.push(`- Prioritize places CLOSEST to the city center`)
      promptSections.push(`- List in order from nearest to farthest`)
    }
  }

  promptSections.push(`\n FOR EACH PLACE, PROVIDE:`)
  const outputFields = [
    '- NAME: Official name of the place',
    '- DESCRIPTION: Brief 2-3 sentence description highlighting what makes it special'
  ]

  const minRatingValue = minRating || 0
  outputFields.push(`- RATING: Realistic rating between ${minRatingValue} and 5.0`)
  outputFields.push(`- PRICE: Price level (1-5)`)
  outputFields.push(`- LOCATION: Specific neighborhood or area name in ${destination}`)
  if (showHiddenGems) {
    outputFields.push(`- HIDDEN_GEM: true/false (is this a lesser-known local favorite?)`)
  }
  if (category === 'restaurant') {
    outputFields.push(`- CUISINE: Type of cuisine (e.g., Italian, French, Japanese)`)
  } else if (category === 'attraction') {
    outputFields.push(`- BEST_TIME: Best time to visit (e.g., morning, afternoon, evening, sunset)`)
  } else if (category === 'accommodation') {
    outputFields.push(`- AMENITIES: Key amenities (comma-separated, e.g., WiFi, Pool, Spa)`)
  }
  promptSections.push(outputFields.join('\n'))
  promptSections.push(`\nIMPORTANT RULES:`)
  const criticalRules = []

  if (minRating && minRating > 0) {
    criticalRules.push(`- Every place MUST have a rating of ${minRating} or higher`)
  }

 if (maxRadius) {
  criticalRules.push(`- Prefer places within ${maxRadius} km, but include famous landmarks even if slightly farther`)
}
  criticalRules.push(`- Provide SPECIFIC neighborhood/area names for accurate location finding`)
  criticalRules.push(`- Ensure variety in locations and price levels`)

  if (showHiddenGems) {
    criticalRules.push(`- Include at least 5-6 hidden gems or local favorites`)
    criticalRules.push(`- Avoid well-known tourist traps unless exceptional`)
  }

  if (topRatedOnly) {
    criticalRules.push(`- ALL places must be 4.5+ rating - no exceptions`)
  }

  promptSections.push(criticalRules.join('\n'))
  promptSections.push(`\nSeparate each place with "---"`)
  promptSections.push(`Start immediately with the first recommendation.`)

  return promptSections.join('\n')
}

// AI Recommendations
const getAIRecommendations = async (category, destination, tripContext = {}) => {
  if (tripContext.sortBy === 'score') {
    tripContext.sortBy = 'bestMatch'
  }

  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY missing')
  }

  // Build prompt based on user's actual selections
  const prompt = buildDynamicPrompt(category, destination, tripContext)

  try {
    const response = await axios.post(
      OPENROUTER_URL,
      {
        model: MODEL,
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert local travel guide. Provide authentic, specific, well-researched recommendations tailored to user requirements.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: tripContext.showHiddenGems ? 0.8 : 0.7, // Higher creativity for hidden gems
        max_tokens: 2500
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    )

    const aiText = response.data?.choices?.[0]?.message?.content
    if (!aiText) {
      return { places: [], message: 'AI returned no content' }
    }

    const parsedPlaces = parseAIResponse(aiText, category, tripContext)
    if (!parsedPlaces.length) {
      console.warn('No places parsed from AI response')
      return { places: [], message: 'Could not parse AI response' }
    }

    const geocodedPlaces = await geocodePlaces(
  parsedPlaces,
  destination,
  tripContext.centerLocation
)

    // Apply post-processing filters
    let filteredPlaces = applyFilters(geocodedPlaces, tripContext)

    const rankedPlaces = scoreAndRankPlaces(
      filteredPlaces,
      tripContext.centerLocation || null,
      tripContext
    )

    return {
      places: rankedPlaces,
      message: `Found ${rankedPlaces.length} ${category} recommendations`,
      metadata: {
        promptLength: prompt.length,
        appliedFilters: {
          minRating: tripContext.minRating || null,
          maxRadius: tripContext.maxRadius || null,
          sortBy: tripContext.sortBy || 'bestMatch',
          hiddenGems: tripContext.showHiddenGems || false,
          topRatedOnly: tripContext.topRatedOnly || false,
          priceRange: tripContext.priceRange || null
        }
      }
    }
  } catch (error) {
    console.error('AI recommendation error:', error.message)
    return {
      places: [],
      message: `AI Error: ${error.message}`
    }
  }
}

const parseAIResponse = (text, category, tripContext = {}) => {
  const sections = text.split('---').filter(Boolean)

  return sections
    .map(section => {
      const get = (r) => section.match(r)?.[1]?.trim()

      const name =
  get(/NAME:\s*(.+)/i) ||
  get(/^\s*\d+\.\s*(.+)/m) ||
  get(/^-\s*(.+)/m)
      if (!name) return null

      const place = {
        source: 'groq_ai',
        category,
        name,
        description: get(/DESCRIPTION:\s*(.+)/i) || '',
        rating: parseFloat(get(/RATING:\s*([\d.]+)/i)) || 4.0,
        priceLevel: parseInt(get(/PRICE:\s*(\d+)/i)) || 2,
        addressHint: get(/LOCATION:\s*(.+)/i) || ''
      }

      // Parse hidden gem flag 
      if (tripContext.showHiddenGems) {
        const hiddenGemMatch = get(/HIDDEN_GEM:\s*(true|false)/i)
        if (hiddenGemMatch) {
          place.isHiddenGem = hiddenGemMatch.toLowerCase() === 'true'
        }
      }

      // Parse category-specific fields
      if (category === 'restaurant') {
        const cuisine = get(/CUISINE:\s*(.+)/i)
        if (cuisine) place.cuisine = cuisine
      }

      if (category === 'attraction') {
        const bestTime = get(/BEST_TIME:\s*(.+)/i)
        if (bestTime) place.bestTimeToVisit = bestTime
      }

      if (category === 'accommodation') {
        const amenities = get(/AMENITIES:\s*(.+)/i)
        if (amenities) place.amenities = amenities.split(',').map(a => a.trim())
      }

      return place
    })
    .filter(Boolean)
}

// Apply Filters 
const applyFilters = (places, tripContext = {}) => {
  const {
    minRating = 0,
    maxRadius = Infinity,
    topRatedOnly = false,
    showHiddenGems = false,
    priceRange = null,
    centerLocation = null
  } = tripContext

  let filtered = places.filter(place => {
    // Rating filter
    if (minRating > 0 && place.rating < minRating) {
      console.log(`Filtered out ${place.name}: rating ${place.rating} < ${minRating}`)
      return false
    }
    
    // Top rated only filter
    if (topRatedOnly && place.rating < 4.5) {
      console.log(`Filtered out ${place.name}: not top-rated (${place.rating} < 4.5)`)
      return false
    }

    // Price range filter
    if (priceRange) {
      if (priceRange.min && place.priceLevel < priceRange.min) {
        console.log(`Filtered out ${place.name}: price ${place.priceLevel} < ${priceRange.min}`)
        return false
      }
      if (priceRange.max && place.priceLevel > priceRange.max) {
        console.log(`Filtered out ${place.name}: price ${place.priceLevel} > ${priceRange.max}`)
        return false
      }
    }

    // Distance filter
if (centerLocation && place.location?.coordinates && maxRadius < Infinity) {
  const dist = calculateDistance(
    centerLocation.lat,
    centerLocation.lon,
    place.location.coordinates[1],
    place.location.coordinates[0]
  )
  if (!isMustVisit(place) && dist > maxRadius) {
    return false
  }
}
    return true
  })

  // If showing hidden gems, boost those in the results
  if (showHiddenGems) {
    filtered = filtered.sort((a, b) => {
      if (a.isHiddenGem && !b.isHiddenGem) return -1
      if (!a.isHiddenGem && b.isHiddenGem) return 1
      return 0
    })
  }

  return filtered
}

const geocodePlaces = async (places, destination, centerLocation) => {
  const results = []

  for (const p of places) {
    try {
      const query = `${p.name}, ${p.addressHint || ''}, ${destination}`.trim()
      const geo = await geoapifyService.geocodeLocation(query)

      if (geo?.lat && geo?.lon) {
        results.push({
          ...p,
          address: geo.formatted,
          location: {
            type: 'Point',
            coordinates: [geo.lon, geo.lat]
          }
        })
      } else {
        results.push({
          ...p,
          address: p.addressHint || destination,
          location: {
            type: 'Point',
            coordinates: [
              centerLocation.lon,
              centerLocation.lat
            ]
          },
          isApproximateLocation: true
        })
      }
    } catch (err) {
      results.push({
        ...p,
        address: p.addressHint || destination,
        location: {
          type: 'Point',
          coordinates: [
            centerLocation.lon,
            centerLocation.lat
          ]
        },
        isApproximateLocation: true
      })
    }
  }

  return results
}


// Scoring & Ranking
const scoreAndRankPlaces = (places, centerLocation, tripContext = {}) => {
  const {
    sortBy = 'bestMatch',
    userPreferences = null,
    showHiddenGems = false,
    topRatedOnly = false
  } = tripContext

  const scoredPlaces = places.map(place => {
    let score = 0
    // Base rating 
score += (place.rating || 4) * 1.5
// Must-Visit boost 
if (isMustVisit(place)) {
  score += 30
  place.badges = ['Must Visit']
}

// Soft distance rule
if (centerLocation && place.location?.coordinates) {
  const dist = calculateDistance(
    centerLocation.lat,
    centerLocation.lon,
    place.location.coordinates[1],
    place.location.coordinates[0]
  )

  place.distanceFromCenter = dist

  if (isMustVisit(place)) {
    score += Math.max(0, 25 - dist * 0.4) 
  } else {
    score += Math.max(0, 20 - dist * 1.2) // normal places
  }
}

if (showHiddenGems && place.isHiddenGem) {
  score += 5
}
    // Top rated bonus (3 points)
    if (topRatedOnly && place.rating >= 4.5) {
      score += 3
    }

    // User preference bonus (0-10 points)
    if (userPreferences?.categoryWeights) {
      const categoryWeight = userPreferences.categoryWeights.get(place.category) || 0
      score += Math.min(10, categoryWeight / 2) // Normalize to 0-10
    }

    place.recommendationScore = Math.round(score * 10) / 10
    return place
  })

  const mustVisit = []
const regular = []

for (const p of scoredPlaces) {
  if (isMustVisit(p)) mustVisit.push(p)
  else regular.push(p)
}

mustVisit.sort((a, b) => b.recommendationScore - a.recommendationScore)
regular.sort((a, b) => b.recommendationScore - a.recommendationScore)

let merged = [...mustVisit, ...regular]

// override sorting
if (sortBy === 'rating') {
  return merged.sort((a, b) => b.rating - a.rating)
}

if (sortBy === 'distance') {
  return merged.sort((a, b) => {
    const da = a.distanceFromCenter ?? Infinity
    const db = b.distanceFromCenter ?? Infinity
    return da - db
  })
}

return merged
}

module.exports = {
  getAIRecommendations,
  scoreAndRankPlaces
}
