// services/recommendation.service.js - PURE GROQ AI ONLY

let Place = require('../models/Place.model');
let Trip = require('../models/Trip.model');
let UserPreference = require('../models/UserPreference.model');
let groqService = require('./groq.service');
let geoapifyService = require('./geoapify.service');
let { NotFoundError, ForbiddenError } = require('../utils/errors');
let { calculateDistance } = require('../utils/helpers');

/**
 * Get recommendations - ALWAYS USES AI
 */
let getRecommendations = async (tripId, userId, options = {}) => {
  const trip = await Trip.findById(tripId);
  if (!trip) throw NotFoundError('Trip not found');
  if (trip.userId.toString() !== userId.toString()) {
    throw ForbiddenError('Access denied');
  }

  const userPref = await UserPreference.getOrCreate(userId);
  const existingPlaces = await Place.find({ tripId }).lean();
  
  console.log('🎯 Destination:', trip.destination);
  console.log('📂 Category:', options.category || 'all');

  // Get trip center location for distance calculation
  const centerLocation = await getTripCenter(trip, existingPlaces);

  // Determine which categories to fetch
  let categoriesToFetch = [];
  
  if (options.category && options.category !== 'all') {
    // Single category requested
    categoriesToFetch = [options.category];
  } else {
    // All categories
    categoriesToFetch = ['restaurant', 'attraction', 'accommodation'];
  }

  console.log('🤖 Fetching AI recommendations for categories:', categoriesToFetch);

  // Fetch AI recommendations for each category
  const allRecommendations = [];

  for (const category of categoriesToFetch) {
    try {
      console.log(`\n🔍 Fetching ${category}s via Groq AI...`);

      const aiResponse = await groqService.getAIRecommendations(
        category,
        trip.destination,
        {
          duration: Math.ceil((new Date(trip.endDate) - new Date(trip.startDate)) / (1000 * 60 * 60 * 24)),
          budget: trip.budget
        }
      );

const aiPlaces = aiResponse?.places || [];
      if (aiPlaces && aiPlaces.length > 0) {
        console.log(`  ✅ Got ${aiPlaces.length} ${category}s from AI`);
        allRecommendations.push(...aiPlaces);
      } else {
        console.warn(`  ⚠️ No AI results for ${category}`);
      }

    } catch (err) {
      console.error(`  ❌ AI failed for ${category}:`, err.message);
    }
  }

  if (allRecommendations.length === 0) {
    console.warn('⚠️ No AI recommendations generated');
    return [];
  }

  // Remove duplicates with existing places
  const filtered = allRecommendations.filter(place => {
    const exists = existingPlaces.some(existing => 
      existing.name.toLowerCase() === place.name.toLowerCase()
    );
    return !exists;
  });

  console.log(`📊 Total AI recommendations: ${filtered.length}`);
  console.log(`   (Removed ${allRecommendations.length - filtered.length} already added)`);

  // Score and rank
  const scored = groqService.scoreAndRankPlaces(filtered, centerLocation);

  // Apply limit
  const limit = options.limit || 50;
  const final = scored.slice(0, limit);

  console.log(`✅ Returning ${final.length} AI recommendations\n`);

  return {
  places: final,
  budgetAnalysis: null,
  message: null
};

};

/**
 * Get trip center location
 */
