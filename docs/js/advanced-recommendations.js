// ============================================================
// UNIFIED ADVANCED RECOMMENDATIONS MODULE
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

// Recommendations state (separate from advancedRecState)
const recommendationsState = {
  currentTripId: null,
  recommendations: [],
  dayPlans: [],
  userPreferences: null,
  isLoading: false
};

// ====================== INITIALIZATION ======================
/**
 * Initialize all recommendation features
 */
async function initRecommendations(tripId, tripData) {
  console.log('🚀 Initializing unified recommendations module');
  
  recommendationsState.currentTripId = tripId;
  
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
      // Extract coordinates from various possible formats
      let lat = 0, lon = 0;
      
      if (place.location?.coordinates) {
        // GeoJSON format: [lon, lat]
        lon = place.location.coordinates[0];
        lat = place.location.coordinates[1];
      } else if (place.lat && place.lon) {
        // Direct properties
        lat = place.lat;
        lon = place.lon;
      } else if (place.location?.lat && place.location?.lon) {
        // Nested properties
        lat = place.location.lat;
        lon = place.location.lon;
      }

      // ✅ VALIDATE COORDINATES
      if (!lat || !lon || lat === 0 || lon === 0) {
        console.warn('⚠️ Missing/invalid coordinates for:', place.name);
      }

      return {
        ...place,
        lat: parseFloat(lat) || 0,
        lon: parseFloat(lon) || 0
      };
    });

    // Filter out places with no valid coordinates
    const validPlaces = places.filter(p => p.lat !== 0 && p.lon !== 0);
    const invalidCount = places.length - validPlaces.length;
    
    if (invalidCount > 0) {
      console.warn(`⚠️ Filtered out ${invalidCount} places with invalid coordinates`);
    }

    recommendationsState.recommendations = validPlaces;

    console.log('✅ Loaded', validPlaces.length, 'valid recommendations');
    
    // Update filter state
    if (typeof filterState !== 'undefined') {
      filterState.allRecommendations = [...validPlaces];
      filterState.filteredResults = [...validPlaces];
    }

    displayRecommendations();
    
    // ✅ Update map after short delay to ensure DOM is ready
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
        <h3>No recommendations yet</h3>
        <p>AI is generating personalized suggestions for your trip...</p>
      </div>
    `;
    return;
  }

  container.innerHTML = recs.map(rec => createRecommendationCard(rec)).join('');

  // Attach event listeners
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

    // View details button
    const detailsBtn = card.querySelector('.btn-view-details');
    if (detailsBtn) {
      detailsBtn.onclick = (e) => {
        e.stopPropagation();
        showRecommendationDetails(rec);
      };
    }

    // Compare checkbox
    const checkbox = card.querySelector('.rec-card-compare-checkbox');
    if (checkbox) {
      checkbox.onclick = (e) => {
        e.stopPropagation();
        toggleCompareSelection(rec, card);
      };
    }
  });

  // Add quality badges
  addQualityBadges();

  console.log('📍 Rendered', recs.length, 'recommendation cards with coordinates');
}

window.displayRecommendations = displayRecommendations;

// ====================== CREATE RECOMMENDATION CARD ======================
function createRecommendationCard(rec) {
  const icon = getCategoryIcon(rec.category);
  
  // ✅ Use validated lat/lon
  const lat = rec.lat || 0;
  const lon = rec.lon || 0;

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
         data-lon="${lon}">
      
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
  let results = [...recommendationsState.recommendations];
  
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

  recommendationsState.recommendations = results;
  displayRecommendations();
}

function applyQuickFilters() {
  let filtered = [...recommendationsState.recommendations];
  const opts = advancedRecState.options;

  if (opts.minRating > 0) {
    filtered = filtered.filter(r => (r.rating || 0) >= opts.minRating);
  }

  if (opts.showHiddenGems) {
    filtered = filtered.filter(r => (r.rating || 0) >= 4.0 && (r.distanceFromCenter || 0) > 3);
  }

  if (opts.topRatedOnly) {
    filtered = filtered.filter(r => (r.rating || 0) >= 4.5);
  }

  recommendationsState.recommendations = filtered;
  displayRecommendations();
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

// ====================== ADD TO TRIP ======================
async function addRecommendationToTrip(rec) {
  try {
    if (!rec.lat || !rec.lon) {
      showToast('Missing location data for this place', 'error');
      return;
    }

    const placeData = {
      name: rec.name,
      category: rec.category,
      address: rec.address || '',
      location: {
        type: 'Point',
        coordinates: [rec.lon, rec.lat]
      },
      rating: rec.rating || 0,
      priceLevel: rec.priceLevel || 0,
      description: rec.description || '',
      notes: `Added from AI recommendations. ${(rec.reasons || []).join('. ')}`
    };

    await apiService.places.create(recommendationsState.currentTripId, placeData);
    showToast('✅ Place added to your trip!', 'success');

    recommendationsState.recommendations = 
      recommendationsState.recommendations.filter(r => r.name !== rec.name);

    displayRecommendations();

    if (typeof loadPlaces === 'function') {
      await loadPlaces();
    }

  } catch (err) {
    console.error('❌ Error adding place:', err);
    showToast('Failed to add place', 'error');
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

// ====================== STORAGE ======================
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

console.log('✅ Unified advanced recommendations module loaded with map support');
