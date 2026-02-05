// ==================== STATE MANAGEMENT ====================
window.recommendationState = {
  currentFilters: {
    category: 'all',
    minRating: 3.5,
    radius: 10,
    sortBy: 'bestMatch',
    hiddenGems: false,
    topRated: false,
    minPrice: null,
    maxPrice: null
  },
  isLoading: false,
  recommendations: [],
  centerLocation: null,
  tripId: null,
  tripData: null
};

/**
 * Main initialization function called from places.js
 * This is the entry point
 */
window.initRecommendations = async function(tripId, tripData) {
  console.log('Initializing recommendations for trip:', tripId);
  
  window.recommendationState.tripId = tripId;
  window.recommendationState.tripData = tripData;
  
  initRecommendationControls();
  await loadRecommendations();
  
  console.log('Recommendations initialized successfully');
};

/**
 * Initialize recommendation control UI
 */
function initRecommendationControls() {
  const section = document.querySelector('.recommendations-section');
  if (!section) {
    console.warn('Recommendations section not found');
    return;
  }

  const controlsHTML = `
    <div class="recommendation-controls">
      <!-- Category Filters -->
      <div class="filter-group">
        <label><i class="fas fa-filter"></i> Category</label>
        <div class="category-filters">
          <button class="filter-btn active" data-category="all">
            <i class="fas fa-th"></i> All
          </button>
          <button class="filter-btn" data-category="restaurant">
            <i class="fas fa-utensils"></i> Restaurants
          </button>
          <button class="filter-btn" data-category="attraction">
            <i class="fas fa-landmark"></i> Attractions
          </button>
          <button class="filter-btn" data-category="accommodation">
            <i class="fas fa-bed"></i> Hotels
          </button>
        </div>
      </div>

      <!-- Advanced Filters -->
      <div class="filter-group">
        <label><i class="fas fa-sliders-h"></i> Filters</label>
        <div class="advanced-filters">
          <!-- Rating Slider -->
          <div class="filter-item">
            <label for="ratingFilter">
              Min Rating: <span id="ratingValue">3.5</span>★
            </label>
            <input 
              type="range" 
              id="ratingFilter" 
              min="0" 
              max="5" 
              step="0.5" 
              value="3.5"
              class="slider"
            >
          </div>

          <!-- Radius Slider -->
          <div class="filter-item">
            <label for="radiusFilter">
              Search Radius: <span id="radiusValue">10</span> km
            </label>
            <input 
              type="range" 
              id="radiusFilter" 
              min="1" 
              max="50" 
              step="1" 
              value="10"
              class="slider"
            >
          </div>

          <!-- Price Range -->
          <div class="filter-item">
            <label>Price Range</label>
            <div class="price-range-group">
              <select id="minPriceFilter" class="price-select">
                <option value="">Any Min</option>
                <option value="1">$ Budget</option>
                <option value="2">$$ Moderate</option>
                <option value="3">$$$ Expensive</option>
                <option value="4">$$$$ Luxury</option>
              </select>
              <span>to</span>
              <select id="maxPriceFilter" class="price-select">
                <option value="">Any Max</option>
                <option value="2">$$ Moderate</option>
                <option value="3">$$$ Expensive</option>
                <option value="4">$$$$ Luxury</option>
                <option value="5">$$$$$ Ultra</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Sort Options -->
      <div class="filter-group">
        <label><i class="fas fa-sort"></i> Sort By</label>
        <div class="sort-buttons">
          <button class="sort-btn active" data-sort="bestMatch">
            <i class="fas fa-star"></i> Best Match
          </button>
          <button class="sort-btn" data-sort="rating">
            <i class="fas fa-chart-line"></i> Highest Rated
          </button>
          <button class="sort-btn" data-sort="distance">
            <i class="fas fa-map-marker-alt"></i> Nearest
          </button>
        </div>
      </div>

      <!-- Quick Filters -->
      <div class="filter-group">
        <label><i class="fas fa-bolt"></i> Quick Filters</label>
        <div class="quick-filters">
          <button class="quick-filter-btn" data-filter="hiddenGems">
            <i class="fas fa-gem"></i> Hidden Gems
          </button>
          <button class="quick-filter-btn" data-filter="topRated">
            <i class="fas fa-award"></i> Top Rated Only
          </button>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="filter-actions">
        <button class="btn-reset-filters" onclick="resetFilters()">
          <i class="fas fa-redo"></i> Reset
        </button>
        <button class="btn-apply-filters" onclick="applyFilters()">
          <i class="fas fa-search"></i> Apply Filters
        </button>
      </div>

      <!-- Active Filters Display -->
      <div class="active-filters" id="activeFilters" style="display: none;">
        <span class="active-filters-label">Active Filters:</span>
        <div class="active-filters-list" id="activeFiltersList"></div>
      </div>
    </div>
  `;

  // Insert controls after section header
  const sectionHeader = section.querySelector('.section-header');
  if (sectionHeader) {
    sectionHeader.insertAdjacentHTML('afterend', controlsHTML);
    attachFilterListeners();
  }
}

