//============================================================
// UNIFIED ADVANCED RECOMMENDATIONS MODULE - FIXED
// Handles AI recommendations, filters, sorting, comparison, and map integration
// ============================================================

// ====================== STATE ======================
const advancedRecState = {
  options: {
    radius: 10, 
    minRating: 3.0, 
    maxResults: 50, 
    sortBy: 'score',
    viewMode: 'grid',
    showHiddenGems: false, 
    budgetFriendly: false, 
    topRatedOnly: false,
    nearbyOnly: false
  },
  savedPlaces: new Set(),
  selectedForBulk: new Set()
};

// ✅ FIXED: Proper filter state management
if (!window.filterState) {
  window.filterState = {
    activeFilters: {
      categories: [],
      minRating: 0,
      maxDistance: 999,
      priceLevel: null
    },
    allRecommendations: [], // ✅ NEVER mutate this
    filteredResults: []     // ✅ This is what gets displayed
  };
}

const filterState = window.filterState;

// Recommendations state
if (!window.recommendationsState) {
  window.recommendationsState = {
    currentTripId: null,
    recommendations: [],
    dayPlans: [],
    userPreferences: null,
    isLoading: false,
    tripData: null
  };
}

const recommendationsState = window.recommendationsState;

// ====================== INITIALIZATION ======================
/**
 * Initialize all recommendation features
 */
async function initRecommendations(tripId, tripData) {
  console.log('🚀 Initializing unified recommendations module');
  
  recommendationsState.currentTripId = tripId;
  recommendationsState.tripData = tripData;
  
  // Render controls UI
  renderAdvancedControls();
  attachAdvancedListeners();
  loadSavedPreferences();
  
  // Load recommendations from API
  await loadRecommendations();
}

// Make globally available
window.initRecommendations = initRecommendations;

// ====================== LOAD RECOMMENDATIONS ======================
/**
 * Load recommendations from API with proper coordinate handling
 */
async function loadRecommendations(options = {}) {
  try {
    recommendationsState.isLoading = true;
    showRecommendationsLoading();

    console.log('🔍 Loading recommendations for trip:', recommendationsState.currentTripId);

    const res = await apiService.recommendations.getForTrip(
      recommendationsState.currentTripId,
      {
        radius: (advancedRecState.options.radius * 1000) || 10000,
        limit: advancedRecState.options.maxResults || 50,
        category: options.category
      }
    );

    const responseData = res.data || {};
    let places = Array.isArray(responseData) ? responseData : responseData.places || [];
    
    console.log('📦 Raw API response:', places.length, 'places');

    // ✅ ENSURE COORDINATES ARE PROPERLY EXTRACTED
    places = places.map(place => {
      let lat = 0, lon = 0;
      
      if (place.location?.coordinates) {
        lon = place.location.coordinates[0];
        lat = place.location.coordinates[1];
      } else if (place.lat && place.lon) {
        lat = place.lat;
        lon = place.lon;
      } else if (place.location?.lat && place.location?.lon) {
        lat = place.location.lat;
        lon = place.location.lon;
      } else if (place.coordinates) {
        lon = place.coordinates[0];
        lat = place.coordinates[1];
      }

      const validLat = parseFloat(lat);
      const validLon = parseFloat(lon);
      
      if (!validLat || !validLon || isNaN(validLat) || isNaN(validLon) || 
          validLat === 0 || validLon === 0 ||
          validLat < -90 || validLat > 90 || validLon < -180 || validLon > 180) {
        console.warn('⚠️ Missing/invalid coordinates for:', place.name, {lat: validLat, lon: validLon});
      }

      return {
        ...place,
        lat: validLat || 0,
        lon: validLon || 0
      };
    });

    // Filter out places with no valid coordinates
    const validPlaces = places.filter(p => 
      p.lat !== 0 && 
      p.lon !== 0 && 
      !isNaN(p.lat) && 
      !isNaN(p.lon) &&
      p.lat >= -90 && 
      p.lat <= 90 && 
      p.lon >= -180 && 
      p.lon <= 180
    );
    
    const invalidCount = places.length - validPlaces.length;
    
    if (invalidCount > 0) {
      console.warn(`⚠️ Filtered out ${invalidCount} places with invalid coordinates`);
    }

    // ✅ CRITICAL: Initialize filter state with ALL recommendations
    filterState.allRecommendations = [...validPlaces];
    filterState.filteredResults = [...validPlaces];
    recommendationsState.recommendations = [...validPlaces];

    console.log('✅ Loaded', validPlaces.length, 'valid recommendations');

    // Display and update map
    displayRecommendations();
    
    setTimeout(() => {
      if (typeof updateMapWithRecommendations === 'function') {
        console.log('🗺️ Triggering map update...');
        updateMapWithRecommendations();
      }
    }, 500);

  } catch (err) {
    console.error('❌ Error loading recommendations:', err);
    showRecommendationsError();
  } finally {
    recommendationsState.isLoading = false;
  }
}

