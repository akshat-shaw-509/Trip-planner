/* ====================== STATE ====================== */
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

let userPreferences = null;

/* ====================== RENDER CONTROLS ====================== */
function renderAdvancedControls() {
  const modalContent = document.getElementById('filterModalContent');
  if (!modalContent) return;

  modalContent.innerHTML = `
    <div class="recommendation-controls">

      <div class="controls-section">
        <label class="section-title">Category</label>
        <div class="category-buttons">
          <button class="category-btn active" data-category="all">All</button>
          <button class="category-btn" data-category="restaurant">Restaurants</button>
          <button class="category-btn" data-category="attraction">Attractions</button>
          <button class="category-btn" data-category="accommodation">Hotels</button>
        </div>
      </div>

      <div class="controls-section">
        <label class="section-title">
          Minimum Rating: <span id="ratingValue">3.0 ⭐</span>
        </label>
        <input type="range" id="ratingSlider" min="0" max="5" step="0.5" value="3.0" />
      </div>

      <div class="controls-section">
        <label class="section-title">
          Search Radius: <span id="radiusValue">10 km</span>
        </label>
        <input type="range" id="radiusSlider" min="1" max="50" step="1" value="10" />
      </div>

      <div class="controls-section">
        <label class="section-title">Sort By</label>
        <div class="sort-buttons">
          <button class="sort-btn active" data-sort="score">Best Match</button>
          <button class="sort-btn" data-sort="rating">Rating</button>
          <button class="sort-btn" data-sort="distance">Distance</button>
        </div>
      </div>

      <div class="controls-section">
        <label class="section-title">Quick Filters</label>
        <div class="quick-filters">
          <button class="quick-filter-btn" data-filter="hiddenGems">Hidden Gems</button>
          <button class="quick-filter-btn" data-filter="topRated">Top Rated</button>
        </div>
      </div>

      <div class="filter-actions">
        <button class="btn-reset-filters" onclick="resetFilters()">Reset All</button>
        <button class="btn-apply-filters" onclick="applyFiltersAndClose()">Apply Filters</button>
      </div>

    </div>
  `;
}

function applyFiltersAndClose() {
  applyQuickFilters();
  document.getElementById('filterModal').style.display = 'none';
  showToast('Filters applied!', 'success');
}

function resetFilters() {
  // Reset state
  advancedRecState.options = {
    radius: 10,
    minRating: 3.0,
    maxResults: 50,
    sortBy: 'score',
    viewMode: 'grid',
    showHiddenGems: false,
    budgetFriendly: false,
    topRatedOnly: false,
    nearbyOnly: false
  };

  filterState.activeFilters = {
    categories: [],
    minRating: 0,
    maxDistance: 999,
    priceLevel: null
  };

  // Reset UI
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.category === 'all');
  });

  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sort === 'score');
  });

  document.querySelectorAll('.quick-filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  const ratingSlider = document.getElementById('ratingSlider');
  const radiusSlider = document.getElementById('radiusSlider');

  if (ratingSlider) {
    ratingSlider.value = '3.0';
    document.getElementById('ratingValue').textContent = '3.0 ⭐';
  }

  if (radiusSlider) {
    radiusSlider.value = '10';
    document.getElementById('radiusValue').textContent = '10 km';
  }

  loadRecommendations();
  showToast('Filters reset!', 'info');
}

window.resetFilters = resetFilters;
window.applyFiltersAndClose = applyFiltersAndClose;

/* ====================== ATTACH LISTENERS ====================== */
let listenersAttached = false;

