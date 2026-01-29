//============================================================
// UNIFIED ADVANCED RECOMMENDATIONS MODULE - FIXED VERSION
// ✅ Bulk actions bar only shows when checkboxes are selected
// ✅ Comparison button opens comparison panel on the right
//============================================================

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
  selectedForBulk: new Set() // ✅ Tracks selected items
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
    allRecommendations: [],
    filteredResults: []
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

// ====================== STORAGE FUNCTIONS ======================
function saveSavedPreferences() {
  try {
    sessionStorage.setItem('savedPlaces', JSON.stringify(Array.from(advancedRecState.savedPlaces)));
  } catch (err) {
    console.error('Error saving preferences:', err);
  }
}

function loadSavedPreferences() {
  try {
    const saved = sessionStorage.getItem('savedPlaces');
    if (saved) {
      advancedRecState.savedPlaces = new Set(JSON.parse(saved));
    }
  } catch (err) {
    console.error('Error loading preferences:', err);
  }
}

// ====================== INITIALIZATION ======================
async function initRecommendations(tripId, tripData) {
  console.log('🚀 Initializing unified recommendations module');
  
  recommendationsState.currentTripId = tripId;
  recommendationsState.tripData = tripData;
  
  renderAdvancedControls();
  attachAdvancedListeners();
  loadSavedPreferences();
  
  // ✅ Initialize comparison panel
  if (typeof initComparisonPanel === 'function') {
    initComparisonPanel();
  }
  
  await loadRecommendations();
}

window.initRecommendations = initRecommendations;

// ====================== LOAD RECOMMENDATIONS ======================
async function loadRecommendations(options = {}) {
  try {
    recommendationsState.isLoading = true;
    showRecommendationsLoading();
    
    const activeBtn = document.querySelector('.category-filter-btn.active');
    if (activeBtn) {
      activeBtn.classList.add('loading');
    }

    console.log('🔍 Loading recommendations for trip:', recommendationsState.currentTripId);
    console.log('  📋 Category filter:', options.category || 'all');

    const params = {
      radius: (advancedRecState.options.radius * 1000) || 10000,
      limit: advancedRecState.options.maxResults || 50
    };

    if (options.category && options.category !== 'all') {
      params.category = options.category;
    }

    const res = await apiService.recommendations.getForTrip(
      recommendationsState.currentTripId,
      params
    );
    
    const responseData = res.data || {};
    let places = Array.isArray(responseData) ? responseData : responseData.places || [];
    
    console.log('📦 Raw API response:', places.length, 'places');

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

    filterState.allRecommendations = [...validPlaces];
    filterState.filteredResults = [...validPlaces];
    recommendationsState.recommendations = [...validPlaces];

    console.log('✅ Loaded', validPlaces.length, 'valid recommendations');

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
    
    const loadingBtn = document.querySelector('.category-filter-btn.loading');
    if (loadingBtn) {
      loadingBtn.classList.remove('loading');
    }
  }
}

window.loadRecommendations = loadRecommendations;

// ====================== DISPLAY RECOMMENDATIONS ======================
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

  // ✅ FIXED: Attach event listeners properly
  recs.forEach((rec, index) => {
    const card = container.children[index];
    if (!card) return;

    // Add to trip button
    const addBtn = card.querySelector('.btn-add-to-trip');
    if (addBtn) {
      addBtn.onclick = (e) => {
        e.stopPropagation();
        addRecommendationToTrip(rec);
      };
    }

    // Details button
    const detailsBtn = card.querySelector('.btn-view-details');
    if (detailsBtn) {
      detailsBtn.onclick = (e) => {
        e.stopPropagation();
        showRecommendationDetails(rec);
      };
    }

    // ✅ COMPARISON CHECKBOX - FIXED EVENT HANDLER
    const checkbox = card.querySelector('.rec-card-compare-checkbox');
    if (checkbox) {
      checkbox.onclick = (e) => {
        e.stopPropagation();
        handleCompareCheckbox(rec, card);
      };
    }
  });

  addQualityBadges();
  console.log('📍 Rendered', recs.length, 'recommendation cards with coordinates');
}