window.loadRecommendations = loadRecommendations;

// ====================== DISPLAY RECOMMENDATIONS ======================
/**
 * Display recommendations with proper data attributes for map
 */
function displayRecommendations() {
  const container = document.getElementById('recommendationsGrid');
  if (!container) return;

  const recs = recommendationsState.recommendations;

  if (recs.length === 0) {
    container.innerHTML = `
      <div class="recommendations-empty">
        <i class="fas fa-compass"></i>
        <h3>No recommendations match your filters</h3>
        <p>Try adjusting your filters or search criteria</p>
      </div>
    `;
    return;
  }

  container.innerHTML = recs.map(rec => createRecommendationCard(rec)).join('');

  // Attach event listeners
  recs.forEach((rec, index) => {
    const card = container.children[index];
    if (!card) return;

    const addBtn = card.querySelector('.btn-add-to-trip');
    if (addBtn) {
      addBtn.onclick = (e) => {
        e.stopPropagation();
        addRecommendationToTrip(rec);
      };
    }

    const detailsBtn = card.querySelector('.btn-view-details');
    if (detailsBtn) {
      detailsBtn.onclick = (e) => {
        e.stopPropagation();
        showRecommendationDetails(rec);
      };
    }

    const checkbox = card.querySelector('.rec-card-compare-checkbox');
    if (checkbox) {
      checkbox.onclick = (e) => {
        e.stopPropagation();
        toggleCompareSelection(rec, card);
      };
    }
  });

  addQualityBadges();
  console.log('📍 Rendered', recs.length, 'recommendation cards with coordinates');
}

window.displayRecommendations = displayRecommendations;

// ====================== CREATE RECOMMENDATION CARD ======================
function createRecommendationCard(rec) {
  const icon = getCategoryIcon(rec.category);
  const lat = parseFloat(rec.lat) || 0;
  const lon = parseFloat(rec.lon) || 0;

  const reasonsHTML = (rec.reasons || []).map(reason => `
    <span class="reason-tag">
      <i class="fas fa-check-circle"></i>
      ${escapeHtml(reason)}
    </span>
  `).join('');

  return `
    <div class="recommendation-card" 
         data-place-id="${rec._id || rec.externalId || rec.name}" 
         data-category="${rec.category}" 
         data-lat="${lat}" 
         data-lon="${lon}"
         data-name="${escapeHtml(rec.name)}">
      
      <div class="rec-card-compare-checkbox" title="Compare places">
        <i class="fas fa-check" style="display: none;"></i>
      </div>

      <div class="rec-header">
        <div class="rec-title">
          <h3 class="rec-name">${escapeHtml(rec.name)}</h3>
          <span class="rec-category">
            <i class="fas fa-${icon}"></i>
            ${escapeHtml(rec.category)}
          </span>
        </div>
        <div class="rec-score">
          <i class="fas fa-star"></i>
          <span class="rec-rating">${(rec.recommendationScore || rec.rating || 0).toFixed(1)}</span>
        </div>
      </div>

      <div class="rec-meta">
        <div class="rec-rating-display">
          <i class="fas fa-star"></i>
          ${(rec.rating || 0).toFixed(1)}
        </div>
        ${rec.distanceFromCenter ? `
          <div class="rec-distance">
            <i class="fas fa-map-marker-alt"></i>
            ${rec.distanceFromCenter.toFixed(1)} km away
          </div>
        ` : ''}
        ${rec.priceLevel ? `
          <div class="rec-price">
            <i class="fas fa-dollar-sign"></i>
            ${'$'.repeat(rec.priceLevel)}
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
        <div class="rec-description">
          ${escapeHtml(rec.description.substring(0, 150))}${rec.description.length > 150 ? '...' : ''}
        </div>
      ` : ''}

      ${rec.address ? `
        <div class="rec-address">
          <i class="fas fa-map-pin"></i>
          ${escapeHtml(rec.address)}
        </div>
      ` : ''}

      <div class="rec-actions">
        <button class="btn-add-to-trip">
          <i class="fas fa-plus"></i> Add to Trip
        </button>
        <button class="btn-view-details">
          <i class="fas fa-info-circle"></i>
        </button>
      </div>
    </div>
  `;
}

