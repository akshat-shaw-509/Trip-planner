const axios = require('axios')
const geoapifyService = require('./geoapify.service')
const { calculateDistance } = require('../utils/helpers')

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const MODEL = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

/**
 * -------------------- AI Recommendations --------------------
 */
const getAIRecommendations = async (category, destination, tripContext = {}) => {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY missing')
  }

  const {
    budget,
    duration,
    peopleCount,
    currency = 'INR'
  } = tripContext

  const prompt = `
List exactly 10 popular ${category} places in ${destination}.

Trip context:
- Budget: ${budget || 'Not specified'} ${currency}
- Trip duration: ${duration || 'Not specified'} days
- Number of people: ${peopleCount || 'Not specified'}

For each place, provide:
- NAME
- DESCRIPTION (short)
- RATING (3.5–5.0)
- PRICE (1=budget, 2=moderate, 3=expensive, 4=luxury)
- LOCATION (area or neighborhood)

Separate places using "---".
Start immediately.
`

  try {
    const response = await axios.post(
      OPENROUTER_URL,
      {
        model: MODEL,
        messages: [
          { role: 'system', content: 'You are a helpful travel guide.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
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

    const parsedPlaces = parseAIResponse(aiText, category)
    if (!parsedPlaces.length) {
      return { places: [], message: 'Could not parse AI response' }
    }

    const geocodedPlaces = await geocodePlaces(parsedPlaces, destination)

    const rankedPlaces = scoreAndRankPlaces(
      geocodedPlaces,
      tripContext.centerLocation || null
    )

    return {
      places: rankedPlaces,
      message: `Found ${rankedPlaces.length} ${category} recommendations`
    }
  } catch (error) {
    console.error('AI recommendation error:', error.message)
    return {
      places: [],
      message: `AI Error: ${error.message}`
    }
  }
}

/**
 * -------------------- AI Response Parser --------------------
 */
const parseAIResponse = (text, category) => {
  const sections = text.split('---').filter(Boolean)

  return sections
    .map(section => {
      const get = (r) => section.match(r)?.[1]?.trim()

      const name = get(/NAME:\s*(.+)/i)
      if (!name) return null

      return {
        source: 'groq_ai',
        category,
        name,
        description: get(/DESCRIPTION:\s*(.+)/i) || '',
        rating: parseFloat(get(/RATING:\s*([\d.]+)/i)) || 4.0,
        priceLevel: parseInt(get(/PRICE:\s*(\d+)/i)) || 2,
        addressHint: get(/LOCATION:\s*(.+)/i) || ''
      }
    })
    .filter(Boolean)
}

/**
 * -------------------- Geocoding --------------------
 */
const geocodePlaces = async (places, destination) => {
  const results = []

  for (const p of places) {
    try {
      const query = `${p.name}, ${p.addressHint}, ${destination}`.trim()
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
      }
    } catch (err) {
      console.error('Geocoding failed:', err.message)
    }
  }

  return results
}

/**
 * -------------------- Scoring & Ranking --------------------
 */
const scoreAndRankPlaces = (places, centerLocation) => {
  return places
    .map(place => {
      let score = (place.rating || 4) * 2

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
  getAIRecommendations
}