function attachAdvancedListenersOnce() {
  if (listenersAttached) return;
  listenersAttached = true;

  // Category buttons
  document.addEventListener('click', (e) => {
    const catBtn = e.target.closest('.category-btn');
    if (catBtn) {
      document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
      catBtn.classList.add('active');
      const category = catBtn.dataset.category;
      filterState.activeFilters.categories = category === 'all' ? [] : [category];
      applyQuickFilters();
    }

    // Sort buttons
    const sortBtn = e.target.closest('.sort-btn');
    if (sortBtn) {
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
      sortBtn.classList.add('active');
      advancedRecState.options.sortBy = sortBtn.dataset.sort;
      applySorting();
    }

    // Quick filter buttons
    const quickBtn = e.target.closest('.quick-filter-btn');
    if (quickBtn) {
      quickBtn.classList.toggle('active');
      const filter = quickBtn.dataset.filter;

      if (filter === 'hiddenGems') {
        advancedRecState.options.showHiddenGems = quickBtn.classList.contains('active');
      } else if (filter === 'topRated') {
        advancedRecState.options.topRatedOnly = quickBtn.classList.contains('active');
      }

      applyQuickFilters();
    }
  });

  // Rating slider
  const ratingSlider = document.getElementById('ratingSlider');
  if (ratingSlider) {
    ratingSlider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      document.getElementById('ratingValue').textContent = `${value.toFixed(1)} ⭐`;
      advancedRecState.options.minRating = value;
    });

    ratingSlider.addEventListener('change', () => {
      applyQuickFilters();
    });
  }

  // Radius slider
  const radiusSlider = document.getElementById('radiusSlider');
  if (radiusSlider) {
    radiusSlider.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      document.getElementById('radiusValue').textContent = `${value} km`;
      advancedRecState.options.radius = value;
    });

    radiusSlider.addEventListener('change', () => {
      loadRecommendations();
    });
  }
}

/* ====================== LOAD RECOMMENDATIONS ====================== */
async function loadRecommendations(options = {}) {
  try {
    recommendationsState.isLoading = true;
    showRecommendationsLoading();

    const opts = { ...advancedRecState.options, ...options };

    const response = await apiService.recommendations.getForTrip(
      recommendationsState.currentTripId,
      {
        radius: opts.radius,
        minRating: opts.minRating,
        maxResults: opts.maxResults
      }
    );

    const data = response.data || response;
    const recs = Array.isArray(data.places) ? data.places : [];
recommendationsState.recommendations = recs;
filterState.allRecommendations = recs;
filterState.filteredResults = recs;
console.log('AI RECS LOADED:', recs.length, recs[0]);

    recommendationsState.recommendations = recs;
    filterState.allRecommendations = recs;
    filterState.filteredResults = recs;

    applyQuickFilters();

  } catch (err) {
    console.error('Load recommendations error:', err);
    showRecommendationsError();
  } finally {
    recommendationsState.isLoading = false;
  }
}