// ====================== ADVANCED CONTROLS UI ======================
function renderAdvancedControls() {
  const container = document.querySelector('.recommendations-section');
  if (!container) return;

  const controlsHTML = `
    <div class="rec-controls-panel">
      <div class="rec-controls-header">
        <h3>
          <i class="fas fa-sliders-h"></i>
          Recommendation Options
        </h3>
        <button class="rec-controls-toggle" id="recControlsToggle">
          <i class="fas fa-chevron-down"></i>
        </button>
      </div>
      
      <div class="rec-controls-body" id="recControlsBody">
        <div class="control-group">
          <label class="control-label">
            Search Radius
            <span class="control-value" id="radiusValue">10 km</span>
          </label>
          <input type="range" class="range-slider" id="radiusSlider" 
                min="1" max="50" value="10" step="1">
        </div>

        <div class="control-group">
          <label class="control-label">
            Minimum Rating
            <span class="control-value" id="ratingValue">3.0 ⭐</span>
          </label>
          <input type="range" class="range-slider" id="ratingSlider" 
                min="0" max="5" value="3" step="0.5">
        </div>

        <div class="control-group">
          <label class="control-label">Sort By</label>
          <div class="sort-options">
            <button class="sort-btn active" data-sort="score">
              <i class="fas fa-star"></i> Best Match
            </button>
            <button class="sort-btn" data-sort="rating">
              <i class="fas fa-trophy"></i> Highest Rated
            </button>
            <button class="sort-btn" data-sort="distance">
              <i class="fas fa-location-arrow"></i> Nearest
            </button>
          </div>
        </div>

        <div class="control-group">
          <label class="control-label">Quick Filters</label>
          <div class="sort-options">
            <button class="quick-action-btn" id="hiddenGemsBtn">
              <i class="fas fa-gem"></i> Hidden Gems
            </button>
            <button class="quick-action-btn" id="topRatedBtn">
              <i class="fas fa-award"></i> Top Rated Only
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="bulk-actions-bar" id="bulkActionsBar">
      <span class="bulk-count" id="bulkCount">0 selected</span>
      <div class="bulk-actions">
        <button class="bulk-action-btn primary" onclick="bulkAddToTrip()">
          <i class="fas fa-plus"></i> Add All
        </button>
        <button class="bulk-action-btn secondary" onclick="clearBulkSelection()">
          <i class="fas fa-times"></i> Clear
        </button>
      </div>
    </div>
  `;

  const grid = document.getElementById('recommendationsGrid');
  if (grid) {
    grid.insertAdjacentHTML('beforebegin', controlsHTML);
  }
}

function attachAdvancedListeners() {
  // Toggle controls
  const toggle = document.getElementById('recControlsToggle');
  const body = document.getElementById('recControlsBody');
  if (toggle && body) {
    toggle.onclick = () => {
      body.classList.toggle('hidden');
      toggle.classList.toggle('collapsed');
    };
  }

  // Radius slider - reloads from API
  const radiusSlider = document.getElementById('radiusSlider');
  const radiusValue = document.getElementById('radiusValue');
  if (radiusSlider) {
    radiusSlider.oninput = (e) => {
      const value = e.target.value;
      if (radiusValue) radiusValue.textContent = `${value} km`;
      advancedRecState.options.radius = parseInt(value);
      debouncedReload();
    };
  }

  // Rating slider - filters existing data
  const ratingSlider = document.getElementById('ratingSlider');
  const ratingValue = document.getElementById('ratingValue');
  if (ratingSlider) {
    ratingSlider.oninput = (e) => {
      const value = parseFloat(e.target.value);
      if (ratingValue) ratingValue.textContent = value === 0 ? 'Any' : `${value.toFixed(1)} ⭐`;
      advancedRecState.options.minRating = value;
      debouncedFilter();
    };
  }

  // Sort buttons
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      advancedRecState.options.sortBy = btn.dataset.sort;
      applySorting();
    };
  });

  // Quick filters
  document.getElementById('hiddenGemsBtn')?.addEventListener('click', function() {
    this.classList.toggle('active');
    advancedRecState.options.showHiddenGems = !advancedRecState.options.showHiddenGems;
    applyQuickFilters();
  });

  document.getElementById('topRatedBtn')?.addEventListener('click', function() {
    this.classList.toggle('active');
    advancedRecState.options.topRatedOnly = !advancedRecState.options.topRatedOnly;
    applyQuickFilters();
  });
}

