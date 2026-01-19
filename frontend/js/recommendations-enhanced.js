// ============================================================================
// FILE: recommendations-enhanced.js (FIXED - Add to Trip Working)
// ============================================================================

let recommendationsState = {
  currentTripId: null,
  tripData: null,
  recommendations: [],
  dayPlans: [],
  userPreferences: null,
  isLoading: false,
  loadingStage: null,
  error: null
};

/**
 * Initialize recommendations with all features
 */
async function initRecommendations(tripId, tripData) {
  console.log('🚀 Initializing AI recommendations with trip data:', tripData);
  
  recommendationsState.currentTripId = tripId;
  recommendationsState.tripData = tripData;
  
  // Initialize trip center selector
  if (typeof initTripCenterSelector === 'function') {
    initTripCenterSelector(tripData);
  }
  
  // Load initial recommendations
  await loadRecommendations({ category: 'all', limit: 50 });
  
  // Load day plans
  await loadDayPlans();
  
  // Initialize comparison
  if (typeof initComparison === 'function') {
    initComparison();
  }
  
  // Initialize day builder
  if (typeof initDayBuilder === 'function') {
    initDayBuilder(tripId, tripData);
  }
}

/**
 * Load recommendations from API (AI-powered) - WITH LOADING STATES
 */
async function loadRecommendations(options = {}) {
  try {
    recommendationsState.isLoading = true;
    recommendationsState.error = null;
    recommendationsState.loadingStage = 'initializing';
    
    showRecommendationsLoading();
    
    const params = {
      limit: options.limit || 50,
      radius: options.radius || 20000
    };
    
    if (options.category && options.category !== 'all') {
      params.category = options.category;
    }
    
    console.log('🤖 Fetching AI recommendations with params:', params);
    
    recommendationsState.loadingStage = 'fetching';
    updateLoadingMessage('Connecting to AI service...');
    
    const res = await apiService.recommendations.getForTrip(
      recommendationsState.currentTripId, 
      params
    );
    
    recommendationsState.loadingStage = 'processing';
    updateLoadingMessage('Processing recommendations...');
    
    const responseData = res.data || {};
    const places = Array.isArray(responseData)
      ? responseData
      : responseData.places || [];

    recommendationsState.recommendations = places;
    recommendationsState.budgetAnalysis = responseData.budgetAnalysis || null;
    recommendationsState.aiMessage = responseData.message || null;

    console.log('✅ Loaded', recommendationsState.recommendations.length, 'AI recommendations');
    
    const breakdown = {};
    recommendationsState.recommendations.forEach(r => {
      breakdown[r.category] = (breakdown[r.category] || 0) + 1;
    });
    console.log('📊 Recommendation breakdown:', breakdown);
    
    recommendationsState.loadingStage = 'finalizing';
    updateLoadingMessage('Finalizing results...');
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (recommendationsState.recommendations.length > 0) {
      console.log('🔧 Initializing recommendation filters...');
      
      if (typeof initRecommendationFilters === 'function') {
        initRecommendationFilters(recommendationsState.recommendations);
      }
      
      const tripCenter = calculateTripCenter();
      if (typeof initEnhancedMapView === 'function') {
        initEnhancedMapView(recommendationsState.recommendations, tripCenter);
      }
    } else {
      console.log('ℹ️ No recommendations yet. Click a category to load AI recommendations.');
      
      if (typeof initRecommendationFilters === 'function') {
        initRecommendationFilters([]);
      }
    }
    
    recommendationsState.loadingStage = 'complete';
    displayRecommendations();
    
  } catch (err) {
    console.error('❌ Error loading recommendations:', err);
    recommendationsState.error = err.message || 'Failed to load recommendations';
    recommendationsState.loadingStage = 'error';
    showRecommendationsError(err.message);
    
  } finally {
    recommendationsState.isLoading = false;
  }
}

/**
 * Show loading UI with animated skeleton cards
 */
