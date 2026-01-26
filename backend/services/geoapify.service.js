
// Axios -> used for making HTTP requests to Geoapify APIs
let axios = require('axios')

// Geoapify API configuration
let GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY
let BASE_URL = 'https://api.geoapify.com/v2/places'
let GEOCODE_URL = 'https://api.geoapify.com/v1/geocode/search'

/**
 * -------------------- Geocoding --------------------
 * Converts a human-readable location into coordinates
 */
let geocodeLocation = async (locationString) => {
  try {
    if (!GEOAPIFY_API_KEY) {
      console.warn('Geoapify API key not configured')
      return null
    }

    console.log('Geocoding:', locationString)

    let response = await axios.get(GEOCODE_URL, {
      params: {
        text: locationString,
        apiKey: GEOAPIFY_API_KEY,
        limit: 1,
        format: 'json'
      },
      timeout: 10000
    })

    // No results found
    if (!response.data?.results?.[0]) {
      console.warn('No geocoding results for:', locationString)
      return null
    }

    let result = response.data.results[0]

    // Normalize geocode response
    let coords = {
      lat: result.lat,
      lon: result.lon,
      formatted: result.formatted,
      city: result.city,
      country: result.country,
      state: result.state,
      suburb: result.suburb,
      district: result.district,
      rank: result.rank
    }

    console.log('Geocoded to:', coords.formatted)
    console.log('Rank info:', coords.rank)

    return coords
  } catch (error) {
    console.error('Geocoding error:', error?.response?.status || error.message)
    return null
  }
}

/**
 * -------------------- Category Mapping --------------------
 * Maps internal categories to Geoapify category taxonomy
 */
let mapCategoriesToGeoapify = (categories) => {
  let mapping = {
    restaurant: [
      'catering.restaurant',
      'catering.fast_food',
      'catering.cafe',
      'catering.food_court',
      'catering.pub',
      'catering.bar',
      'catering.biergarten'
    ],
    attraction: [
      'tourism.attraction',
      'tourism.sights',
      'entertainment.museum',
      'entertainment.theme_park',
      'entertainment.zoo',
      'entertainment.aquarium',
      'heritage.unesco',
      'heritage',
      'building.historic',
      'leisure.park',
      'natural.beach',
      'natural.mountain',
      'natural.water'
    ],
    accommodation: [
      'accommodation.hotel',
      'accommodation.hostel',
      'accommodation.guest_house',
      'accommodation.apartment'
    ]
  }

  let out = []

  for (let cat of categories || []) {
    let mapped = mapping[(cat || '').toLowerCase()]
    if (mapped && mapped.length) out.push(...mapped)
  }

  // Remove duplicates
  return Array.from(new Set(out))
}

/**
 * Infer internal category from Geoapify categories
 */
let inferCategoryFromGeoapify = (categories) => {
  if (!Array.isArray(categories) || categories.length === 0) {
    return 'other'
  }

  let categoryString = categories.join(',').toLowerCase()

  if (
    categoryString.includes('catering') ||
    categoryString.includes('restaurant') ||
    categoryString.includes('cafe') ||
    categoryString.includes('food') ||
    categoryString.includes('bar') ||
    categoryString.includes('pub')
  ) {
    return 'restaurant'
  }

  if (
    categoryString.includes('tourism') ||
    categoryString.includes('attraction') ||
    categoryString.includes('sights') ||
    categoryString.includes('museum') ||
    categoryString.includes('monument') ||
    categoryString.includes('heritage') ||
    categoryString.includes('entertainment') ||
    categoryString.includes('theme_park') ||
    categoryString.includes('zoo') ||
    categoryString.includes('aquarium') ||
    categoryString.includes('leisure') ||
    categoryString.includes('park') ||
    categoryString.includes('historic') ||
    categoryString.includes('landmark') ||
    categoryString.includes('culture') ||
    categoryString.includes('beach') ||
    categoryString.includes('mountain') ||
    categoryString.includes('natural')
  ) {
    return 'attraction'
  }

  if (
    categoryString.includes('accommodation') ||
    categoryString.includes('hotel') ||
    categoryString.includes('hostel') ||
    categoryString.includes('guest')
  ) {
    return 'accommodation'
  }

  return 'other'
}

/**
 * -------------------- Rating & Pricing Heuristics --------------------
 */

/**
 * Generate estimated rating when no explicit rating is available
 */
let generateEstimatedRating = (props) => {
  let baseRating = 3.5
  let categories = props.categories || []

  // Boost for heritage / landmarks
  if (
    categories.some(c =>
      c.includes('heritage') ||
      c.includes('landmark') ||
      c.includes('unesco') ||
      c.includes('historic')
    )
  ) {
    baseRating = 4.5
  }

  // Boost based on popularity
  if (props.rank?.popularity) {
    baseRating += props.rank.popularity * 2
  }

  // Tourist spots slight boost
  if (categories.some(c => c.includes('tourism') || c.includes('attraction'))) {
    baseRating += 0.5
  }

  // Presence of contact details boosts trust
  if (props.website || props.phone) {
    baseRating += 0.3
  }

  return Math.min(5, Math.max(3.0, baseRating))
}

/**
 * Format address from Geoapify properties
 */
let formatAddress = (props) => {
  let parts = [
    props.housenumber,
    props.street,
    props.suburb,
    props.city,
    props.postcode,
    props.country
  ].filter(Boolean)

  return parts.join(', ') || props.formatted || ''
}

/**
 * Infer price level from metadata
 */