// ====================== DEBOUNCED FUNCTIONS ======================
let reloadTimeout;
function debouncedReload() {
  clearTimeout(reloadTimeout);
  reloadTimeout = setTimeout(() => {
    loadRecommendations();
  }, 500);
}

let filterTimeout;
function debouncedFilter() {
  clearTimeout(filterTimeout);
  filterTimeout = setTimeout(() => {
    applyQuickFilters();
  }, 300);
}

// ====================== SORTING & FILTERING ======================
// ✅ FIXED: Proper sorting that preserves filters
function applySorting() {
  // ✅ Always start with filtered results, not all recommendations
  let results = [...filterState.filteredResults];
  
  switch (advancedRecState.options.sortBy) {
    case 'rating':
      results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
    case 'distance':
      results.sort((a, b) => (a.distanceFromCenter || 0) - (b.distanceFromCenter || 0));
      break;
    default:
      results.sort((a, b) => (b.recommendationScore || 0) - (a.recommendationScore || 0));
  }

  // ✅ Update both filtered results and display
  filterState.filteredResults = results;
  recommendationsState.recommendations = results;
  displayRecommendations();
  
  console.log('✅ Applied sorting:', advancedRecState.options.sortBy);
}

// ✅ FIXED: Proper filtering that preserves original data
function applyQuickFilters() {
  // ✅ CRITICAL: Always start from ALL recommendations, not already-filtered ones
  let filtered = [...filterState.allRecommendations];
  const opts = advancedRecState.options;

  console.log('🔍 Applying filters to', filtered.length, 'recommendations');

  // Apply rating filter
  if (opts.minRating > 0) {
    const before = filtered.length;
    filtered = filtered.filter(r => (r.rating || 0) >= opts.minRating);
    console.log(`  Rating filter (>=${opts.minRating}): ${before} → ${filtered.length}`);
  }

  // Apply hidden gems filter
  if (opts.showHiddenGems) {
    const before = filtered.length;
    filtered = filtered.filter(r => (r.rating || 0) >= 4.0 && (r.distanceFromCenter || 0) > 3);
    console.log(`  Hidden gems filter: ${before} → ${filtered.length}`);
  }

  // Apply top rated filter
  if (opts.topRatedOnly) {
    const before = filtered.length;
    filtered = filtered.filter(r => (r.rating || 0) >= 4.5);
    console.log(`  Top rated filter: ${before} → ${filtered.length}`);
  }

  console.log('✅ Filter complete:', filtered.length, 'results');

  // ✅ Update filtered results first
  filterState.filteredResults = filtered;
  
  // ✅ Then apply current sort order
  applySorting();
}

// ====================== QUALITY BADGES ======================
function addQualityBadges() {
  const cards = document.querySelectorAll('.recommendation-card');

  cards.forEach((card, index) => {
    const rec = recommendationsState.recommendations[index];
    if (!rec) return;

    card.querySelectorAll('.quality-badge, .save-for-later').forEach(b => b.remove());

    let badge = null;
    if (rec.rating >= 4.7) {
      badge = '<div class="quality-badge top-rated"><i class="fas fa-crown"></i> Top Rated</div>';
    } else if (rec.rating >= 4.0 && rec.distanceFromCenter > 5) {
      badge = '<div class="quality-badge hidden-gem"><i class="fas fa-gem"></i> Hidden Gem</div>';
    }

    if (badge) card.insertAdjacentHTML('afterbegin', badge);

    const isSaved = advancedRecState.savedPlaces.has(rec.name);
    const saveBtn = `
      <div class="save-for-later ${isSaved ? 'saved' : ''}" onclick="toggleSaveForLater('${rec.name}', event)">
        <i class="fas fa-heart"></i>
      </div>
    `;
    card.insertAdjacentHTML('afterbegin', saveBtn);
  });
}