/**
 * Attach event listeners to filter controls
 */
function attachFilterListeners() {
  // Category filters
  document.querySelectorAll('.category-filters .filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.category-filters .filter-btn').forEach(b => 
        b.classList.remove('active')
      );
      this.classList.add('active');
      window.recommendationState.currentFilters.category = this.dataset.category;
      applyFilters();
    });
  });

  // Rating slider
  const ratingSlider = document.getElementById('ratingFilter');
  const ratingValue = document.getElementById('ratingValue');
  if (ratingSlider) {
    ratingSlider.addEventListener('input', function() {
      ratingValue.textContent = this.value;
      window.recommendationState.currentFilters.minRating = parseFloat(this.value);
    });
  }

  // Radius slider
  const radiusSlider = document.getElementById('radiusFilter');
  const radiusValue = document.getElementById('radiusValue');
  if (radiusSlider) {
    radiusSlider.addEventListener('input', function() {
      radiusValue.textContent = this.value;
      window.recommendationState.currentFilters.radius = parseInt(this.value);
    });
  }

  // Price filters
  const minPriceFilter = document.getElementById('minPriceFilter');
  const maxPriceFilter = document.getElementById('maxPriceFilter');
  if (minPriceFilter) {
    minPriceFilter.addEventListener('change', function() {
      window.recommendationState.currentFilters.minPrice = this.value || null;
    });
  }
  if (maxPriceFilter) {
    maxPriceFilter.addEventListener('change', function() {
      window.recommendationState.currentFilters.maxPrice = this.value || null;
    });
  }

  // Sort buttons
  document.querySelectorAll('.sort-buttons .sort-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.sort-buttons .sort-btn').forEach(b => 
        b.classList.remove('active')
      );
      this.classList.add('active');
      window.recommendationState.currentFilters.sortBy = this.dataset.sort;
      applyFilters();
    });
  });

  // Quick filters
  document.querySelectorAll('.quick-filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      this.classList.toggle('active');
      const filter = this.dataset.filter;
      window.recommendationState.currentFilters[filter] = this.classList.contains('active');
      applyFilters();
    });
  });
}

/**
 * Load recommendations with current filters
 */
async function loadRecommendations() {
  const tripId = window.recommendationState.tripId;
  
  if (!tripId) {
    console.error('No trip ID available in recommendation state');
    showErrorState('No trip ID found');
    return;
  }

  const grid = document.getElementById('recommendationsGrid');
  if (!grid) {
    console.warn('Recommendations grid not found');
    return;
  }

  // Show loading state
  window.recommendationState.isLoading = true;
  grid.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Finding the best recommendations for you...</p>
    </div>
  `;

  try {
    const filters = window.recommendationState.currentFilters;
    
    // Build query parameters
    const params = {
      limit: 50,
      radius: filters.radius,
      category: filters.category,
      minRating: filters.minRating,
      sortBy: filters.sortBy,
      hiddenGems: filters.hiddenGems,
      topRated: filters.topRated
    };

    // Add price range if specified
    if (filters.minPrice) params.minPrice = filters.minPrice;
    if (filters.maxPrice) params.maxPrice = filters.maxPrice;

    console.log('Fetching recommendations with params:', params);

    const response = await apiService.recommendations.getForTrip(tripId, params);

    window.recommendationState.recommendations = response.data.places || [];
    window.recommendationState.centerLocation = response.data.centerLocation;

    displayRecommendations(response.data.places || []);
    updateActiveFiltersDisplay(response.data.appliedFilters || {});

    if (typeof showToast === 'function') {
      showToast(response.message || 'Recommendations loaded', 'success');
    }

  } catch (error) {
    console.error('Failed to load recommendations:', error);
    grid.innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-circle"></i>
        <h3>Failed to Load Recommendations</h3>
        <p>${error.message || 'Unknown error'}</p>
        <button class="btn-retry" onclick="loadRecommendations()">
          <i class="fas fa-redo"></i> Try Again
        </button>
      </div>
    `;
    
    if (typeof showToast === 'function') {
      showToast('Failed to load recommendations', 'error');
    }
  } finally {
    window.recommendationState.isLoading = false;
  }
}