function displayRecommendations() {
  const container = document.getElementById('recommendationsGrid');
  const resultsCount = document.getElementById('resultsCount');

  if (!container) return;

  const recs = filterState.filteredResults || [];

  if (resultsCount) {
    resultsCount.textContent = `${recs.length} Recommendation${recs.length !== 1 ? 's' : ''}`;
  }

  if (recs.length === 0) {
    container.innerHTML = `
      <div class="recommendations-empty">
        <i class="fas fa-search"></i>
        <h3>No recommendations found</h3>
        <p>Try adjusting your filters or search radius</p>
        <button class="btn-primary" onclick="resetFilters()">
          <i class="fas fa-undo"></i> Reset Filters
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = recs.map(rec => createRecommendationCard(rec)).join('');

  recs.forEach((rec) => {
    const card = container.querySelector(`[data-rec-name="${escapeAttr(rec.name)}"]`);
    if (!card) return;

    // Add to trip button
    card.querySelector('.btn-add-to-trip')?.addEventListener('click', (e) => {
      e.stopPropagation();
      addRecommendationToTrip(rec);
    });

    // Compare checkbox
    card.querySelector('.rec-card-compare-checkbox')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof window.handleCompareCheckboxClick === 'function') {
        window.handleCompareCheckboxClick(rec, card);
      }
    });

    // Card click for details
    card.addEventListener('click', () => {
      showRecommendationDetails(rec);
    });
  });

  addQualityBadges();
}

function createRecommendationCard(rec) {
  const icon = getCategoryIcon(rec.category);
  const distance = rec.distanceFromCenter ? `${rec.distanceFromCenter.toFixed(1)} km away` : '';
  const priceLevel = rec.priceLevel ? '$'.repeat(rec.priceLevel) : '';

  return `
    <div class="recommendation-card" data-rec-name="${escapeAttr(rec.name)}">
      <!-- Compare Checkbox -->
      <div class="rec-card-compare-checkbox">
        <i class="fas fa-check" style="display: none;"></i>
      </div>

      <!-- Card Header -->
      <div class="rec-card-header">
        <div class="rec-card-icon">
          <i class="fas fa-${icon}"></i>
        </div>
        <div class="rec-card-category">${escapeHtml(rec.category)}</div>
      </div>

      <!-- Card Body -->
      <div class="rec-card-body">
        <h4 class="rec-card-title">${escapeHtml(rec.name)}</h4>
        
        <div class="rec-card-meta">
          ${rec.rating ? `
            <span class="rec-rating">
              <i class="fas fa-star"></i>
              ${rec.rating.toFixed(1)}
            </span>
          ` : ''}
          
          ${distance ? `
            <span class="rec-distance">
              <i class="fas fa-map-marker-alt"></i>
              ${distance}
            </span>
          ` : ''}
          
          ${priceLevel ? `
            <span class="rec-price">
              ${priceLevel}
            </span>
          ` : ''}
        </div>

        ${rec.description ? `
          <p class="rec-card-description">${escapeHtml(rec.description.substring(0, 120))}${rec.description.length > 120 ? '...' : ''}</p>
        ` : ''}

        ${rec.recommendationScore ? `
          <div class="rec-ai-score">
            <i class="fas fa-robot"></i>
            <span>AI Score: ${rec.recommendationScore.toFixed(1)}/10</span>
          </div>
        ` : ''}
      </div>

      <!-- Card Actions -->
      <div class="rec-card-actions">
        <button class="btn-add-to-trip">
          <i class="fas fa-plus"></i>
          Add to Trip
        </button>
      </div>
    </div>
  `;
}

function applySorting() {
  const sortBy = advancedRecState.options.sortBy;
  const recs = [...filterState.filteredResults];

  if (sortBy === 'rating') {
    recs.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (sortBy === 'distance') {
    recs.sort((a, b) => (a.distanceFromCenter || 999) - (b.distanceFromCenter || 999));
  } else if (sortBy === 'score') {
    recs.sort((a, b) => (b.recommendationScore || 0) - (a.recommendationScore || 0));
  }

  recommendationsState.recommendations = recs;
  displayRecommendations();
}

function applyQuickFilters() {
  let filtered = [...filterState.allRecommendations];
  const opts = advancedRecState.options;

  // Category filter
  if (filterState.activeFilters.categories.length > 0) {
    filtered = filtered.filter(r => 
      filterState.activeFilters.categories.includes(r.category?.toLowerCase())
    );
  }

  // Rating filter
  if (opts.minRating > 0) {
    filtered = filtered.filter(r => (r.rating || 0) >= opts.minRating);
  }

  // Hidden gems
  if (opts.showHiddenGems) {
    filtered = filtered.filter(r => (r.rating || 0) >= 4.0 && (r.distanceFromCenter || 0) > 3);
  }

  // Top rated
  if (opts.topRatedOnly) {
    filtered = filtered.filter(r => (r.rating || 0) >= 4.5);
  }

  filterState.filteredResults = filtered;
  applySorting();
}

function addQualityBadges() {
  const cards = document.querySelectorAll('.recommendation-card');

  cards.forEach((card, index) => {
    const rec = recommendationsState.recommendations[index];
    if (!rec) return;

    card.querySelectorAll('.quality-badge, .save-for-later').forEach(b => b.remove());

    let badge = null;
    if ((rec.rating || 0) >= 4.7) {
      badge = '<div class="quality-badge top-rated"><i class="fas fa-crown"></i> Top Rated</div>';
    } else if ((rec.rating || 0) >= 4.0 && (rec.distanceFromCenter || 0) > 5) {
      badge = '<div class="quality-badge hidden-gem"><i class="fas fa-gem"></i> Hidden Gem</div>';
    }

    if (badge) card.insertAdjacentHTML('afterbegin', badge);

    const isSaved = advancedRecState.savedPlaces.has(rec.name);
    const saveBtn = `
      <div class="save-for-later ${isSaved ? 'saved' : ''}" onclick="toggleSaveForLater('${escapeAttr(rec.name)}', event)">
        <i class="fas fa-heart"></i>
      </div>
    `;
    card.insertAdjacentHTML('afterbegin', saveBtn);
  });
}

/* ====================== ADD TO TRIP ====================== */
async function addRecommendationToTrip(rec) {
  try {
    const lat = Number(rec.lat);
    const lon = Number(rec.lon);

    if (!lat || !lon || Number.isNaN(lat) || Number.isNaN(lon)) {
      showToast('Invalid location data', 'error');
      return;
    }

    const placeData = {
      name: rec.name,
      category: (rec.category && rec.category !== 'undefined') ? rec.category.toLowerCase() : 'attraction',
      location: { type: 'Point', coordinates: [lon, lat] },
      address: rec.address || '',
      rating: Number(rec.rating) || 0,
      priceLevel: Number.parseInt(rec.priceLevel) || 0,
      description: rec.description || '',
      notes: (rec.reasons && rec.reasons.length > 0) ? rec.reasons.map(r => `• ${r}`).join('\n') : ''
    };

    await apiService.places.create(recommendationsState.currentTripId, placeData);
    showToast('✅ Place added to your trip!', 'success');

    // Remove from recommendations
    filterState.allRecommendations = filterState.allRecommendations.filter(r => r.name !== rec.name);
    filterState.filteredResults = filterState.filteredResults.filter(r => r.name !== rec.name);
    recommendationsState.recommendations = recommendationsState.recommendations.filter(r => r.name !== rec.name);

    displayRecommendations();

    if (typeof loadPlaces === 'function') await loadPlaces();
    if (typeof updateMapWithRecommendations === 'function') updateMapWithRecommendations();

  } catch (err) {
    console.error('Error adding place:', err);
    showToast('Failed to add place', 'error');
  }
}
window.addRecommendationToTrip = addRecommendationToTrip;

/* ====================== DETAILS MODAL ====================== */
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
        <p><strong>Rating:</strong> ${Number(rec.rating || 0).toFixed(1)} / 5.0</p>
        ${rec.distanceFromCenter ? `<p><strong>Distance:</strong> ${Number(rec.distanceFromCenter).toFixed(2)} km</p>` : ''}
        ${rec.address ? `<p><strong>Address:</strong> ${escapeHtml(rec.address)}</p>` : ''}
        ${rec.description ? `<p>${escapeHtml(rec.description)}</p>` : ''}
        <p><strong>Coordinates:</strong> ${Number(rec.lat).toFixed(4)}, ${Number(rec.lon).toFixed(4)}</p>
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

window.addRecommendationToTripFromModal = async function (rec) {
  await addRecommendationToTrip(rec);
  document.querySelector('.modal')?.remove();
};

window.showRecommendationDetails = showRecommendationDetails;

/* ====================== SAVE FOR LATER ====================== */
window.toggleSaveForLater = function (placeName, event) {
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
    if (saved) advancedRecState.savedPlaces = new Set(JSON.parse(saved));
  } catch (err) {
    console.error('Error loading preferences:', err);
  }
}

/* ====================== UI HELPERS ====================== */
function showRecommendationsLoading() {
  const container = document.getElementById('recommendationsGrid');
  if (container) {
    container.innerHTML = `
      <div class="recommendations-loading">
        <div class="loading-spinner"></div>
        <p>AI is finding personalized recommendations...</p>
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
  return icons[String(category || '').toLowerCase()] || 'map-marker-alt';
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

function escapeAttr(text) {
  if (!text) return '';
  return String(text).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ====================== INIT ====================== */
async function initRecommendations(tripId, tripData) {
  recommendationsState.currentTripId = tripId;
  recommendationsState.tripData = tripData;

  renderAdvancedControls();   // ✅ ADD THIS LINE
  loadSavedPreferences();
  attachAdvancedListenersOnce();
  await loadRecommendations();
}

window.initRecommendations = initRecommendations;
window.loadRecommendations = loadRecommendations;