// ====================== COMPARISON FEATURE ======================
function toggleCompareSelection(rec, card) {
  const checkbox = card.querySelector('.rec-card-compare-checkbox');
  const checkIcon = checkbox?.querySelector('i');
  
  if (card.classList.contains('comparing')) {
    card.classList.remove('comparing');
    if (checkIcon) checkIcon.style.display = 'none';
    advancedRecState.selectedForBulk.delete(rec.name);
  } else {
    card.classList.add('comparing');
    if (checkIcon) checkIcon.style.display = 'block';
    advancedRecState.selectedForBulk.add(rec.name);
  }
  
  updateBulkActionsBar();
  
  if (typeof updateComparisonPanel === 'function') {
    updateComparisonPanel();
  }
}

function updateBulkActionsBar() {
  const bar = document.getElementById('bulkActionsBar');
  const count = document.getElementById('bulkCount');
  if (!bar || !count) return;

  const selected = advancedRecState.selectedForBulk.size;

  if (selected > 0) {
    bar.classList.add('show');
    count.textContent = `${selected} selected`;
  } else {
    bar.classList.remove('show');
  }
}

// ====================== ADD TO TRIP (FIXED) ======================
async function addRecommendationToTrip(rec) {
  try {
    console.log('🔍 Adding recommendation to trip:', rec);

    // ✅ VALIDATION: Check for required coordinates
    if (!rec.lat || !rec.lon) {
      console.error('❌ Missing coordinates:', { lat: rec.lat, lon: rec.lon });
      showToast('Missing location data for this place', 'error');
      return;
    }

    // ✅ Validate coordinate values
    const lat = parseFloat(rec.lat);
    const lon = parseFloat(rec.lon);

    if (isNaN(lat) || isNaN(lon) || lat === 0 || lon === 0) {
      console.error('❌ Invalid coordinates:', { lat, lon });
      showToast('Invalid location data for this place', 'error');
      return;
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      console.error('❌ Coordinates out of range:', { lat, lon });
      showToast('Invalid coordinate range', 'error');
      return;
    }

    // ✅ PROPER DATA STRUCTURE matching backend expectations
    const placeData = {
      // Required fields
      name: rec.name,
      category: rec.category?.toLowerCase() || 'other',
      
      // Location with proper GeoJSON format [longitude, latitude]
      location: {
        type: 'Point',
        coordinates: [lon, lat] // ✅ CORRECT ORDER: [longitude, latitude]
      },
      
      // Optional fields (backend will accept these)
      address: rec.address || '',
      rating: parseFloat(rec.rating) || 0,
      priceLevel: parseInt(rec.priceLevel) || 0,
      description: rec.description || '',
      
      // ✅ Combine AI reasons into notes
      notes: rec.reasons && rec.reasons.length > 0
        ? `Added from AI recommendations.\n\nWhy recommended:\n${rec.reasons.map(r => `• ${r}`).join('\n')}`
        : 'Added from AI recommendations'
    };

    console.log('📤 Sending place data:', placeData);

    // ✅ Call API with proper error handling
    const response = await apiService.places.create(
      recommendationsState.currentTripId, 
      placeData
    );

    console.log('✅ Place added successfully:', response);
    showToast('✅ Place added to your trip!', 'success');

    // ✅ Remove from ALL recommendation arrays
    filterState.allRecommendations = filterState.allRecommendations.filter(r => r.name !== rec.name);
    filterState.filteredResults = filterState.filteredResults.filter(r => r.name !== rec.name);
    recommendationsState.recommendations = recommendationsState.recommendations.filter(r => r.name !== rec.name);

    // Update UI
    displayRecommendations();

    // Reload places list if function exists
    if (typeof loadPlaces === 'function') {
      await loadPlaces();
    }

    // Update map if function exists
    if (typeof updateMapWithRecommendations === 'function') {
      updateMapWithRecommendations();
    }

  } catch (err) {
    console.error('❌ Error adding place:', err);
    
    // ✅ Show detailed error message to user
    let errorMessage = 'Failed to add place';
    
    if (err.message) {
      // Check for specific error types
      if (err.message.includes('Coordinates')) {
        errorMessage = 'Invalid location coordinates';
      } else if (err.message.includes('Category')) {
        errorMessage = 'Invalid category';
      } else if (err.message.includes('required')) {
        errorMessage = 'Missing required information';
      } else {
        errorMessage = err.message;
      }
    }
    
    showToast(errorMessage, 'error');
  }
}

window.addRecommendationToTrip = addRecommendationToTrip;
