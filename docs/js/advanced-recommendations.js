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
  selectedForBulk: new Set()
};

// Shared filter state
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

// Shared recommendations state
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

//Advanced filters
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

let listenersAttached = false;

function attachAdvancedListenersOnce() {
  if (listenersAttached) return;
  listenersAttached = true;

  document.addEventListener('click', (e) => {
    const catBtn = e.target.closest('.category-btn');
    if (catBtn) {
      document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
      catBtn.classList.add('active');
      const category = catBtn.dataset.category;
      filterState.activeFilters.categories = category === 'all' ? [] : [category];
      applyQuickFilters();
    }

    const sortBtn = e.target.closest('.sort-btn');
    if (sortBtn) {
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
      sortBtn.classList.add('active');
      advancedRecState.options.sortBy = sortBtn.dataset.sort;
      applySorting();
    }

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

// Recommendations
function displayRecommendations() {
  const container = document.getElementById('recommendationsGrid');
  if (!container) return;

  const recs = filterState.filteredResults;

  if (!recs || recs.length === 0) {
    container.innerHTML = `
      <div class="recommendations-empty">
        <i class="fas fa-lightbulb"></i>
        <h3>No recommendations match your filters</h3>
        <p>Try adjusting your filters or search radius</p>
        <button class="btn-primary" onclick="resetFilters()">
          <i class="fas fa-redo"></i> Reset Filters
        </button>
      </div>
    `;
    recommendationsState.isLoading = false;
    return;
  }

  container.innerHTML = recs.map((rec, index) => {
    const icon = getCategoryIcon(rec.category);
    const rating = rec.rating || 0;
    const distance = rec.distanceFromCenter ? `${rec.distanceFromCenter.toFixed(1)} km away` : '';
    
    return `
      <div class="recommendation-card" data-name="${escapeAttr(rec.name)}" data-index="${index}">
        <div class="rec-card-header">
          <div class="rec-card-icon">
            <i class="fas fa-${icon}"></i>
          </div>
          <div class="rec-card-compare-checkbox" onclick="handleCompareCheckboxClick(${JSON.stringify(rec).replace(/"/g, '&quot;')}, this.closest('.recommendation-card'))">
            <i class="fas fa-check" style="display: none;"></i>
          </div>
        </div>

        <div class="rec-card-body">
          <h4 class="rec-card-title">${escapeHtml(rec.name)}</h4>
          
          <div class="rec-card-meta">
            <span class="rec-category">
              <i class="fas fa-tag"></i>
              ${escapeHtml(rec.category)}
            </span>
            ${rating > 0 ? `
              <span class="rec-rating">
                <i class="fas fa-star"></i>
                ${rating.toFixed(1)}
              </span>
            ` : ''}
          </div>

          ${distance ? `
            <div class="rec-card-distance">
              <i class="fas fa-map-marker-alt"></i>
              ${distance}
            </div>
          ` : ''}

          ${rec.description ? `
            <p class="rec-card-description">${escapeHtml(rec.description.substring(0, 120))}${rec.description.length > 120 ? '...' : ''}</p>
          ` : ''}

          ${rec.address ? `
            <p class="rec-card-address">
              <i class="fas fa-location-dot"></i>
              ${escapeHtml(rec.address)}
            </p>
          ` : ''}
        </div>

        <div class="rec-card-footer">
          <button class="btn-view-details" onclick="showRecommendationDetails(${JSON.stringify(rec).replace(/"/g, '&quot;')})">
            <i class="fas fa-info-circle"></i>
            Details
          </button>
          <button class="btn-add-to-trip" onclick="addRecommendationToTrip(${JSON.stringify(rec).replace(/"/g, '&quot;')})">
            <i class="fas fa-plus"></i>
            Add to Trip
          </button>
        </div>
      </div>
    `;
  }).join('');

  recommendationsState.isLoading = false;
  addQualityBadges();
  
  if (typeof updateMapWithRecommendations === 'function') {
    updateMapWithRecommendations();
  }
}

// Load Recommendations
async function loadRecommendations(options = {}) {
  try {
    recommendationsState.isLoading = true;
    showRecommendationsLoading();
    const opts = { ...advancedRecState.options, ...options };
    const activeCategory = document.querySelector('.category-btn.active')?.dataset.category || 'all';

    const response = await apiService.recommendations.getForTrip(
      recommendationsState.currentTripId,
      {
        radius: opts.radius,
        minRating: opts.minRating,
        maxResults: opts.maxResults,
        category: activeCategory,
        sortBy: opts.sortBy,
        hiddenGems: opts.showHiddenGems,
        topRated: opts.topRatedOnly
      }
    );

    console.log('API Response:', response);

    let places = [];
    
    if (response.success && response.data) {
      if (Array.isArray(response.data.places)) {
        places = response.data.places;
      }
      else if (Array.isArray(response.data)) {
        places = response.data;
      }
    } 
    else if (response.data && Array.isArray(response.data)) {
      places = response.data;
    }
    else if (response.places && Array.isArray(response.places)) {
      places = response.places;
    }
    else if (Array.isArray(response)) {
      places = response;
    }

    if (!Array.isArray(places) || places.length === 0) {
      console.warn('No places found in response');
      filterState.allRecommendations = [];
      filterState.filteredResults = [];
      recommendationsState.recommendations = [];
      displayRecommendations();
      recommendationsState.isLoading = false;
      return;
    }

    const normalizedPlaces = places.map(place => {
      let lat = 0, lon = 0; 
      if (place.lat && place.lon) {
        lat = Number(place.lat);
        lon = Number(place.lon);
      } else if (place.location?.coordinates) {
        lon = Number(place.location.coordinates[0]);
        lat = Number(place.location.coordinates[1]);
      } else if (place.location?.lat && place.location?.lon) {
        lat = Number(place.location.lat);
        lon = Number(place.location.lon);
      }

      return {
        name: place.name || 'Unnamed',
        category: place.category || 'other',
        lat: lat,
        lon: lon,
        rating: Number(place.rating) || 0,
        priceLevel: Number(place.priceLevel) || 0,
        description: place.description || '',
        address: place.address || '',
        distanceFromCenter: Number(place.distanceFromCenter) || 0,
        recommendationScore: Number(place.recommendationScore) || 0,
        location: place.location || { type: 'Point', coordinates: [lon, lat] }
      };
    });

    filterState.allRecommendations = normalizedPlaces;
    filterState.filteredResults = [...normalizedPlaces];
    recommendationsState.recommendations = normalizedPlaces;
    
    applyQuickFilters();

    recommendationsState.isLoading = false;

    if (typeof window.updateMapWithRecommendations === 'function') {
      window.updateMapWithRecommendations();
    }

  } catch (err) {
    console.error('Error loading recommendations:', err);
    showRecommendationsError();
    recommendationsState.isLoading = false;
  }
}
window.loadRecommendations = loadRecommendations;

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

  if (filterState.activeFilters.categories.length > 0) {
    filtered = filtered.filter(r => 
      filterState.activeFilters.categories.includes(r.category?.toLowerCase())
    );
  }

  if (opts.minRating > 0) {
    filtered = filtered.filter(r => (r.rating || 0) >= opts.minRating);
  }

  if (opts.showHiddenGems) {
    filtered = filtered.filter(r => (r.rating || 0) >= 4.0 && (r.distanceFromCenter || 0) > 3);
  }

  if (opts.topRatedOnly) {
    filtered = filtered.filter(r => (r.rating || 0) >= 4.5);
  }

  filterState.filteredResults = filtered;
  applySorting();
}

function addQualityBadges() {
  const cards = document.querySelectorAll('.recommendation-card');

  cards.forEach((card, index) => {
    const rec = filterState.filteredResults[index];
    if (!rec) return;

    card.querySelectorAll('.quality-badge').forEach(b => b.remove());

    let badge = null;
    if ((rec.rating || 0) >= 4.7) {
      badge = '<div class="quality-badge top-rated"><i class="fas fa-crown"></i> Top Rated</div>';
    } else if ((rec.rating || 0) >= 4.0 && (rec.distanceFromCenter || 0) > 5) {
      badge = '<div class="quality-badge hidden-gem"><i class="fas fa-gem"></i> Hidden Gem</div>';
    }

    if (badge) card.insertAdjacentHTML('afterbegin', badge);
  });
}

// Add To Trip
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
    showToast('Place added to your trip!', 'success');
    
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

// Details Modal
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

async function initRecommendations(tripId, tripData) {
  recommendationsState.currentTripId = tripId;
  recommendationsState.tripData = tripData;

  renderAdvancedControls();   
  attachAdvancedListenersOnce();
  await loadRecommendations();
}

window.initRecommendations = initRecommendations;
window.loadRecommendations = loadRecommendations;
