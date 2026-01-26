<<<<<<< HEAD
// HTTP client for calling external geocoding APIs
let axios = require('axios')

// Custom error helper
let { BadRequestError } = require('../utils/errors')

// Base URL for Nominatim (OpenStreetMap geocoding service)
let NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'

/**
 * -------------------- Forward Geocoding --------------------
 * Converts a human-readable address into coordinates
 */
let geocodeAddress = async (address) => {
  try {
    let response = await axios.get(`${NOMINATIM_BASE}/search`, {
      params: {
        q: address,
        format: 'json',
        limit: 5,
        addressdetails: 1
      },
      headers: {
        // Required by Nominatim usage policy
        'User-Agent': 'Planora/1.0'
      }
    })

    // No results found
    if (!response.data || response.data.length === 0) {
      throw BadRequestError('Address not found')
    }

    // Normalize response
    return response.data.map(place => ({
      name: place.display_name,
      coordinates: {
        type: 'Point',
        coordinates: [
          parseFloat(place.lon),
          parseFloat(place.lat)
        ]
      },
      address: place.display_name,
      boundingBox: place.boundingbox
    }))
  } catch (error) {
    console.error('Geocoding error:', error.message)
    throw BadRequestError('Failed to geocode address')
  }
}

/**
 * -------------------- Reverse Geocoding --------------------
 * Converts coordinates into a human-readable address
 */
let reverseGeocode = async (longitude, latitude) => {
  try {
    let response = await axios.get(`${NOMINATIM_BASE}/reverse`, {
      params: {
        lon: longitude,
        lat: latitude,
        format: 'json'
      },
      headers: {
        'User-Agent': 'Planora/1.0'
      }
    })

    if (!response.data) {
      throw BadRequestError('Location not found')
    }

    return {
      name: response.data.display_name,
      address: response.data.display_name,
      coordinates: {
        type: 'Point',
        coordinates: [
          parseFloat(response.data.lon),
          parseFloat(response.data.lat)
        ]
      }
    }
  } catch (error) {
    console.error('Reverse geocoding error:', error.message)
    throw BadRequestError('Failed to reverse geocode')
  }
}

/**
 * -------------------- Route Calculation --------------------
 * Lightweight routing fallback (direct distance)
 * NOTE: Can be replaced with OpenRouteService or Mapbox later
 */
let getRoute = async (coordinates, profile = 'driving-car') => {
  if (!coordinates || coordinates.length < 2) {
    throw BadRequestError('Need at least 2 coordinates')
  }

  // Calculate total distance using Haversine formula
  let totalDistance = 0
  for (let i = 0; i < coordinates.length - 1; i++) {
    let from = coordinates[i]
    let to = coordinates[i + 1]

    totalDistance += calculateDistance(
      from.latitude,
      from.longitude,
      to.latitude,
      to.longitude
    )
  }

  return {
    distance: totalDistance * 1000, // meters
    duration: (totalDistance / 50) * 3600, // rough estimate (50 km/h)
    coordinates: coordinates.map(c => [
      c.longitude,
      c.latitude
    ]),
    profile
  }
}

/**
 * -------------------- Distance Calculation --------------------
 * Haversine formula to calculate distance between two coordinates
 */
let calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371 // Earth radius in kilometers

  let dLat = toRad(lat2 - lat1)
  let dLon = toRad(lon2 - lon1)

  let a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2

  let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Convert degrees to radians
let toRad = (deg) => deg * (Math.PI / 180)

/**
 * -------------------- Place Search --------------------
 * Searches places using Nominatim
 * Optionally biased by proximity
 */
let searchPlaces = async (query, proximity) => {
  try {
    let params = {
      q: query,
      format: 'json',
      limit: 10,
      addressdetails: 1
    }

    // Bias search around a given location
    if (proximity) {
      params.lat = proximity.latitude
      params.lon = proximity.longitude
    }

    let response = await axios.get(`${NOMINATIM_BASE}/search`, {
      params,
      headers: {
        'User-Agent': 'Planora/1.0'
      }
    })

    return response.data.map(place => ({
      id: place.place_id,
      name: place.name || place.display_name.split(',')[0],
      placeName: place.display_name,
      coordinates: {
        type: 'Point',
        coordinates: [
          parseFloat(place.lon),
          parseFloat(place.lat)
        ]
      },
      category: place.type,
      address: place.display_name
    }))
  } catch (error) {
    console.error('Place search error:', error.message)
    throw new BadRequestError('Failed to search places')
  }
}

/**
 * Export geocoding & mapping helpers
 */
module.exports = {
  geocodeAddress,
  reverseGeocode,
  getRoute,
  searchPlaces,
  calculateDistance
}
=======
// HTTP client for calling external geocoding APIs
let axios = require('axios')

