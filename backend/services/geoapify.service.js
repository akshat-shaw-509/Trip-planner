// services/geoapify.service.js - IMPROVED for precise location search

let axios = require('axios');

const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY;
const BASE_URL = 'https://api.geoapify.com/v2/places';
const GEOCODE_URL = 'https://api.geoapify.com/v1/geocode/search';

/**
 * Geocode a location string to precise coordinates
 * Examples: "Eiffel Tower", "Times Square, New York", "Central Park"
 */
let geocodeLocation = async (locationString) => {
  try {
    if (!GEOAPIFY_API_KEY) {
      console.warn('⚠️ Geoapify API key not configured');
      return null;
    }

    console.log('🌍 Geocoding:', locationString);

    const response = await axios.get(GEOCODE_URL, {
      params: {
        text: locationString,
        apiKey: GEOAPIFY_API_KEY,
        limit: 1,
        format: 'json'
      },
      timeout: 10000
    });

    if (!response.data?.results?.[0]) {
      console.warn('❌ No geocoding results for:', locationString);
      return null;
    }

    const result = response.data.results[0];
    const coords = {
      lat: result.lat,
      lon: result.lon,
      formatted: result.formatted,
      city: result.city,
      country: result.country,
      state: result.state,
      suburb: result.suburb,
      district: result.district,
      rank: result.rank
    };

    console.log('✅ Geocoded to:', coords.formatted);
    console.log('📊 Rank info:', coords.rank);

    return coords;
  } catch (error) {
    console.error('❌ Geocoding error:', error?.response?.status || error.message);
    return null;
  }
};

/**
 * Map our categories to Geoapify categories - COMPREHENSIVE
 */
function mapCategoriesToGeoapify(categories) {
  const mapping = {
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
  };

  const out = [];
  for (const cat of categories || []) {
    const mapped = mapping[(cat || '').toLowerCase()];
    if (mapped && mapped.length) out.push(...mapped);
  }
  return Array.from(new Set(out));
}

/**
 * Infer category from Geoapify categories - IMPROVED
 */
function inferCategoryFromGeoapify(categories) {
  if (!Array.isArray(categories) || categories.length === 0) {
    return 'other';
  }
  const categoryString = categories.join(',').toLowerCase();

  // Restaurant check
  if (categoryString.includes('catering') ||
      categoryString.includes('restaurant') ||
      categoryString.includes('cafe') ||
      categoryString.includes('food') ||
      categoryString.includes('bar') ||
      categoryString.includes('pub')) {
    return 'restaurant';
  }

  // Attraction check - COMPREHENSIVE
  if (categoryString.includes('tourism') ||
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
      categoryString.includes('natural')) {
    return 'attraction';
  }

  // Accommodation check
  if (categoryString.includes('accommodation') ||
      categoryString.includes('hotel') ||
      categoryString.includes('hostel') ||
      categoryString.includes('guest')) {
    return 'accommodation';
  }

  return 'other';
}

/**
 * Generate rating based on Geoapify data
 */
function generateEstimatedRating(props) {
  let baseRating = 3.5;
  
  // Boost for famous landmarks
  const categories = props.categories || [];
  if (categories.some(c => 
    c.includes('heritage') || 
    c.includes('landmark') || 
    c.includes('unesco') ||
    c.includes('historic')
  )) {
    baseRating = 4.5;
  }
  
  // Boost for popularity
  if (props.rank?.popularity) {
    baseRating += props.rank.popularity * 2;
  }
  
  // Boost for attractions
  if (categories.some(c => c.includes('tourism') || c.includes('attraction'))) {
    baseRating += 0.5;
  }
  
  // Boost if has website/phone (indicates established place)
  if (props.website || props.phone) {
    baseRating += 0.3;
  }
  
  return Math.min(5, Math.max(3.0, baseRating));
}

/**
 * Format address from Geoapify properties
 */
function formatAddress(props) {
  const parts = [
    props.housenumber,
    props.street,
    props.suburb,
    props.city,
    props.postcode,
    props.country
  ].filter(Boolean);
  return parts.join(', ') || props.formatted || '';
}

/**
 * Infer price level
 */
function inferPriceLevel(props) {
  if (props.price_level) return props.price_level;
  const categories = props.categories || [];
  if (categories.some(c => c.includes('luxury') || c.includes('fine_dining'))) return 4;
  if (categories.some(c => c.includes('budget') || c.includes('fast_food'))) return 1;
  return 2;
}

/**
 * Normalize Geoapify place to our format
 */
