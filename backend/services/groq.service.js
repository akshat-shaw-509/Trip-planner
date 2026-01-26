// HTTP client for calling OpenRouter (Groq-compatible) API
const axios = require('axios')

// Geoapify service for geocoding AI-suggested places
const geoapifyService = require('./geoapify.service')

// Helper to calculate distance between two coordinates
const { calculateDistance } = require('../utils/helpers')

// OpenRouter / Groq configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const MODEL = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

/**
 * AI Recommendations Entry Point
 * Generates place recommendations using LLM
 */
const getAIRecommendations = async (category, destination, tripContext = {}) => {
  console.log('OPENROUTER CALLED:', category, destination)

  // Ensure API key is present
  if (!OPENROUTER_API_KEY) {
    console.error('OPENROUTER_API_KEY missing in environment')
    throw new Error('OPENROUTER_API_KEY missing')
  }

  console.log('API Key present:', OPENROUTER_API_KEY.substring(0, 15) + '...')

  /**
   * Extract trip context
   */
  const {
    budget,
    duration,
    peopleCount,
    currency = 'INR'
  } = tripContext

  /**
   * Simple, focused prompt for better results
   */
  const prompt = `List exactly 10 popular ${category} places in ${destination}.

For each place, provide:
- NAME: [name]
- DESCRIPTION: [brief description]
- RATING: [number from 3.5 to 5.0]
- PRICE: [1=budget, 2=moderate, 3=expensive, 4=luxury]
- WHY: [one reason to visit]
- LOCATION: [specific area/neighborhood]

Format each place with "---" separator.
Start immediately with the first place.`

  try {
    /**
     * OpenRouter API Call
     */
    console.log('Making OpenRouter request...')
    console.log('Model:', MODEL)
    
    const response = await axios.post(
      OPENROUTER_URL,
      {
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful travel guide. Provide accurate, real place recommendations.'
          },
          { 
            role: 'user', 
            content: prompt 
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5000',
          'X-Title': 'Planora Trip Planner'
        },
        timeout: 30000
      }
    )

    console.log('OpenRouter response received')
    console.log('Response status:', response.status)

    const aiText = response.data?.choices?.[0]?.message?.content
    
    if (!aiText) {
      console.error('No AI response content')
      console.log('Full response:', JSON.stringify(response.data, null, 2))
      return {
        budgetAnalysis: null,
        places: [],
        message: 'AI returned no content'
      }
    }

    console.log('AI response length:', aiText.length)
    console.log('AI response preview:', aiText.substring(0, 200))

    /**
     * Parse AI response into structured places
     */
    const places = parseAIResponse(aiText, category)
    console.log('Parsed', places.length, 'places from AI')

    if (places.length === 0) {
      console.warn('AI response parsing resulted in 0 places')
      console.log('Full AI text:', aiText)
      return {
        budgetAnalysis: null,
        places: [],
        message: 'Could not parse AI recommendations'
      }
    }

    /**
     * Geocode the places
     */
    console.log('Starting geocoding for', places.length, 'places...')
    const geocodedPlaces = await geocodePlaces(places, destination)
    console.log('Geocoded', geocodedPlaces.length, 'places successfully')

    return {
      budgetAnalysis: {
        budgetLevel: budget ? 'AVERAGE' : 'NOT_SPECIFIED',
        minimumRequired: null,
        averageRange: null,
        explanation: `Found ${geocodedPlaces.length} recommendations for ${category} in ${destination}`
      },
      places: geocodedPlaces,
      message: `Found ${geocodedPlaces.length} ${category} recommendations`
    }

  } catch (error) {
    console.error('OpenRouter API Error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    })

    // Return empty results instead of throwing
    return {
      budgetAnalysis: null,
      places: [],
      message: `API Error: ${error.message}`
    }
  }
}

/**
 * AI Place Parser
 * Converts AI free-text response into structured place objects
 */
const parseAIResponse = (text, category) => {
  console.log('Parsing AI response...')
  
  const places = []
  const sections = text.split('---').filter(s => s.trim())

  console.log('Found', sections.length, 'sections in response')

  for (const section of sections) {
    try {
      const get = (regex) => {
        const match = section.match(regex)
        return match ? match[1].trim() : null
      }

      const name = get(/NAME:\s*(.+)/i)
      
      if (!name) {
        console.log('Skipping section - no name found')
        continue
      }

      const place = {
        category,
        source: 'groq_ai',
        name,
        description: get(/DESCRIPTION:\s*(.+)/i) || `A popular ${category} in the area`,
        rating: parseFloat(get(/RATING:\s*([\d.]+)/i)) || 4.0,
        priceLevel: parseInt(get(/PRICE:\s*(\d+)/i)) || 2,
        whyVisit: get(/WHY:\s*(.+)/i) || 'Highly recommended',
        addressHint: get(/LOCATION:\s*(.+)/i) || ''
      }

      places.push(place)
      console.log('Parsed place:', place.name)

    } catch (err) {
      console.error('Error parsing section:', err.message)
    }
  }

  return places
}

/**
 * Geocode AI Places
 * Converts AI-generated place names into coordinates
 */
const geocodePlaces = async (places, destination) => {
  const results = []

  for (const p of places) {
    try {
      const query = `${p.name}, ${p.addressHint || ''}, ${destination}`.replace(/,\s*,/g, ',').trim()
      
      console.log('Geocoding:', query)
      const geo = await geoapifyService.geocodeLocation(query)

      if (geo?.lat && geo?.lon) {
        results.push({
          ...p,
          location: { type: 'Point', coordinates: [geo.lon, geo.lat] },
          address: geo.formatted,
          confidence: geo.rank?.confidence || 0,
          popularity: geo.rank?.popularity || 0
        })
        console.log('✓ Geocoded:', p.name)
      } else {
        console.warn('✗ Geocoding failed for:', p.name)
      }
    } catch (err) {
      console.error('Geocoding error for', p.name, ':', err.message)
    }
  }

  return results
}

/**
 * Scoring & Ranking
 * Assigns recommendation score based on rating, distance, popularity
 */
const scoreAndRankPlaces = (places, centerLocation) => {
  return places
    .map(place => {
      let score = (place.rating || 4) * 2

      if (place.popularity) score += Math.min(5, place.popularity * 10)
      if (place.confidence) score += place.confidence * 5

      if (centerLocation && place.location?.coordinates) {
        const dist = calculateDistance(
          centerLocation.lat,
          centerLocation.lon,
          place.location.coordinates[1],
          place.location.coordinates[0]
        )
        place.distanceFromCenter = dist
        score += Math.max(0, 20 - dist)
      }

      return {
        ...place,
        recommendationScore: Math.round(score * 10) / 10
      }
    })
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
}

module.exports = {
  getAIRecommendations,
  scoreAndRankPlaces
}