function showRecommendationsLoading() {
  const container = document.getElementById('recommendationsGrid');
  if (!container) return;
  
  container.innerHTML = `
    <div class="recommendations-loading-container">
      <div class="loading-header">
        <div class="loading-brain-icon">
          <i class="fas fa-brain fa-pulse"></i>
        </div>
        <h3 class="loading-title">AI is Finding the Best Places for You</h3>
        <p class="loading-subtitle" id="loadingMessage">Initializing AI recommendations...</p>
      </div>
      
      <div class="loading-steps">
        <div class="loading-step active" data-step="initializing">
          <div class="step-icon"><i class="fas fa-rocket"></i></div>
          <span class="step-label">Initializing</span>
        </div>
        <div class="loading-step" data-step="fetching">
          <div class="step-icon"><i class="fas fa-search"></i></div>
          <span class="step-label">Searching Places</span>
        </div>
        <div class="loading-step" data-step="processing">
          <div class="step-icon"><i class="fas fa-brain"></i></div>
          <span class="step-label">AI Analysis</span>
        </div>
        <div class="loading-step" data-step="finalizing">
          <div class="step-icon"><i class="fas fa-check-circle"></i></div>
          <span class="step-label">Finalizing</span>
        </div>
      </div>
      
      <div class="loading-progress-bar">
        <div class="loading-progress-fill" id="loadingProgressFill"></div>
      </div>
      <div class="loading-progress-text" id="loadingProgressText">0%</div>
      
      <div class="skeleton-cards-grid">
        ${generateSkeletonCards(6)}
      </div>
      
      <div class="loading-tips">
        <i class="fas fa-lightbulb"></i>
        <span id="loadingTip">AI analyzes thousands of places to find the perfect matches for your trip</span>
      </div>
    </div>
  `;
  
  animateProgress();
  startLoadingTips();
}

function generateSkeletonCards(count) {
  let cards = '';
  for (let i = 0; i < count; i++) {
    cards += `
      <div class="skeleton-card">
        <div class="skeleton-header">
          <div class="skeleton-avatar"></div>
          <div class="skeleton-text-group">
            <div class="skeleton-text skeleton-title"></div>
            <div class="skeleton-text skeleton-subtitle"></div>
          </div>
        </div>
        <div class="skeleton-body">
          <div class="skeleton-text"></div>
          <div class="skeleton-text"></div>
          <div class="skeleton-text short"></div>
        </div>
        <div class="skeleton-footer">
          <div class="skeleton-button"></div>
          <div class="skeleton-button small"></div>
        </div>
      </div>
    `;
  }
  return cards;
}

function updateLoadingMessage(message) {
  const messageEl = document.getElementById('loadingMessage');
  if (messageEl) messageEl.textContent = message;
  
  const currentStage = recommendationsState.loadingStage;
  document.querySelectorAll('.loading-step').forEach(step => {
    step.classList.remove('active', 'completed');
    const stepName = step.dataset.step;
    const stages = ['initializing', 'fetching', 'processing', 'finalizing'];
    const currentIndex = stages.indexOf(currentStage);
    const stepIndex = stages.indexOf(stepName);
    
    if (stepIndex < currentIndex) {
      step.classList.add('completed');
    } else if (stepIndex === currentIndex) {
      step.classList.add('active');
    }
  });
}

function animateProgress() {
  const fill = document.getElementById('loadingProgressFill');
  const text = document.getElementById('loadingProgressText');
  if (!fill || !text) return;
  
  let progress = 0;
  const interval = setInterval(() => {
    const stage = recommendationsState.loadingStage;
    const progressMap = {
      'initializing': 20,
      'fetching': 50,
      'processing': 75,
      'finalizing': 95,
      'complete': 100
    };
    
    const targetProgress = progressMap[stage] || 10;
    if (progress < targetProgress) progress += 2;
    
    fill.style.width = `${progress}%`;
    text.textContent = `${progress}%`;
    
    if (stage === 'complete' || stage === 'error' || progress >= 100) {
      clearInterval(interval);
      if (stage === 'complete') {
        fill.style.width = '100%';
        text.textContent = '100%';
      }
    }
  }, 100);
}