// ✅ NEW: Proper comparison checkbox handler
function handleCompareCheckbox(rec, card) {
  const checkIcon = card.querySelector('.rec-card-compare-checkbox i');
  
  if (card.classList.contains('comparing')) {
    // Remove from comparison
    card.classList.remove('comparing');
    if (checkIcon) checkIcon.style.display = 'none';
    advancedRecState.selectedForBulk.delete(rec.name);
    
    // Remove from comparison panel
    if (typeof window.comparisonState !== 'undefined' && window.comparisonState.selectedPlaces) {
      window.comparisonState.selectedPlaces.delete(rec.name);
    }
    
    showToast('Removed from selection', 'info');
  } else {
    // Add to comparison
    card.classList.add('comparing');
    if (checkIcon) checkIcon.style.display = 'block';
    advancedRecState.selectedForBulk.add(rec.name);
    
    // Add to comparison panel
    if (typeof window.comparisonState !== 'undefined' && window.comparisonState.selectedPlaces) {
      window.comparisonState.selectedPlaces.set(rec.name, rec);
    }
    
    showToast('Added to selection', 'success');
  }
  
  updateBulkActionsBar(); // ✅ This controls visibility
  
  // ✅ Update comparison panel
  if (typeof updateComparisonPanel === 'function') {
    updateComparisonPanel();
  }
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
      
      <!-- ✅ COMPARISON CHECKBOX -->
      <div class="rec-card-compare-checkbox" title="Select for comparison">
        <i class="fas fa-check" style="display: none;"></i>
      </div>

      <div class="rec-header">
        <div class="rec-title">
          <h3 class="rec-name">${escapeHtml(rec.name)}</h3>
          ${rec.city || rec.country ? `
            <div class="rec-location-info">
              <i class="fas fa-map-marker-alt"></i>
              ${rec.city ? escapeHtml(rec.city) : ''}${rec.city && rec.country ? ', ' : ''}${rec.country ? escapeHtml(rec.country) : ''}
            </div>
          ` : ''}
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

      ${rec.address && rec.address !== 'undefined' ? `
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
    <div class="rec-category-filters">
      <h3>
        <i class="fas fa-filter"></i>
        Filter by Category
      </h3>
      <div class="category-filter-buttons">
        <button class="category-filter-btn active" data-category="all">
          <i class="fas fa-th"></i>
          All Categories
        </button>
        <button class="category-filter-btn" data-category="restaurant">
          <i class="fas fa-utensils"></i>
          Restaurants
        </button>
        <button class="category-filter-btn" data-category="attraction">
          <i class="fas fa-landmark"></i>
          Attractions
        </button>
        <button class="category-filter-btn" data-category="accommodation">
          <i class="fas fa-bed"></i>
          Hotels
        </button>
      </div>
    </div>

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

    <!-- ✅ FIXED: Bulk actions bar - hidden by default -->
    <div class="bulk-actions-bar" id="bulkActionsBar">
      <span class="bulk-count" id="bulkCount">0 selected</span>
      <div class="bulk-actions">
        <button class="bulk-action-btn primary" onclick="bulkAddToTrip()">
          <i class="fas fa-plus"></i> Add All to Trip
        </button>
        <button class="bulk-action-btn comparison" onclick="openComparisonPanel()">
          <i class="fas fa-balance-scale"></i> Compare
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
  // Category filter buttons
  document.querySelectorAll('.category-filter-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      document.querySelectorAll('.category-filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      const category = this.dataset.category;
      console.log('🔍 Filtering by category:', category);
      
      await loadRecommendations({ 
        category: category === 'all' ? undefined : category 
      });
    });
  });

  // Toggle controls
  const toggle = document.getElementById('recControlsToggle');
  const body = document.getElementById('recControlsBody');
  if (toggle && body) {
    toggle.onclick = () => {
      body.classList.toggle('hidden');
      toggle.classList.toggle('collapsed');
    };
  }

  // Radius slider
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

  // Rating slider
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
function applySorting() {
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

  filterState.filteredResults = results;
  recommendationsState.recommendations = results;
  displayRecommendations();
  
  console.log('✅ Applied sorting:', advancedRecState.options.sortBy);
}

function applyQuickFilters() {
  let filtered = [...filterState.allRecommendations];
  const opts = advancedRecState.options;

  console.log('🔍 Applying filters to', filtered.length, 'recommendations');

  if (opts.minRating > 0) {
    const before = filtered.length;
    filtered = filtered.filter(r => (r.rating || 0) >= opts.minRating);
    console.log(`  Rating filter (>=${opts.minRating}): ${before} → ${filtered.length}`);
  }

  if (opts.showHiddenGems) {
    const before = filtered.length;
    filtered = filtered.filter(r => (r.rating || 0) >= 4.0 && (r.distanceFromCenter || 0) > 3);
    console.log(`  Hidden gems filter: ${before} → ${filtered.length}`);
  }

  if (opts.topRatedOnly) {
    const before = filtered.length;
    filtered = filtered.filter(r => (r.rating || 0) >= 4.5);
    console.log(`  Top rated filter: ${before} → ${filtered.length}`);
  }

  console.log('✅ Filter complete:', filtered.length, 'results');

  filterState.filteredResults = filtered;
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

// ====================== BULK ACTIONS BAR - FIXED ======================
function updateBulkActionsBar() {
  const bar = document.getElementById('bulkActionsBar');
  const count = document.getElementById('bulkCount');
  if (!bar || !count) return;

  const selected = advancedRecState.selectedForBulk.size;

  if (selected > 0) {
    bar.classList.add('show'); // ✅ Show bar
    count.textContent = `${selected} selected`;
  } else {
    bar.classList.remove('show'); // ✅ Hide bar
  }
}

// ✅ NEW: Open comparison panel
window.openComparisonPanel = function() {
  if (advancedRecState.selectedForBulk.size === 0) {
    showToast('Please select places to compare', 'warning');
    return;
  }

  const panel = document.getElementById('comparisonPanel');
  if (panel) {
    panel.classList.add('active');
  }

  if (typeof updateComparisonPanel === 'function') {
    updateComparisonPanel();
  }
};

// ====================== ADD TO TRIP ======================
async function addRecommendationToTrip(rec) {
  try {
    console.log('🔍 Adding recommendation to trip:', rec);

    if (!rec.lat || !rec.lon) {
      console.error('❌ Missing coordinates:', { lat: rec.lat, lon: rec.lon });
      showToast('Missing location data for this place', 'error');
      return;
    }

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

    const placeData = {
      name: rec.name,
      category: (rec.category && rec.category !== 'undefined') ? rec.category.toLowerCase() : 'attraction',
      location: {
        type: 'Point',
        coordinates: [lon, lat]
      },
      address: rec.address || '',
      rating: parseFloat(rec.rating) || 0,
      priceLevel: parseInt(rec.priceLevel) || 0,
      description: rec.description || '',
      notes: rec.reasons && rec.reasons.length > 0
        ? `${rec.reasons.map(r => `• ${r}`).join('\n')}`
        : ''
    };

    console.log('📤 Sending place data:', placeData);

    const response = await apiService.places.create(
      recommendationsState.currentTripId, 
      placeData
    );

    console.log('✅ Place added successfully:', response);
    showToast('✅ Place added to your trip!', 'success');

    filterState.allRecommendations = filterState.allRecommendations.filter(r => r.name !== rec.name);
    filterState.filteredResults = filterState.filteredResults.filter(r => r.name !== rec.name);
    recommendationsState.recommendations = recommendationsState.recommendations.filter(r => r.name !== rec.name);

    displayRecommendations();

    if (typeof loadPlaces === 'function') {
      await loadPlaces();
    }

    if (typeof updateMapWithRecommendations === 'function') {
      updateMapWithRecommendations();
    }

  } catch (err) {
    console.error('❌ Error adding place:', err);
    
    let errorMessage = 'Failed to add place';
    
    if (err.message) {
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

// ====================== BULK ACTIONS ======================
window.bulkAddToTrip = async function() {
  const selected = Array.from(advancedRecState.selectedForBulk);
  if (selected.length === 0) {
    showToast('No places selected', 'warning');
    return;
  }

  let addedCount = 0;
  for (const placeName of selected) {
    const rec = recommendationsState.recommendations.find(r => r.name === placeName);
    if (rec) {
      try {
        await addRecommendationToTrip(rec);
        addedCount++;
      } catch (err) {
        console.error('Error adding place:', err);
      }
    }
  }

  if (addedCount > 0) {
    showToast(`Added ${addedCount} place(s) to your trip!`, 'success');
    clearBulkSelection();
  }
};

window.clearBulkSelection = function() {
  advancedRecState.selectedForBulk.clear();
  document.querySelectorAll('.recommendation-card.comparing').forEach(card => {
    card.classList.remove('comparing');
    const checkbox = card.querySelector('.rec-card-compare-checkbox i');
    if (checkbox) checkbox.style.display = 'none';
  });
  
  // Clear comparison panel
  if (typeof window.comparisonState !== 'undefined' && window.comparisonState.selectedPlaces) {
    window.comparisonState.selectedPlaces.clear();
  }
  if (typeof updateComparisonPanel === 'function') {
    updateComparisonPanel();
  }
  
  updateBulkActionsBar();
};

// ====================== DETAILS MODAL ======================
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
        <p><strong>Category:</strong> ${escapeHtml(rec.category)}</p>
        <p><strong>Rating:</strong> ${(rec.rating || 0).toFixed(1)} / 5.0</p>
        ${rec.distanceFromCenter ? `<p><strong>Distance:</strong> ${rec.distanceFromCenter.toFixed(2)} km</p>` : ''}
        ${rec.address ? `<p><strong>Address:</strong> ${escapeHtml(rec.address)}</p>` : ''}
        ${rec.description ? `<p>${escapeHtml(rec.description)}</p>` : ''}
        <p><strong>Coordinates:</strong> ${rec.lat.toFixed(4)}, ${rec.lon.toFixed(4)}</p>
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

window.addRecommendationToTripFromModal = async function(rec) {
  await addRecommendationToTrip(rec);
  document.querySelector('.modal')?.remove();
};

// ====================== SAVE FOR LATER ======================
window.toggleSaveForLater = function(placeName, event) {
  event.stopPropagation();
  if (advancedRecState.savedPlaces.has(placeName)) {
    advancedRecState.savedPlaces.delete(placeName);
    showToast('Removed from saved', 'info');
  } else {
    advancedRecState.savedPlaces.add(placeName);
    showToast('Saved for later!', 'success');
  }
  saveSavedPreferences();
  addQualityBadges();
};

// ====================== UI HELPERS ======================
function showRecommendationsLoading() {
  const container = document.getElementById('recommendationsGrid');
  if (container) {
    container.innerHTML = `
      <div class="recommendations-loading">
        <div class="loading-spinner"></div>
        <p>🤖 AI is finding personalized recommendations...</p>
      </div>
    `;
  }
}

function showRecommendationsError() {
  const container = document.getElementById('recommendationsGrid');
  if (container) {
    container.innerHTML = `
      <div class="recommendations-empty">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Failed to load recommendations</h3>
        <button class="btn-primary" onclick="loadRecommendations()">
          <i class="fas fa-redo"></i> Retry
        </button>
      </div>
    `;
  }
}

function getCategoryIcon(category) {
  const icons = {
    restaurant: 'utensils',
    attraction: 'landmark',
    accommodation: 'bed',
    transport: 'bus',
    shopping: 'shopping-bag',
    entertainment: 'film',
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

console.log('✅ Fixed advanced recommendations module loaded');