function normalizeGeoapifyPlace(feature) {
  const props = feature.properties || {};
  const coords = feature.geometry?.coordinates || [0, 0];

  // Get rating from various sources
  let rating = 0;
  if (props.datasource?.raw?.rating) {
    rating = parseFloat(props.datasource.raw.rating);
  } else if (props.datasource?.raw?.stars) {
    rating = parseFloat(props.datasource.raw.stars);
  } else if (props.rank?.popularity) {
    rating = 3.5 + (props.rank.popularity * 1.5);
  } else {
    rating = generateEstimatedRating(props);
  }
  rating = Math.max(0, Math.min(5, rating));

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
  };
}

/**
 * Search places by coordinates and categories
 */
let searchPlaces = async (params) => {
  try {
    const {
      lat,
      lon,
      radius = 5000,
      categories = null,
      limit = 20,
      filters = {},
      context = null
    } = params;

    if (!GEOAPIFY_API_KEY) {
      console.warn('⚠️ Geoapify API key not configured');
      return [];
    }

    let baseQueryParams = {
      apiKey: GEOAPIFY_API_KEY,
      lat,
      lon,
      radius,
      limit: Math.min(limit, 20)
    };

    if (filters.name) {
      baseQueryParams.filter = `name:${filters.name}`;
    }

    // NO CATEGORIES: General search
    if (!categories || categories.length === 0) {
      try {
        console.log('🌍 General search at', lat, lon, 'radius', radius + 'm');
        const response = await axios.get(BASE_URL, { 
          params: baseQueryParams, 
          timeout: 10000 
        });
        const features = response.data?.features || [];
        console.log('  Found', features.length, 'places');
        return features.map(normalizeGeoapifyPlace);
      } catch (err) {
        console.error('❌ General search failed:', err.response?.status, err.message);
        return [];
      }
    }

    // WITH CATEGORIES: Search with mapped categories
    const geoapifyCategories = mapCategoriesToGeoapify(categories);
    
    if (!geoapifyCategories || geoapifyCategories.length === 0) {
      console.warn('⚠️ No mapped categories for:', categories);
      return [];
    }

    console.log('🔍 Searching categories:', geoapifyCategories.join(', '));
    console.log('📏 At radius:', radius + 'm');

    try {
      const queryParams = {
        ...baseQueryParams,
        categories: geoapifyCategories.join(',')
      };

      const response = await axios.get(BASE_URL, { 
        params: queryParams, 
        timeout: 10000 
      });
      
      const features = response.data?.features || [];
      console.log('  Found', features.length, 'places for', categories);
      
      const normalized = features.map(normalizeGeoapifyPlace);
      
      // Deduplicate
      const seen = new Set();
      const unique = normalized.filter(p => {
        const key = `${p.name}|${p.location.coordinates.join(',')}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      
      return unique;
    } catch (err) {
      console.error('❌ Category search failed:', err.response?.status, err.message);
      return [];
    }
  } catch (error) {
    console.error('❌ Geoapify service error:', error?.message || error);
    return [];
  }
};

/**
 * Search places by text query
 * Example: "famous restaurants near Eiffel Tower"
 */
let searchByText = async (query, location = null, limit = 10) => {
  try {
    if (!GEOAPIFY_API_KEY) {
      console.warn('⚠️ Geoapify API key not configured');
      return [];
    }

    console.log('🔎 Text search:', query);

    let params = { 
      apiKey: GEOAPIFY_API_KEY, 
      text: query, 
      limit: Math.min(limit, 20)
    };
    
    // Add location bias if provided
    if (location && location.lat && location.lon) {
      params.lat = location.lat;
      params.lon = location.lon;
      params.bias = 'proximity';
      console.log('  with location bias:', location.lat, location.lon);
    }

    const response = await axios.get(BASE_URL, { 
      params, 
      timeout: 10000 
    });
    
    if (!response.data?.features) {
      console.log('  No results');
      return [];
    }

    const features = response.data.features;
    console.log('  Found', features.length, 'results');
    
    return features.map(normalizeGeoapifyPlace);
  } catch (error) {
    console.error('❌ Text search error:', error.response?.status || error.message);
    return [];
  }
};

/**
 * Get place details by ID
 */
let getPlaceDetails = async (placeId) => {
  try {
    if (!GEOAPIFY_API_KEY) return null;
    
    const response = await axios.get(`${BASE_URL}/${placeId}`, {
      params: { apiKey: GEOAPIFY_API_KEY },
      timeout: 10000
    });
    
    if (!response.data) return null;
    return normalizeGeoapifyPlace(response.data);
  } catch (error) {
    console.error('❌ Place details error:', error.response?.status || error.message);
    return null;
  }
};

module.exports = {
  searchPlaces,
  getPlaceDetails,
  searchByText,
  geocodeLocation
};