/**
 * Display recommendations in grid
 */
function displayRecommendations(places) {
  const grid = document.getElementById('recommendationsGrid');
  if (!grid) return;

  if (places.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-search"></i>
        <h3>No Recommendations Found</h3>
        <p>Try adjusting your filters to see more results</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = places.map(place => createRecommendationCard(place)).join('');
}

/**
 * Create recommendation card HTML
 */
function createRecommendationCard(place) {
  const categoryIcon = getCategoryIcon(place.category);
  const priceDisplay = '$'.repeat(place.priceLevel || 1);
  
  return `
    <div class="recommendation-card" data-name="${escapeHtml(place.name)}">
      <div class="rec-card-header">
        <div class="rec-card-category">
          <i class="fas fa-${categoryIcon}"></i>
          ${place.category}
        </div>
        ${place.isHiddenGem ? '<span class="badge-hidden-gem"><i class="fas fa-gem"></i> Hidden Gem</span>' : ''}
        <button class="rec-card-compare" onclick="handleCompareClick(event, this)">
          <i class="far fa-square"></i>
          <i class="fas fa-check-square" style="display: none;"></i>
        </button>
      </div>

      <h3 class="rec-card-title">${escapeHtml(place.name)}</h3>
      
      <div class="rec-card-meta">
        <div class="rec-meta-item">
          <i class="fas fa-star"></i>
          <span>${(place.rating || 0).toFixed(1)}</span>
        </div>
        ${place.distanceFromCenter ? `
          <div class="rec-meta-item">
            <i class="fas fa-map-marker-alt"></i>
            <span>${place.distanceFromCenter.toFixed(1)} km</span>
          </div>
        ` : ''}
        <div class="rec-meta-item">
          <i class="fas fa-dollar-sign"></i>
          <span>${priceDisplay}</span>
        </div>
        ${place.recommendationScore ? `
          <div class="rec-meta-item rec-score">
            <i class="fas fa-chart-line"></i>
            <span>${place.recommendationScore.toFixed(1)}</span>
          </div>
        ` : ''}
      </div>

      <p class="rec-card-description">${escapeHtml(place.description || 'No description available')}</p>

      ${place.address ? `
        <div class="rec-card-address">
          <i class="fas fa-map-pin"></i>
          ${escapeHtml(place.address)}
        </div>
      ` : ''}

      ${place.cuisine ? `
        <div class="rec-card-cuisine">
          <i class="fas fa-utensils"></i>
          Cuisine: ${escapeHtml(place.cuisine)}
        </div>
      ` : ''}

      ${place.bestTimeToVisit ? `
        <div class="rec-card-best-time">
          <i class="fas fa-clock"></i>
          Best time: ${escapeHtml(place.bestTimeToVisit)}
        </div>
      ` : ''}

      <div class="rec-card-actions">
        <button class="btn-add-to-trip" onclick="addRecommendationToTrip(${JSON.stringify(place).replace(/"/g, '&quot;')})">
          <i class="fas fa-plus"></i> Add to Trip
        </button>
        <button class="btn-view-details" onclick="showRecommendationDetails(${JSON.stringify(place).replace(/"/g, '&quot;')})">
          <i class="fas fa-info-circle"></i> Details
        </button>
      </div>
    </div>
  `;
}

/**
 * Apply current filters and reload recommendations
 */
window.applyFilters = function() {
  loadRecommendations();
};

/**
 * Reset all filters to default
 */
window.resetFilters = function() {
  // Reset state
  window.recommendationState.currentFilters = {
    category: 'all',
    minRating: 3.5,
    radius: 10,
    sortBy: 'bestMatch',
    hiddenGems: false,
    topRated: false,
    minPrice: null,
    maxPrice: null
  };

  // Reset UI
  const ratingFilter = document.getElementById('ratingFilter');
  const radiusFilter = document.getElementById('radiusFilter');
  const minPriceFilter = document.getElementById('minPriceFilter');
  const maxPriceFilter = document.getElementById('maxPriceFilter');
  
  if (ratingFilter) {
    ratingFilter.value = 3.5;
    document.getElementById('ratingValue').textContent = '3.5';
  }
  if (radiusFilter) {
    radiusFilter.value = 10;
    document.getElementById('radiusValue').textContent = '10';
  }
  if (minPriceFilter) minPriceFilter.value = '';
  if (maxPriceFilter) maxPriceFilter.value = '';

  // Reset button states
  document.querySelectorAll('.category-filters .filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.category === 'all');
  });
  document.querySelectorAll('.sort-buttons .sort-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sort === 'bestMatch');
  });
  document.querySelectorAll('.quick-filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // Reload
  applyFilters();
};