function startLoadingTips() {
  const tips = [
    'AI analyzes thousands of places to find the perfect matches for your trip',
    'We consider ratings, distance, and local insights',
    'Each recommendation is personalized based on your preferences',
    'AI filters out tourist traps and finds hidden gems',
    'Results are ranked by quality, location, and relevance'
  ];
  
  const tipEl = document.getElementById('loadingTip');
  if (!tipEl) return;
  
  let currentTip = 0;
  const interval = setInterval(() => {
    if (!recommendationsState.isLoading) {
      clearInterval(interval);
      return;
    }
    
    currentTip = (currentTip + 1) % tips.length;
    tipEl.style.opacity = '0';
    
    setTimeout(() => {
      tipEl.textContent = tips[currentTip];
      tipEl.style.opacity = '1';
    }, 300);
  }, 3000);
}

function showRecommendationsError(errorMessage) {
  const container = document.getElementById('recommendationsGrid');
  if (!container) return;
  
  container.innerHTML = `
    <div class="recommendations-error">
      <div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div>
      <h3>Failed to Load Recommendations</h3>
      <p class="error-message">${escapeHtml(errorMessage || 'An unexpected error occurred')}</p>
      <div class="error-actions">
        <button class="btn-retry" onclick="retryLoadRecommendations()">
          <i class="fas fa-redo"></i> Try Again
        </button>
      </div>
    </div>
  `;
}

window.retryLoadRecommendations = async function() {
  const options = {
    category: recommendationsState.lastCategory || 'all',
    limit: 50
  };
  await loadRecommendations(options);
};

/**
 * Display recommendations in UI
 */
function displayRecommendations() {
  const container = document.getElementById('recommendationsGrid');
  if (!container) return;
  
  const recs = recommendationsState.recommendations;
  
  if (recs.length === 0) {
    container.innerHTML = `
      <div class="recommendations-empty">
        <i class="fas fa-robot"></i>
        <h3>No results found</h3>
        <p>AI analyzed the destination but found no suitable places for this category or the budget is insufficient.</p>
      </div>
    `;
    return;
  }
  
  container.style.opacity = '0';
  
  setTimeout(() => {
    container.innerHTML = recs.map(rec => createRecommendationCard(rec)).join('');
    container.style.opacity = '1';
    attachRecommendationListeners(recs);
  }, 200);
}

/**
 * Calculate trip center from trip data
 */
function calculateTripCenter() {
  const trip = recommendationsState.tripData;
  
  if (!trip) {
    console.warn('No trip data available, using default center');
    return { lat: 20.5937, lon: 78.9629 };
  }
  
  if (trip.destinationCoords && Array.isArray(trip.destinationCoords) && trip.destinationCoords.length === 2) {
    return { lat: trip.destinationCoords[1], lon: trip.destinationCoords[0] };
  }
  
  if (trip.location && trip.location.coordinates && Array.isArray(trip.location.coordinates) && trip.location.coordinates.length === 2) {
    return { lat: trip.location.coordinates[1], lon: trip.location.coordinates[0] };
  }
  
  if (typeof allPlaces !== 'undefined' && allPlaces.length > 0) {
    const placesWithCoords = allPlaces.filter(
      p => p.location && p.location.coordinates && p.location.coordinates.length === 2
    );
    
    if (placesWithCoords.length > 0) {
      const avgLon = placesWithCoords.reduce((sum, p) => sum + p.location.coordinates[0], 0) / placesWithCoords.length;
      const avgLat = placesWithCoords.reduce((sum, p) => sum + p.location.coordinates[1], 0) / placesWithCoords.length;
      return { lat: avgLat, lon: avgLon };
    }
  }
  
  console.warn('Could not determine trip location, using default');
  return { lat: 20.5937, lon: 78.9629 };
}