let inferPriceLevel = (props) => {
  if (props.price_level) return props.price_level

  let categories = props.categories || []

  if (categories.some(c => c.includes('luxury') || c.includes('fine_dining'))) return 4
  if (categories.some(c => c.includes('budget') || c.includes('fast_food'))) return 1

  return 2
}

/**
 * -------------------- Normalization --------------------
 * Converts Geoapify place into internal place format
 */
let normalizeGeoapifyPlace = (feature) => {
  let props = feature.properties || {}
  let coords = feature.geometry?.coordinates || [0, 0]

  // Resolve rating from multiple possible sources
  let rating = 0
  if (props.datasource?.raw?.rating) {
    rating = parseFloat(props.datasource.raw.rating)
  } else if (props.datasource?.raw?.stars) {
    rating = parseFloat(props.datasource.raw.stars)
  } else if (props.rank?.popularity) {
    rating = 3.5 + (props.rank.popularity * 1.5)
  } else {
    rating = generateEstimatedRating(props)
  }

  rating = Math.max(0, Math.min(5, rating))

  return {
    externalId: props.place_id || props.osm_id || props.xid || '',
    name: props.name || props.street || 'Unnamed Place',
    category: inferCategoryFromGeoapify(props.categories || []),
    address: formatAddress(props),
    location: { type: 'Point', coordinates: coords },
    rating: Math.round(rating * 10) / 10,
    priceLevel: inferPriceLevel(props),
    description: props.description || '',
    website: props.website,
    phone: props.phone,
    openingHours: props.opening_hours,
    source: 'geoapify',
    rawData: {
      categories: props.categories,
      rank: props.rank,
      datasource: props.datasource
    }
  }
}

/**
 * -------------------- Place Search --------------------
 * Search places using coordinates and optional categories
 */
let searchPlaces = async (params) => {
  try {
    let {
      lat,
      lon,
      radius = 5000,
      categories = null,
      limit = 20,
      filters = {},
      context = null
    } = params

    if (!GEOAPIFY_API_KEY) {
      console.warn('Geoapify API key not configured')
      return []
    }

    let baseQueryParams = {
      apiKey: GEOAPIFY_API_KEY,
      lat,
      lon,
      radius,
      limit: Math.min(limit, 20)
    }

    // Name-based filtering
    if (filters.name) {
      baseQueryParams.filter = `name:${filters.name}`
    }

    /**
     * General search (no categories)
     */
    if (!categories || categories.length === 0) {
      try {
        console.log('General search at', lat, lon, 'radius', radius + 'm')

        let response = await axios.get(BASE_URL, {
          params: baseQueryParams,
          timeout: 10000
        })

        let features = response.data?.features || []
        console.log('Found', features.length, 'places')

        return features.map(normalizeGeoapifyPlace)
      } catch (err) {
        console.error('General search failed:', err.response?.status, err.message)
        return []
      }
    }

    /**
     * Category-based search
     */
    let geoapifyCategories = mapCategoriesToGeoapify(categories)
    if (!geoapifyCategories.length) {
      console.warn('No mapped categories for:', categories)
      return []
    }

    console.log('Searching categories:', geoapifyCategories.join(', '))
    console.log('At radius:', radius + 'm')

    try {
      let response = await axios.get(BASE_URL, {
        params: {
          ...baseQueryParams,
          categories: geoapifyCategories.join(',')
        },
        timeout: 10000
      })

      let features = response.data?.features || []
      console.log('Found', features.length, 'places for', categories)

      // Normalize and deduplicate results
      let normalized = features.map(normalizeGeoapifyPlace)
      let seen = new Set()

      return normalized.filter(p => {
        let key = `${p.name}|${p.location.coordinates.join(',')}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    } catch (err) {
      console.error('Category search failed:', err.response?.status, err.message)
      return []
    }
  } catch (error) {
    console.error('Geoapify service error:', error?.message || error)
    return []
  }
}

/**
 * -------------------- Text Search --------------------
 * Search places by free-text query
 */
let searchByText = async (query, location = null, limit = 10) => {
  try {
    if (!GEOAPIFY_API_KEY) {
      console.warn('Geoapify API key not configured')
      return []
    }

    console.log('Text search:', query)

    let params = {
      apiKey: GEOAPIFY_API_KEY,
      text: query,
      limit: Math.min(limit, 20)
    }

    // Apply proximity bias if location provided
    if (location?.lat && location?.lon) {
      params.lat = location.lat
      params.lon = location.lon
      params.bias = 'proximity'
      console.log('with location bias:', location.lat, location.lon)
    }

    let response = await axios.get(BASE_URL, {
      params,
      timeout: 10000
    })

    if (!response.data?.features) {
      console.log('No results')
      return []
    }

    console.log('Found', response.data.features.length, 'results')
    return response.data.features.map(normalizeGeoapifyPlace)
  } catch (error) {
    console.error('Text search error:', error.response?.status || error.message)
    return []
  }
}

/**
 * -------------------- Place Details --------------------
 * Fetch detailed information for a single place
 */
let getPlaceDetails = async (placeId) => {
  try {
    if (!GEOAPIFY_API_KEY) return null

    let response = await axios.get(`${BASE_URL}/${placeId}`, {
      params: { apiKey: GEOAPIFY_API_KEY },
      timeout: 10000
    })

    if (!response.data) return null
    return normalizeGeoapifyPlace(response.data)
  } catch (error) {
    console.error('Place details error:', error.response?.status || error.message)
    return null
  }
}

/**
 * Export Geoapify service methods
 */
module.exports = {
  searchPlaces,
  getPlaceDetails,
  searchByText,
  geocodeLocation
}