// js/filters.js - Smart Filter & Re-rank Logic

let filterState = {
  activeFilters: {
    categories: [],
    minRating: 0,
    maxDistance: 999,
    priceLevel: null
  },
  allRecommendations: [],
  filteredResults: []
};

/**
 * Initialize filter system
 */
function initFilters(recommendations) {
  filterState.allRecommendations = [...recommendations];
  filterState.filteredResults = [...recommendations];
  
  renderFilterUI();
  attachFilterListeners();
  updateFilteredRecommendations();
}

/**
 * Render filter UI
 */
function renderFilterUI() {
  const container = document.getElementById('recommendationsGrid');
  if (!container) return;

  const filtersHTML = `
    <div class="smart-filters-container">
      <div class="filters-header">
        <h3>
          <i class="fas fa-filter"></i>
          Smart Filters
          <span class="active-filters-badge" id="activeFilterCount" style="display: none;">0</span>
        </h3>
        <button class="filter-reset-btn" id="filterResetBtn" style="display: none;">
          <i class="fas fa-redo"></i> Reset
        </button>
      </div>

      <div class="filter-chips-grid">
        <div class="filter-chip" data-filter="rating" data-value="4.0">
          <i class="fas fa-star"></i>
          Highly Rated (4+)
        </div>
        <div class="filter-chip" data-filter="distance" data-value="2">
          <i class="fas fa-map-marker-alt"></i>
          Within 2km
        </div>
        <div class="filter-chip" data-filter="distance" data-value="5">
          <i class="fas fa-walking"></i>
          Within 5km
        </div>
        <div class="filter-chip" data-filter="category" data-value="restaurant">
          <i class="fas fa-utensils"></i>
          Restaurants
        </div>
        <div class="filter-chip" data-filter="category" data-value="attraction">
          <i class="fas fa-landmark"></i>
          Attractions
        </div>
        <div class="filter-chip" data-filter="category" data-value="accommodation">
          <i class="fas fa-bed"></i>
          Hotels
        </div>
        <div class="filter-chip" data-filter="price" data-value="1">
          <i class="fas fa-dollar-sign"></i>
          Budget
        </div>
        <div class="filter-chip" data-filter="price" data-value="3">
          <i class="fas fa-dollar-sign"></i>
          Mid-range
        </div>
      </div>

      <div class="filter-results-count" id="filterResultsCount">
        <i class="fas fa-info-circle"></i>
        Showing <strong id="filterCount">${filterState.allRecommendations.length}</strong> places
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforebegin', filtersHTML);
}

/**
 * Attach event listeners to filter chips
 */
function attachFilterListeners() {
  const chips = document.querySelectorAll('.filter-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => handleFilterToggle(chip));
  });

  const resetBtn = document.getElementById('filterResetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetAllFilters);
  }
}

/**
 * Handle filter chip toggle
 */
function handleFilterToggle(chip) {
  const filterType = chip.dataset.filter;
  const filterValue = chip.dataset.value;
  
  chip.classList.toggle('active');
  
  // Update filter state
  switch (filterType) {
    case 'category':
      toggleArrayFilter(filterState.activeFilters.categories, filterValue);
      break;
    case 'rating':
      filterState.activeFilters.minRating = chip.classList.contains('active') 
        ? parseFloat(filterValue) 
        : 0;
      break;
    case 'distance':
      filterState.activeFilters.maxDistance = chip.classList.contains('active') 
        ? parseFloat(filterValue) 
        : 999;
      // Deactivate other distance chips
      if (chip.classList.contains('active')) {
        document.querySelectorAll('.filter-chip[data-filter="distance"]').forEach(c => {
          if (c !== chip) c.classList.remove('active');
        });
      }
      break;
    case 'price':
      filterState.activeFilters.priceLevel = chip.classList.contains('active') 
        ? parseInt(filterValue) 
        : null;
      // Deactivate other price chips
      if (chip.classList.contains('active')) {
        document.querySelectorAll('.filter-chip[data-filter="price"]').forEach(c => {
          if (c !== chip) c.classList.remove('active');
        });
      }
      break;
  }
  
  updateFilteredRecommendations();
  updateFilterUI();
}

/**
 * Toggle value in array filter
 */
function toggleArrayFilter(array, value) {
  const index = array.indexOf(value);
  if (index > -1) {
    array.splice(index, 1);
  } else {
    array.push(value);
  }
}

/**
 * Apply filters and re-score recommendations
 */
function updateFilteredRecommendations() {
  let filtered = filterState.allRecommendations.filter(rec => {
    // Category filter
    if (filterState.activeFilters.categories.length > 0) {
      if (!filterState.activeFilters.categories.includes(rec.category)) {
        return false;
      }
    }
    
    // Rating filter
    if (rec.rating < filterState.activeFilters.minRating) {
      return false;
    }
    
    // Distance filter
    if (rec.distanceFromCenter > filterState.activeFilters.maxDistance) {
      return false;
    }
    
    // Price filter
    if (filterState.activeFilters.priceLevel !== null) {
      const priceDiff = Math.abs((rec.priceLevel || 2) - filterState.activeFilters.priceLevel);
      if (priceDiff > 1) {
        return false;
      }
    }
    
    return true;
  });
  
  // Re-score filtered results based on active filters
  filtered = filtered.map(rec => {
    let bonusScore = 0;
    
    // Bonus for matching category preference
    if (filterState.activeFilters.categories.includes(rec.category)) {
      bonusScore += 2;
    }
    
    // Bonus for high rating when rating filter active
    if (filterState.activeFilters.minRating > 0 && rec.rating >= 4.5) {
      bonusScore += 1;
    }
    
    // Bonus for proximity when distance filter active
    if (filterState.activeFilters.maxDistance < 999 && rec.distanceFromCenter < 1) {
      bonusScore += 1.5;
    }
    
    return {
      ...rec,
      adjustedScore: rec.recommendationScore + bonusScore
    };
  });
  
  // Sort by adjusted score
  filtered.sort((a, b) => b.adjustedScore - a.adjustedScore);
  
  filterState.filteredResults = filtered;
  displayFilteredRecommendations();
}

/**
 * Display filtered recommendations
 */
function displayFilteredRecommendations() {
  const container = document.getElementById('recommendationsGrid');
  if (!container) return;
  
  const recs = filterState.filteredResults;
  
  if (recs.length === 0) {
    container.innerHTML = `
      <div class="recommendations-empty">
        <i class="fas fa-filter"></i>
        <h3>No matches found</h3>
        <p>Try adjusting your filters to see more results</p>
        <button class="btn-primary" onclick="resetAllFilters()" style="margin-top: 16px;">
          <i class="fas fa-redo"></i> Reset Filters
        </button>
      </div>
    `;
    return;
  }
  
  container.innerHTML = recs.map(rec => createRecommendationCard(rec)).join('');
  
  // Reattach event listeners
  recs.forEach((rec, index) => {
    const card = container.children[index];
    const addBtn = card.querySelector('.btn-add-to-trip');
    const detailsBtn = card.querySelector('.btn-view-details');
    const compareCheckbox = card.querySelector('.rec-card-compare-checkbox');
    
    if (addBtn) {
      addBtn.onclick = () => addRecommendationToTrip(rec);
    }
    
    if (detailsBtn) {
      detailsBtn.onclick = () => showRecommendationDetails(rec);
    }
    
    if (compareCheckbox) {
      compareCheckbox.onclick = (e) => {
        e.stopPropagation();
        toggleCompareSelection(rec, card);
      };
    }
  });
}

/**
 * Update filter UI indicators
 */
function updateFilterUI() {
  const activeCount = countActiveFilters();
  const badge = document.getElementById('activeFilterCount');
  const resetBtn = document.getElementById('filterResetBtn');
  const countEl = document.getElementById('filterCount');
  
  if (badge) {
    if (activeCount > 0) {
      badge.textContent = activeCount;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  }
  
  if (resetBtn) {
    resetBtn.style.display = activeCount > 0 ? 'block' : 'none';
  }
  
  if (countEl) {
    countEl.textContent = filterState.filteredResults.length;
  }
}

/**
 * Count active filters
 */
function countActiveFilters() {
  let count = 0;
  count += filterState.activeFilters.categories.length;
  if (filterState.activeFilters.minRating > 0) count++;
  if (filterState.activeFilters.maxDistance < 999) count++;
  if (filterState.activeFilters.priceLevel !== null) count++;
  return count;
}

/**
 * Reset all filters
 */
function resetAllFilters() {
  filterState.activeFilters = {
    categories: [],
    minRating: 0,
    maxDistance: 999,
    priceLevel: null
  };
  
  // Remove active class from all chips
  document.querySelectorAll('.filter-chip.active').forEach(chip => {
    chip.classList.remove('active');
  });
  
  updateFilteredRecommendations();
  updateFilterUI();
  
  showToast('Filters reset', 'info');
}

/**
 * Get filtered recommendations (for other modules)
 */
function getFilteredRecommendations() {
  return filterState.filteredResults;
}