/**
 * Load day plans from API
 */
async function loadDayPlans() {
  try {
    console.log('📅 Loading day plans...');
    
    const res = await apiService.recommendations.getDayPlans(
      recommendationsState.currentTripId
    );
    
    recommendationsState.dayPlans = res.data || [];
    console.log('✅ Loaded', recommendationsState.dayPlans.length, 'day plans');
    
    displayDayPlans();
  } catch (err) {
    console.error('❌ Error loading day plans:', err);
  }
}

/**
 * Display day plans
 */
function displayDayPlans() {
  const container = document.getElementById('dayPlansContainer');
  if (!container) return;
  
  const plans = recommendationsState.dayPlans;
  
  if (plans.length === 0) {
    container.innerHTML = `
      <div class="recommendations-empty">
        <i class="fas fa-calendar-alt"></i>
        <h3>No day plans yet</h3>
        <p>Add more places to generate daily itineraries</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = plans.map(plan => createDayPlanCard(plan)).join('');
}

function createDayPlanCard(plan) {
  const placesHTML = plan.places.map((place, index) => {
    const icon = getCategoryIcon(place.category);
    return `
      <div class="day-place-item">
        <div class="place-order">${index + 1}</div>
        <div class="place-icon"><i class="fas fa-${icon}"></i></div>
        <div class="place-details">
          <h4>${escapeHtml(place.name)}</h4>
          <p>${escapeHtml(place.category)} • ${place.rating ? place.rating.toFixed(1) + ' stars' : 'No rating'}</p>
        </div>
      </div>
    `;
  }).join('');
  
  return `
    <div class="day-plan-card">
      <div class="day-plan-header">
        <div class="day-plan-title">
          <h3>Day ${plan.day}</h3>
          <p class="day-plan-date">${new Date(plan.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div class="day-plan-stats">
          <div class="day-stat"><i class="fas fa-map-marker-alt"></i> ${plan.totalPlaces} places</div>
          <div class="day-stat"><i class="fas fa-clock"></i> ~${plan.estimatedDuration}h</div>
        </div>
      </div>
      <div class="day-places-list">${placesHTML}</div>
    </div>
  `;
}

/**
 * Attach event listeners to recommendation cards
 */
function attachRecommendationListeners(recs) {
  const container = document.getElementById('recommendationsGrid');
  if (!container) return;
  
  recs.forEach((rec, index) => {
    const card = container.children[index];
    if (!card) return;
    
    const addBtn = card.querySelector('.btn-add-to-trip');
    const detailsBtn = card.querySelector('.btn-view-details');
    const compareCheckbox = card.querySelector('.rec-card-compare-checkbox');
    const viewOnMapBtn = card.querySelector('.btn-view-on-map');
    
    if (addBtn) {
      addBtn.onclick = () => addRecommendationToTrip(rec);
    }
    
    if (detailsBtn) {
      detailsBtn.onclick = () => showRecommendationDetails(rec);
    }
    
    if (compareCheckbox && typeof toggleCompareSelection === 'function') {
      compareCheckbox.onclick = (e) => {
        e.stopPropagation();
        toggleCompareSelection(rec, card);
      };
    }
    
    if (viewOnMapBtn && typeof focusMapOnPlace === 'function') {
      viewOnMapBtn.onclick = (e) => {
        e.stopPropagation();
        focusMapOnPlace(rec.name);
      };
    }
  });
}

/**
 * Create recommendation card HTML
 */
function createRecommendationCard(rec) {
  const categoryIcon = getCategoryIcon(rec.category);
  const categoryEmoji = getCategoryEmoji(rec.category);
  
  const reasonsHTML = (rec.reasons && rec.reasons.length > 0) ? rec.reasons.slice(0, 2).map(reason => `
    <span class="reason-tag">
      <i class="fas fa-check-circle"></i>
      ${escapeHtml(reason)}
    </span>
  `).join('') : '';
  
  const aiBadge = rec.source === 'groq_ai' ? '<div class="ai-badge-card"><i class="fas fa-brain"></i> AI</div>' : '';
  
  // Get budget display text
  const budgetText = getBudgetDisplayText(rec.priceLevel);
  
  return `
    <div class="recommendation-card ${rec.source === 'groq_ai' ? 'ai-powered-card' : ''}" style="position: relative;">
      ${aiBadge}
      <div class="rec-card-compare-checkbox"></div>
      
      <div class="rec-header">
        <div class="rec-title">
          <h3>${categoryEmoji} ${escapeHtml(rec.name)}</h3>
          <span class="rec-category">
            <i class="fas fa-${categoryIcon}"></i>
            ${escapeHtml(rec.category)}
          </span>
        </div>
        <div class="rec-score">
          <i class="fas fa-star"></i>
          ${(rec.recommendationScore || rec.rating || 0).toFixed(1)}
        </div>
      </div>
      
      <div class="rec-meta">
        <div class="rec-rating">
          <i class="fas fa-star"></i>
          ${(rec.rating || 0).toFixed(1)}
        </div>
        ${rec.distanceFromCenter ? `
          <div class="rec-distance">
            <i class="fas fa-map-marker-alt"></i>
            ${rec.distanceFromCenter.toFixed(1)} km away
          </div>
        ` : ''}
        ${budgetText ? `
          <div class="rec-budget">
            <i class="fas fa-wallet"></i>
            ${budgetText}
          </div>
        ` : ''}
      </div>
      
      ${reasonsHTML ? `
        <div class="rec-reasons">
          <div class="rec-reasons-title">Why we recommend this</div>
          ${reasonsHTML}
        </div>
      ` : ''}
      
      ${rec.description ? `
        <div class="rec-description" style="margin: 12px 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
          ${escapeHtml(rec.description)}
        </div>
      ` : ''}
      
      ${rec.address ? `
        <div class="rec-address">
          <i class="fas fa-map-pin"></i>
          <span>${escapeHtml(rec.address)}</span>
        </div>
      ` : ''}
      
      <div class="rec-actions">
        <button class="btn-add-to-trip">
          <i class="fas fa-plus"></i>
          Add to Trip
        </button>
        <button class="btn-view-on-map" title="View on map">
          <i class="fas fa-map"></i>
        </button>
        <button class="btn-view-details" title="View details">
          <i class="fas fa-info"></i>
        </button>
      </div>
    </div>
  `;
}

/**
 * Get budget display text from price level
 */
function getBudgetDisplayText(priceLevel) {
  if (!priceLevel) return null;
  
  const budgetMap = {
    1: 'Budget',
    2: 'Moderate',
    3: 'Expensive',
    4: 'Luxury'
  };
  
  return budgetMap[priceLevel] || 'Moderate';
}

/**
 * Show recommendation details modal - FIXED
 */
function showRecommendationDetails(rec) {
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3><i class="fas fa-info-circle"></i> ${escapeHtml(rec.name)}</h3>
        <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Category</label>
          <p>${escapeHtml(rec.category)}</p>
        </div>
        <div class="form-group">
          <label>Rating</label>
          <p>${(rec.rating || 0).toFixed(1)} / 5.0</p>
        </div>
        ${rec.distanceFromCenter ? `
          <div class="form-group">
            <label>Distance</label>
            <p>${rec.distanceFromCenter.toFixed(2)} km from trip center</p>
          </div>
        ` : ''}
        <div class="form-group">
          <label>Address</label>
          <p>${escapeHtml(rec.address || 'Not available')}</p>
        </div>
        ${rec.description ? `
          <div class="form-group">
            <label>Description</label>
            <p>${escapeHtml(rec.description)}</p>
          </div>
        ` : ''}
        ${rec.reasons && rec.reasons.length > 0 ? `
          <div class="form-group">
            <label>Why recommended</label>
            <ul>
              ${rec.reasons.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
        <button class="btn-primary" onclick="addRecommendationToTripFromModal(${JSON.stringify(rec).replace(/"/g, '&quot;')})">
          <i class="fas fa-plus"></i> Add to Trip
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

/**
 * Add recommendation to trip - FIXED (No Auto-Refresh AI)
 */
async function addRecommendationToTrip(rec) {
  try {
    if (!recommendationsState.currentTripId) {
      showToast('Trip ID not found', 'error');
      return;
    }

    const placeData = {
      name: rec.name,
      category: rec.category,
      address: rec.address || '',
      location: rec.location,
      rating: rec.rating || 0,
      priceLevel: rec.priceLevel || 0,
      description: rec.description || '',
      notes: `Added from recommendations. ${(rec.reasons || []).join('. ')}`
    };
    
    await apiService.places.create(recommendationsState.currentTripId, placeData);
    
    showToast('Place added to your trip!', 'success');
    
    // Track user preference
    if (rec.category) {
      try {
        await apiService.preferences.trackSearch({
          category: rec.category,
          query: '',
          location: null
        });
      } catch (err) {
        console.warn('Failed to track preference:', err);
      }
    }
    
    // Remove the added place from recommendations display
    removeRecommendationFromDisplay(rec.name);
    
    // Only reload the "My Added Places" section (not AI recommendations)
    if (typeof loadPlaces === 'function') {
      await loadPlaces();
    }
    
    // Update day plans if needed
    if (typeof loadDayPlans === 'function') {
      await loadDayPlans();
    }
  } catch (err) {
    console.error('Error adding place:', err);
    showToast(err.message || 'Failed to add place', 'error');
  }
}

/**
 * Add place from map popup - wrapper function
 */
window.addFromMapPopup = async function(placeName) {
  const rec = recommendationsState.recommendations.find(r => r.name === placeName);
  if (!rec) return;

  await addRecommendationToTrip(rec);
  
  // Close the map popup
  if (typeof mapViewState !== 'undefined' && mapViewState.map) {
    mapViewState.map.closePopup();
  }
};

/**
 * Remove a recommendation from display after adding to trip
 */
function removeRecommendationFromDisplay(placeName) {
  // Remove from state
  recommendationsState.recommendations = recommendationsState.recommendations.filter(
    r => r.name !== placeName
  );
  
  // Update filtered results if filters are active
  if (typeof recFiltersState !== 'undefined' && recFiltersState.filteredRecommendations) {
    recFiltersState.filteredRecommendations = recFiltersState.filteredRecommendations.filter(
      r => r.name !== placeName
    );
  }
  
  // Re-render the display without the removed item
  displayRecommendations();
  
  // Show helpful message if all recommendations are gone
  if (recommendationsState.recommendations.length === 0) {
    const container = document.getElementById('recommendationsGrid');
    if (container) {
      container.innerHTML = `
        <div class="recommendations-empty">
          <i class="fas fa-check-circle"></i>
          <h3>All recommendations added!</h3>
          <p>You've added all the AI suggestions to your trip. Click a category to load more.</p>
        </div>
      `;
    }
  }
}

/**
 * Add recommendation from modal
 */
window.addRecommendationToTripFromModal = async function(rec) {
  await addRecommendationToTrip(rec);
  document.querySelector('.modal')?.remove();
};

function getCategoryEmoji(category) {
  const emojis = {
    restaurant: '🍴',
    attraction: '🏛️',
    accommodation: '🏨',
    transport: '🚌',
    other: '📍'
  };
  return emojis[category?.toLowerCase()] || '📍';
}

function getCategoryIcon(category) {
  const icons = {
    restaurant: 'utensils',
    attraction: 'landmark',
    accommodation: 'bed',
    transport: 'bus',
    other: 'map-marker-alt'
  };
  return icons[category?.toLowerCase()] || 'map-marker-alt';
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Export for other modules
window.recommendationsState = recommendationsState;