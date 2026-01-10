let axios = require('axios')
let { BadRequestError } = require('../utils/errors')

// Using Nominatim (OpenStreetMap's geocoding service)
let NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'

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
        'User-Agent': 'Planora/1.0'  // Required by Nominatim
      }
    })

    if (!response.data || response.data.length === 0) {
      throw new BadRequestError('Address not found')
    }

    return response.data.map(place => ({
      name: place.display_name,
      coordinates: {
        type: 'Point',
        coordinates: [parseFloat(place.lon), parseFloat(place.lat)]
      },
      address: place.display_name,
      boundingBox: place.boundingbox
    }))
  } catch (error) {
    console.error('Geocoding error:', error.message)
    throw new BadRequestError('Failed to geocode address')
  }
}

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
      throw new BadRequestError('Location not found')
    }

    return {
      name: response.data.display_name,
      address: response.data.display_name,
      coordinates: {
        type: 'Point',
        coordinates: [parseFloat(response.data.lon), parseFloat(response.data.lat)]
      }
    }
  } catch (error) {
    console.error('Reverse geocoding error:', error.message)
    throw new BadRequestError('Failed to reverse geocode')
  }
}

// Get route using OpenRouteService (free alternative)
let getRoute = async (coordinates, profile = 'driving-car') => {
  if (!coordinates || coordinates.length < 2) {
    throw new BadRequestError('Need at least 2 coordinates')
  }

  // Note: You can use OpenRouteService for routing
  // Sign up at https://openrouteservice.org/ for free API key
  // For now, return a simple direct line
  
  let totalDistance = 0
  for (let i = 0; i < coordinates.length - 1; i++) {
    let from = coordinates[i]
    let to = coordinates[i + 1]
    totalDistance += calculateDistance(
      from.latitude, from.longitude,
      to.latitude, to.longitude
    )
  }

  return {
    distance: totalDistance * 1000, // meters
    duration: (totalDistance / 50) * 3600, // rough estimate (50km/h avg)
    coordinates: coordinates.map(c => [c.longitude, c.latitude]),
    profile
  }
}

// Haversine formula for distance calculation
let calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371 // Earth's radius in km
  let dLat = toRad(lat2 - lat1)
  let dLon = toRad(lon2 - lon1)
  let a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

let toRad = (deg) => deg * (Math.PI / 180)

// Search places using Nominatim
let searchPlaces = async (query, proximity) => {
  try {
    let params = {
      q: query,
      format: 'json',
      limit: 10,
      addressdetails: 1
    }

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
        coordinates: [parseFloat(place.lon), parseFloat(place.lat)]
      },
      category: place.type,
      address: place.display_name
    }))
  } catch (error) {
    console.error('Place search error:', error.message)
    throw new BadRequestError('Failed to search places')
  }
}

module.exports = {
  geocodeAddress,
  reverseGeocode,
  getRoute,
  searchPlaces,
  calculateDistance
}