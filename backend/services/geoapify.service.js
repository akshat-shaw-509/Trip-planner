let axios = require('axios')

let GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY
let BASE_URL = 'https://api.geoapify.com/v2/places'
let GEOCODE_URL = 'https://api.geoapify.com/v1/geocode/search'

//Geocode a location string into coordinates
let geocodeLocation = async (locationString) => {
  try {
    if (!GEOAPIFY_API_KEY) return null

    let response = await axios.get(GEOCODE_URL, {
      params: {
        text: locationString,
        apiKey: GEOAPIFY_API_KEY,
        limit: 1,
        format: 'json'
      },
      timeout: 10000
    })

    if (!response.data?.results?.[0]) return null

    let result = response.data.results[0]

    return {
      lat: result.lat,
      lon: result.lon,
      formatted: result.formatted,
      city: result.city,
      country: result.country,
      state: result.state
    }
  } catch (error) {
    console.error('Geocoding error:', error?.response?.status || error.message)
    return null
  }
}

//Category Mapping
let mapCategoriesToGeoapify = (categories) => {
  let mapping = {
    restaurant: [
      'catering.restaurant',
      'catering.fast_food',
      'catering.cafe'
    ],
   attraction: [
  'tourism.attraction',
  'tourism.sights',
  'tourism.landmark',
  'heritage',
  'historic',
  'building.historic',
  'monument',
  'entertainment.museum',
  'leisure.park'
],
    accommodation: [
      'accommodation.hotel',
      'accommodation.hostel',
      'accommodation.guest_house'
    ]
  }

  let out = []

  for (let cat of categories || []) {
    let mapped = mapping[(cat || '').toLowerCase()]
    if (mapped) out.push(...mapped)
  }

  return [...new Set(out)]
}
//infer internal category from geoapify categories
let inferCategoryFromGeoapify = (categories) => {
  if (!Array.isArray(categories)) return 'other'

  let str = categories.join(',').toLowerCase()

  if (str.includes('catering') || str.includes('restaurant') || str.includes('cafe')) {
    return 'restaurant'
  }

  if (str.includes('tourism') || str.includes('attraction') || str.includes('museum') || str.includes('park')) {
    return 'attraction'
  }

  if (str.includes('accommodation') || str.includes('hotel') || str.includes('hostel')) {
    return 'accommodation'
  }

  return 'other'
}

//simple rating heuristic when real rating is missing
let generateEstimatedRating = (props) => {
  let rating = 3.5

  if (props.rank?.popularity) {
    rating += props.rank.popularity * 2
  }

  if (props.website || props.phone) {
    rating += 0.3
  }

  return Math.min(5, Math.max(3.0, rating))
}
//guess price level if not provided
let inferPriceLevel = (props) => {
  if (props.price_level) return props.price_level
  let categories = props.categories || []

  if (categories.some(c => c.includes('luxury'))) return 4
  if (categories.some(c => c.includes('budget') || c.includes('fast_food'))) return 1

  return 2
}
// build address string
let formatAddress = (props) => {
  return [
    props.housenumber,
    props.street,
    props.city,
    props.postcode,
    props.country
  ].filter(Boolean).join(', ') || props.formatted || ''
}

let normalizeGeoapifyPlace = (feature) => {
  let props = feature.properties || {}
  let coords = feature.geometry?.coordinates || [0, 0]

  let rating =
    props.datasource?.raw?.rating ||
    props.datasource?.raw?.stars ||
    generateEstimatedRating(props)

  rating = Math.max(0, Math.min(5, Number(rating)))

  return {
    externalId: props.place_id || props.osm_id || '',
    name: props.name || 'Unnamed Place',
    category: inferCategoryFromGeoapify(props.categories || []),
    address: formatAddress(props),
    location: { type: 'Point', coordinates: coords },
    rating: Math.round(rating * 10) / 10,
    priceLevel: inferPriceLevel(props),
    description: props.description || '',
    website: props.website,
    phone: props.phone,
    openingHours: props.opening_hours,
    source: 'geoapify'
  }
}

//search nearby places using geoapify
let searchPlaces = async (params) => {
  try {
    let { lat, lon, radius = 5000, categories = null, limit = 20, filters = {} } = params
    if (!GEOAPIFY_API_KEY) return []

    let baseQueryParams = {
      apiKey: GEOAPIFY_API_KEY,
      lat,
      lon,
      radius,
      limit: Math.min(limit, 20)
    }

    if (filters.name) {
      baseQueryParams.filter = `name:${filters.name}`
    }

    let geoapifyCategories = mapCategoriesToGeoapify(categories)

    let response = await axios.get(BASE_URL, {
      params: geoapifyCategories.length
        ? { ...baseQueryParams, categories: geoapifyCategories.join(',') }
        : baseQueryParams,
      timeout: 10000
    })

    let features = response.data?.features || []

    let normalized = features.map(normalizeGeoapifyPlace)
    let seen = new Set()

    return normalized.filter(p => {
      let key = `${p.name}|${p.location.coordinates.join(',')}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  } catch (error) {
    console.error('Search error:', error?.response?.status || error.message)
    return []
  }
}

//text-based search
let searchByText = async (query, location = null, limit = 10) => {
  try {
    if (!GEOAPIFY_API_KEY) return []

    let params = {
      apiKey: GEOAPIFY_API_KEY,
      text: query,
      limit: Math.min(limit, 20)
    }

    if (location?.lat && location?.lon) {
      params.lat = location.lat
      params.lon = location.lon
      params.bias = 'proximity'
    }

    let response = await axios.get(BASE_URL, {
      params,
      timeout: 10000
    })

    return (response.data?.features || []).map(normalizeGeoapifyPlace)
  } catch (error) {
    console.error('Text search error:', error?.response?.status || error.message)
    return []
  }
}

//get full details for a place
let getPlaceDetails = async (placeId) => {
  try {
    if (!GEOAPIFY_API_KEY) return null

    let response = await axios.get(`${BASE_URL}/${placeId}`, {
      params: { apiKey: GEOAPIFY_API_KEY },
      timeout: 10000
    })

    return response.data ? normalizeGeoapifyPlace(response.data) : null
  } catch (error) {
    console.error('Place details error:', error?.response?.status || error.message)
    return null
  }
}

module.exports = {
  searchPlaces,
  searchByText,
  getPlaceDetails,
  geocodeLocation
}
