// services/groq.service.js
const axios = require('axios');
const geoapifyService = require('./geoapify.service');
const { calculateDistance } = require('../utils/helpers');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3.1';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function getAIRecommendations(category, destination, tripContext = {}) {
  console.log('🔥 OPENROUTER CALLED:', category, destination);
  
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY missing');
  }

  const {
    budget,
    duration,
    peopleCount,
    currency = 'INR'
  } = tripContext;

  const prompt = `
You are a professional travel cost analyst and trip planner.

Trip details:
- Destination: ${destination}
- Category: ${category}
- User's Budget: ${budget ? `${currency} ${budget}` : 'Not specified'}
- Trip Duration: ${duration || 'Not specified'} days
- Number of People: ${peopleCount || 1}

CRITICAL INSTRUCTIONS:
1. First, calculate the REALISTIC minimum budget needed for this trip
2. Calculate the AVERAGE budget range for a comfortable trip
3. Compare user's budget to these benchmarks
4. Classify budget level accurately

BUDGET CLASSIFICATION:
- IMPOSSIBLE: User budget < minimum required (cannot afford basic necessities)
- LOW: User budget >= minimum but < average (tight budget, limited options)
- AVERAGE: User budget within typical range (comfortable trip)
- HIGH: User budget > average range (luxury options available)

MANDATORY RESPONSE FORMAT:

===BUDGET_ANALYSIS===
USER_BUDGET_LEVEL: [IMPOSSIBLE|LOW|AVERAGE|HIGH]
MINIMUM_REQUIRED: ${currency} [number]
AVERAGE_RANGE: ${currency} [min]–[max]
EXPLANATION: [Clear explanation of budget feasibility]
===END_ANALYSIS===

RULES:
- If USER_BUDGET_LEVEL is IMPOSSIBLE: STOP HERE. Do NOT suggest any places.
- If LOW/AVERAGE/HIGH: After budget analysis, suggest EXACTLY 10 ${category}s

---

FOR EACH PLACE (only if budget allows):
NAME: [exact name]
DESCRIPTION: [brief description]
RATING: [1-5]
PRICE: [1=cheap, 2=moderate, 3=expensive, 4=luxury]
WHY: [why it fits user's budget level]
LOCATION: [area/neighborhood, city]

Separate each place with ---
`;

  const response = await axios.post(
    OPENROUTER_URL,
    {
      model: MODEL,
      messages: [
        { 
          role: 'system', 
          content: 'You are a realistic travel budget analyst. Be honest about budget constraints. Never suggest places if budget is insufficient.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.6,
      max_tokens: 3000
    },
    {
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5000',
        'X-Title': 'Planora Trip Planner'
      }
    }
  );

  const aiText = response.data?.choices?.[0]?.message?.content;
  if (!aiText) throw new Error('No AI response');

  // Parse budget analysis first
  const budgetAnalysis = parseBudgetAnalysis(aiText);
  
  // If budget is impossible, return early with analysis only
  if (budgetAnalysis.budgetLevel === 'IMPOSSIBLE') {
    console.log('❌ Budget insufficient - no places suggested');
    return {
      budgetAnalysis,
      places: [],
      message: budgetAnalysis.explanation
    };
  }

  // Otherwise, parse and geocode places
  const places = parseAIResponse(aiText, category);
  const geocodedPlaces = await geocodePlaces(places, destination);
  
  return {
    budgetAnalysis,
    places: geocodedPlaces,
    message: budgetAnalysis.explanation
  };
}

function parseBudgetAnalysis(text) {
  const analysisMatch = text.match(/===BUDGET_ANALYSIS===([\s\S]*?)===END_ANALYSIS===/);
  
  if (!analysisMatch) {
    console.warn('⚠️ Budget analysis not found in AI response');
    return {
      budgetLevel: 'AVERAGE',
      minimumRequired: null,
      averageRange: null,
      explanation: 'Budget analysis unavailable'
    };
  }

  const section = analysisMatch[1];
  const getField = (regex) => section.match(regex)?.[1]?.trim();

  const budgetLevel = getField(/USER_BUDGET_LEVEL:\s*(\w+)/i);
  const minimumRequired = getField(/MINIMUM_REQUIRED:\s*(.+)/i);
  const averageRange = getField(/AVERAGE_RANGE:\s*(.+)/i);
  const explanation = getField(/EXPLANATION:\s*(.+)/i);

  console.log('📊 Budget Analysis:', {
    budgetLevel,
    minimumRequired,
    averageRange
  });

  return {
    budgetLevel: budgetLevel || 'AVERAGE',
    minimumRequired,
    averageRange,
    explanation: explanation || 'Budget analysis complete'
  };
}

function parseAIResponse(text, category) {
  // Remove budget analysis section before parsing places
  const placesText = text.replace(/===BUDGET_ANALYSIS===[\s\S]*?===END_ANALYSIS===/, '');
  
  return placesText.split('---').map(section => {
    const get = r => section.match(r)?.[1]?.trim();
    const name = get(/NAME:\s*(.+)/i);
    
    if (!name) return null;
    
    return {
      category,
      source: 'groq_ai',
      name,
      description: get(/DESCRIPTION:\s*(.+)/i),
      rating: Number(get(/RATING:\s*(.+)/i)) || 4.2,
      priceLevel: Number(get(/PRICE:\s*(.+)/i)) || 2,
      whyVisit: get(/WHY:\s*(.+)/i),
      addressHint: get(/LOCATION:\s*(.+)/i)
    };
  }).filter(p => p !== null);
}

async function geocodePlaces(places, destination) {
  const results = [];
  for (const p of places) {
    try {
      const q = `${p.name}, ${p.addressHint || ''}, ${destination}`;
      const geo = await geoapifyService.geocodeLocation(q);

      if (geo?.lat && geo?.lon) {
        results.push({
          ...p,
          location: { type: 'Point', coordinates: [geo.lon, geo.lat] },
          address: geo.formatted,
          confidence: geo.confidence,
          popularity: geo.popularity
        });
      }
    } catch (err) {
      console.warn('Geocoding failed for:', p.name);
    }
  }
  return results;
}

function scoreAndRankPlaces(places, centerLocation) {
  console.log('📊 Scoring', places.length, 'places...');
  
  return places.map(place => {
    let score = 0;

    // Rating score
    score += (place.rating || 4) * 2;
    
    // Popularity score
    if (place.popularity) score += Math.min(5, place.popularity);
    
    // Confidence score
    if (place.confidence) score += place.confidence * 5;

    // Distance score
    if (centerLocation && place.location?.coordinates?.length === 2) {
      const dist = calculateDistance(
        centerLocation.lat,
        centerLocation.lon,
        place.location.coordinates[1],
        place.location.coordinates[0]
      );
      
      place.distanceFromCenter = dist;
      score += Math.max(0, 20 - dist);
    } else {
      place.distanceFromCenter = 0;
    }

    // Add reasons
    if (!place.reasons || place.reasons.length === 0) {
      place.reasons = [];
      if (place.rating >= 4.5) place.reasons.push('Highly rated');
      if (place.distanceFromCenter < 3) place.reasons.push('Close to center');
      if (place.popularity > 5) place.reasons.push('Popular destination');
      if (place.whyVisit) place.reasons.push(place.whyVisit);
    }

    return { ...place, recommendationScore: Math.round(score * 10) / 10 };
  }).sort((a, b) => b.recommendationScore - a.recommendationScore);
}

module.exports = {
  getAIRecommendations,
  scoreAndRankPlaces
};