/**
 * Update active filters display
 */
function updateActiveFiltersDisplay(appliedFilters) {
  const container = document.getElementById('activeFilters');
  const list = document.getElementById('activeFiltersList');
  
  if (!container || !list) return;

  const filters = [];

  if (appliedFilters.category && appliedFilters.category !== 'all') {
    filters.push(`Category: ${appliedFilters.category}`);
  }
  if (appliedFilters.minRating && appliedFilters.minRating > 3.5) {
    filters.push(`Min Rating: ${appliedFilters.minRating}★`);
  }
  if (appliedFilters.maxRadius && appliedFilters.maxRadius !== 10) {
    filters.push(`Radius: ${appliedFilters.maxRadius} km`);
  }
  if (appliedFilters.sortBy && appliedFilters.sortBy !== 'bestMatch') {
    filters.push(`Sort: ${appliedFilters.sortBy}`);
  }
  if (appliedFilters.hiddenGems) {
    filters.push('Hidden Gems');
  }
  if (appliedFilters.topRatedOnly) {
    filters.push('Top Rated Only');
  }
  if (appliedFilters.priceRange) {
    filters.push(`Price: ${'$'.repeat(appliedFilters.priceRange.min || 1)}-${'$'.repeat(appliedFilters.priceRange.max || 5)}`);
  }

  if (filters.length > 0) {
    list.innerHTML = filters.map(f => `<span class="filter-tag">${f}</span>`).join('');
    container.style.display = 'block';
  } else {
    container.style.display = 'none';
  }
}

/**
 * Handle compare checkbox click
 */
window.handleCompareClick = function(event, button) {
  event.stopPropagation();
  const card = button.closest('.recommendation-card');
  const placeName = card.dataset.name;
  const place = window.recommendationState.recommendations.find(p => p.name === placeName);
  
  if (place && typeof window.handleCompareCheckboxClick === 'function') {
    window.handleCompareCheckboxClick(place, card);
  }
};

/**
 * Add recommendation to trip
 */
window.addRecommendationToTrip = async function(place) {
  const tripId = window.recommendationState.tripId;
  
  if (!tripId) {
    console.error('No trip ID available');
    if (typeof showToast === 'function') {
      showToast('Trip ID not found', 'error');
    }
    return;
  }

  try {
    await apiService.places.create(tripId, {
      name: place.name,
      category: place.category,
      description: place.description,
      address: place.address,
      location: place.location,
      rating: place.rating,
      priceLevel: place.priceLevel,
      source: 'ai',
      visitStatus: 'planned'
    });

    if (typeof showToast === 'function') {
      showToast(`Added ${place.name} to your trip!`, 'success');
    }

    // Refresh places list if available (from places.js)
    if (typeof loadPlaces === 'function') {
      loadPlaces();
    }
  } catch (error) {
    console.error('Failed to add place:', error);
    if (typeof showToast === 'function') {
      showToast('Failed to add place', 'error');
    }
  }
};

/**
 * Show recommendation details modal
 */
window.showRecommendationDetails = function(place) {
  const details = `
${place.name}

Category: ${place.category}
Rating: ${place.rating} / 5.0
${place.priceLevel ? `Price Level: ${'$'.repeat(place.priceLevel)}` : ''}
${place.distanceFromCenter ? `Distance: ${place.distanceFromCenter.toFixed(1)} km from center` : ''}

${place.description || 'No description available'}

${place.address ? `Address: ${place.address}` : ''}
${place.cuisine ? `Cuisine: ${place.cuisine}` : ''}
${place.bestTimeToVisit ? `Best Time: ${place.bestTimeToVisit}` : ''}
  `.trim();
  
  alert(details);
};

// ==================== HELPER FUNCTIONS ====================

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

function showErrorState(message) {
  const grid = document.getElementById('recommendationsGrid');
  if (grid) {
    grid.innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-circle"></i>
        <h3>Error</h3>
        <p>${message}</p>
      </div>
    `;
  }
}

console.log('Advanced recommendations module loaded');