async function getTripCenter(trip, existingPlaces) {
  // Try geocoding destination
  if (trip.destination) {
    try {
      const geocoded = await geoapifyService.geocodeLocation(trip.destination);
      if (geocoded && geocoded.lat && geocoded.lon) {
        return {
          lat: geocoded.lat,
          lon: geocoded.lon,
          formatted: geocoded.formatted
        };
      }
    } catch (err) {
      console.warn('Geocoding failed:', err.message);
    }
  }

  // Try saved coords
  if (trip.destinationCoords && Array.isArray(trip.destinationCoords) && trip.destinationCoords.length === 2) {
    return {
      lat: trip.destinationCoords[1],
      lon: trip.destinationCoords[0],
      formatted: trip.destination
    };
  }

  // Try trip location
  if (trip.location && trip.location.coordinates && trip.location.coordinates.length === 2) {
    return {
      lat: trip.location.coordinates[1],
      lon: trip.location.coordinates[0],
      formatted: trip.destination
    };
  }

  // Calculate from existing places
  if (existingPlaces && existingPlaces.length > 0) {
    const placesWithCoords = existingPlaces.filter(
      p => p.location && p.location.coordinates && p.location.coordinates.length === 2
    );

    if (placesWithCoords.length > 0) {
      const avgLon = placesWithCoords.reduce((sum, p) => sum + p.location.coordinates[0], 0) / placesWithCoords.length;
      const avgLat = placesWithCoords.reduce((sum, p) => sum + p.location.coordinates[1], 0) / placesWithCoords.length;
      
      return {
        lat: avgLat,
        lon: avgLon,
        formatted: trip.destination
      };
    }
  }

  // Default fallback
  return {
    lat: 20.5937,
    lon: 78.9629,
    formatted: 'India'
  };
}

/**
 * Generate daily itinerary
 */
let generateDayPlans = async (tripId, userId) => {
  const trip = await Trip.findById(tripId);
  if (!trip) throw NotFoundError('Trip not found');
  if (trip.userId.toString() !== userId.toString()) {
    throw ForbiddenError('Access denied');
  }
  
  const places = await Place.find({ 
    tripId,
    visitStatus: { $ne: 'skipped' }
  }).lean();
  
  if (places.length === 0) return [];
  
  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);
  const tripDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
  
  const clusters = clusterPlacesByProximity(places, tripDays);
  
  const dayPlans = clusters.map((cluster, index) => {
    const dayDate = new Date(startDate);
    dayDate.setDate(dayDate.getDate() + index);
    
    return {
      day: index + 1,
      date: dayDate.toISOString().split('T')[0],
      places: cluster.sort((a, b) => {
        if (a.visitDate && b.visitDate) {
          return new Date(a.visitDate) - new Date(b.visitDate);
        }
        const order = { accommodation: 0, attraction: 1, restaurant: 2, other: 3 };
        return (order[a.category] || 3) - (order[b.category] || 3);
      }),
      totalPlaces: cluster.length,
      estimatedDuration: estimateDayDuration(cluster),
      centerPoint: calculateClusterCenter(cluster)
    };
  });
  
  return dayPlans;
};

function clusterPlacesByProximity(places, maxClusters) {
  if (places.length === 0) return [];
  
  const clusters = [];
  const remaining = [...places];
  const maxPlacesPerDay = Math.ceil(places.length / maxClusters);
  
  while (remaining.length > 0 && clusters.length < maxClusters) {
    const cluster = [];
    const seed = remaining.shift();
    cluster.push(seed);
    
    for (let i = remaining.length - 1; i >= 0 && cluster.length < maxPlacesPerDay; i--) {
      const place = remaining[i];
      const avgDist = cluster.reduce((sum, p) => {
        if (!p.location?.coordinates || !place.location?.coordinates) return sum;
        return sum + calculateDistance(
          p.location.coordinates[1],
          p.location.coordinates[0],
          place.location.coordinates[1],
          place.location.coordinates[0]
        );
      }, 0) / cluster.length;
      
      if (avgDist < 5) {
        cluster.push(place);
        remaining.splice(i, 1);
      }
    }
    
    clusters.push(cluster);
  }
  
  while (remaining.length > 0) {
    clusters[clusters.length - 1].push(remaining.shift());
  }
  
  return clusters;
}

function calculateClusterCenter(cluster) {
  const validPlaces = cluster.filter(p => p.location?.coordinates?.length === 2);
  if (validPlaces.length === 0) return null;
  
  const avgLon = validPlaces.reduce((sum, p) => sum + p.location.coordinates[0], 0) / validPlaces.length;
  const avgLat = validPlaces.reduce((sum, p) => sum + p.location.coordinates[1], 0) / validPlaces.length;
  
  return { type: 'Point', coordinates: [avgLon, avgLat] };
}

function estimateDayDuration(places) {
  const baseHours = places.length * 1.5;
  const travelHours = (places.length - 1) * 0.25;
  return Math.round(baseHours + travelHours);
}

module.exports = {
  getRecommendations,
  generateDayPlans
};