// Custom error helper
let { BadRequestError } = require('../utils/errors')

// Base URL for Nominatim (OpenStreetMap geocoding service)
let NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'

/**
 * -------------------- Forward Geocoding --------------------
 * Converts a human-readable address into coordinates
 */
let geocodeAddress = async (address) => {
  try {
    let response = await axios.get(`${NOMINATIM_BASE}/search`, {
      params: {
        q: address,
        format: 'json',
        limit: 5,
        addressdetails: 1
      },
      headers: {
        // Required by Nominatim usage policy
        'User-Agent': 'Planora/1.0'
      }
    })

    // No results found
    if (!response.data || response.data.length === 0) {
      throw BadRequestError('Address not found')
    }

    // Normalize response
    return response.data.map(place => ({
      name: place.display_name,
      coordinates: {
        type: 'Point',
        coordinates: [
          parseFloat(place.lon),
          parseFloat(place.lat)
        ]
      },
      address: place.display_name,
      boundingBox: place.boundingbox
    }))
  } catch (error) {
    console.error('Geocoding error:', error.message)
    throw BadRequestError('Failed to geocode address')
  }
}

/**
 * -------------------- Reverse Geocoding --------------------
 * Converts coordinates into a human-readable address
 */
let reverseGeocode = async (longitude, latitude) => {
  try {
    let response = await axios.get(`${NOMINATIM_BASE}/reverse`, {
      params: {
        lon: longitude,
        lat: latitude,
        format: 'json'
      },
      headers: {
        'User-Agent': 'Planora/1.0'
      }
    })

    if (!response.data) {
      throw BadRequestError('Location not found')
    }

    return {
      name: response.data.display_name,
      address: response.data.display_name,
      coordinates: {
        type: 'Point',
        coordinates: [
          parseFloat(response.data.lon),
          parseFloat(response.data.lat)
        ]
      }
    }
  } catch (error) {
    console.error('Reverse geocoding error:', error.message)
    throw BadRequestError('Failed to reverse geocode')
  }
}

/**
 * -------------------- Route Calculation --------------------
 * Lightweight routing fallback (direct distance)
 * NOTE: Can be replaced with OpenRouteService or Mapbox later
 */
let getRoute = async (coordinates, profile = 'driving-car') => {
  if (!coordinates || coordinates.length < 2) {
    throw BadRequestError('Need at least 2 coordinates')
  }

  // Calculate total distance using Haversine formula
  let totalDistance = 0
  for (let i = 0; i < coordinates.length - 1; i++) {
    let from = coordinates[i]
    let to = coordinates[i + 1]

    totalDistance += calculateDistance(
      from.latitude,
      from.longitude,
      to.latitude,
      to.longitude
    )
  }

  return {
    distance: totalDistance * 1000, // meters
    duration: (totalDistance / 50) * 3600, // rough estimate (50 km/h)
    coordinates: coordinates.map(c => [
      c.longitude,
      c.latitude
    ]),
    profile
  }
}

/**
 * -------------------- Distance Calculation --------------------
 * Haversine formula to calculate distance between two coordinates
 */
let calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371 // Earth radius in kilometers

  let dLat = toRad(lat2 - lat1)
  let dLon = toRad(lon2 - lon1)

  let a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2

  let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Convert degrees to radians
let toRad = (deg) => deg * (Math.PI / 180)

/**
 * -------------------- Place Search --------------------
 * Searches places using Nominatim
 * Optionally biased by proximity
 */
let searchPlaces = async (query, proximity) => {
  try {
    let params = {
      q: query,
      format: 'json',
      limit: 10,
      addressdetails: 1
    }

    // Bias search around a given location
    if (proximity) {
      params.lat = proximity.latitude
      params.lon = proximity.longitude
    }

    let response = await axios.get(`${NOMINATIM_BASE}/search`, {
      params,
      headers: {
        'User-Agent': 'Planora/1.0'
      }
    })

    return response.data.map(place => ({
      id: place.place_id,
      name: place.name || place.display_name.split(',')[0],
      placeName: place.display_name,
      coordinates: {
        type: 'Point',
        coordinates: [
          parseFloat(place.lon),
          parseFloat(place.lat)
        ]
      },
      category: place.type,
      address: place.display_name
    }))
  } catch (error) {
    console.error('Place search error:', error.message)
    throw new BadRequestError('Failed to search places')
  }
}

/**
 * Export geocoding & mapping helpers
 */
module.exports = {
  geocodeAddress,
  reverseGeocode,
  getRoute,
  searchPlaces,
  calculateDistance
}
>>>>>>> 0007615a5a7317e8689fc9727726ee86c5585786
