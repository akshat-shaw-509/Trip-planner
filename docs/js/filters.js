// Handles smart filtering, re-ranking, and UI updates for recommendations

let filterState = {
  // Currently active filter values
  activeFilters: {
    categories: [],
    minRating: 0,
    maxDistance: 999,
    priceLevel: null
  },

  // Original recommendation list (never mutated)
  allRecommendations: [],

  // Results after filtering + re-ranking
  filteredResults: []
};

// ===================== Initialization =====================
function initFilters(recommendations) {
  filterState.allRecommendations = [...recommendations];
  filterState.filteredResults = [...recommendations];

  renderFilterUI();
  attachFilterListeners();
  updateFilteredRecommendations();
}

// ===================== UI Rendering =====================
function renderFilterUI() {
  const container = document.getElementById('recommendationsGrid');
  if (!container) return;

  const html = `
    <div class="smart-filters-container">
      <div class="filters-header">
        <h3>
          <i class="fas fa-filter"></i>
          Smart Filters
          <span class="active-filters-badge" id="activeFilterCount" style="display:none">0</span>
        </h3>
        <button class="filter-reset-btn" id="filterResetBtn" style="display:none">
          <i class="fas fa-redo"></i> Reset
        </button>
      </div>

      <div class="filter-chips-grid">
        <div class="filter-chip" data-filter="rating" data-value="4">
          <i class="fas fa-star"></i> Highly Rated (4+)
        </div>
        <div class="filter-chip" data-filter="distance" data-value="2">
          <i class="fas fa-map-marker-alt"></i> Within 2km
        </div>
        <div class="filter-chip" data-filter="distance" data-value="5">
          <i class="fas fa-walking"></i> Within 5km
        </div>
        <div class="filter-chip" data-filter="category" data-value="restaurant">
          <i class="fas fa-utensils"></i> Restaurants
        </div>
        <div class="filter-chip" data-filter="category" data-value="attraction">
          <i class="fas fa-landmark"></i> Attractions
        </div>
        <div class="filter-chip" data-filter="category" data-value="accommodation">
          <i class="fas fa-bed"></i> Hotels
        </div>
        <div class="filter-chip" data-filter="price" data-value="1">
          <i class="fas fa-dollar-sign"></i> Budget
        </div>
        <div class="filter-chip" data-filter="price" data-value="3">
          <i class="fas fa-dollar-sign"></i> Mid-range
        </div>
      </div>

      <div class="filter-results-count">
        <i class="fas fa-info-circle"></i>
        Showing <strong id="filterCount">${filterState.allRecommendations.length}</strong> places
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforebegin', html);
}

// ===================== Event Listeners =====================
function attachFilterListeners() {
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => handleFilterToggle(chip));
  });

  document
    .getElementById('filterResetBtn')
    ?.addEventListener('click', resetAllFilters);
}

// ===================== Filter Handling =====================
function handleFilterToggle(chip) {
  const type = chip.dataset.filter;
  const value = chip.dataset.value;

  chip.classList.toggle('active');

  switch (type) {
    case 'category':
      toggleArrayValue(filterState.activeFilters.categories, value);
      break;

    case 'rating':
      filterState.activeFilters.minRating = chip.classList.contains('active')
        ? parseFloat(value)
        : 0;
      break;

    case 'distance':
      filterState.activeFilters.maxDistance = chip.classList.contains('active')
        ? parseFloat(value)
        : 999;

      // Only allow one distance chip at a time
      if (chip.classList.contains('active')) {
        deactivateOtherChips('distance', chip);
      }
      break;

    case 'price':
      filterState.activeFilters.priceLevel = chip.classList.contains('active')
        ? parseInt(value)
        : null;

      // Only allow one price chip at a time
      if (chip.classList.contains('active')) {
        deactivateOtherChips('price', chip);
      }
      break;
  }

  updateFilteredRecommendations();
  updateFilterUI();
}

// Toggle value inside array-based filters
function toggleArrayValue(arr, value) {
  const index = arr.indexOf(value);
  index > -1 ? arr.splice(index, 1) : arr.push(value);
}

// Deactivate conflicting chips
function deactivateOtherChips(type, activeChip) {
  document.querySelectorAll(`.filter-chip[data-filter="${type}"]`).forEach(chip => {
    if (chip !== activeChip) chip.classList.remove('active');
  });
}

// ===================== Filtering + Ranking =====================
function updateFilteredRecommendations() {
  let results = filterState.allRecommendations.filter(rec => {
    // Category filter
    if (
      filterState.activeFilters.categories.length &&
      !filterState.activeFilters.categories.includes(rec.category)
    ) {
      return false;
    }

    // Rating filter
    if (rec.rating < filterState.activeFilters.minRating) return false;

    // Distance filter
    if (rec.distanceFromCenter > filterState.activeFilters.maxDistance) return false;

    // Price filter (allow +-1 tolerance)
    if (filterState.activeFilters.priceLevel !== null) {
      const diff = Math.abs((rec.priceLevel || 2) - filterState.activeFilters.priceLevel);
      if (diff > 1) return false;
    }

    return true;
  });

  // Apply score bonuses for better ranking
  results = results.map(rec => {
    let bonus = 0;

    if (filterState.activeFilters.categories.includes(rec.category)) bonus += 2;
    if (filterState.activeFilters.minRating && rec.rating >= 4.5) bonus += 1;
    if (filterState.activeFilters.maxDistance < 999 && rec.distanceFromCenter < 1)
      bonus += 1.5;

    return {
      ...rec,
      adjustedScore: rec.recommendationScore + bonus
    };
  });

  results.sort((a, b) => b.adjustedScore - a.adjustedScore);

  filterState.filteredResults = results;
  displayFilteredRecommendations();
}

// ===================== Rendering Results =====================
function displayFilteredRecommendations() {
  const container = document.getElementById('recommendationsGrid');
  if (!container) return;

  if (!filterState.filteredResults.length) {
    container.innerHTML = `
      <div class="recommendations-empty">
        <i class="fas fa-filter"></i>
        <h3>No matches found</h3>
        <p>Try adjusting your filters</p>
        <button class="btn-primary" onclick="resetAllFilters()">
          <i class="fas fa-redo"></i> Reset Filters
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = filterState.filteredResults
    .map(rec => createRecommendationCard(rec))
    .join('');

  // Rebind card actions
  filterState.filteredResults.forEach((rec, i) => {
    const card = container.children[i];
    card.querySelector('.btn-add-to-trip')?.onclick = () =>
      addRecommendationToTrip(rec);

    card.querySelector('.btn-view-details')?.onclick = () =>
      showRecommendationDetails(rec);

    card.querySelector('.rec-card-compare-checkbox')?.addEventListener('click', e => {
      e.stopPropagation();
      toggleCompareSelection(rec, card);
    });
  });
}

// ===================== UI Updates =====================
function updateFilterUI() {
  const count = countActiveFilters();

  const badge = document.getElementById('activeFilterCount');
  const resetBtn = document.getElementById('filterResetBtn');
  const countEl = document.getElementById('filterCount');

  if (badge) {
    badge.textContent = count;
    badge.style.display = count ? 'inline-flex' : 'none';
  }

  if (resetBtn) {
    resetBtn.style.display = count ? 'block' : 'none';
  }

  if (countEl) {
    countEl.textContent = filterState.filteredResults.length;
  }
}

// Count how many filters are currently active
function countActiveFilters() {
  let count = filterState.activeFilters.categories.length;
  if (filterState.activeFilters.minRating) count++;
  if (filterState.activeFilters.maxDistance < 999) count++;
  if (filterState.activeFilters.priceLevel !== null) count++;
  return count;
}

// ===================== Reset =====================
function resetAllFilters() {
  filterState.activeFilters = {
    categories: [],
    minRating: 0,
    maxDistance: 999,
    priceLevel: null
  };

  document.querySelectorAll('.filter-chip.active').forEach(chip => {
    chip.classList.remove('active');
  });

  updateFilteredRecommendations();
  updateFilterUI();
  showToast('Filters reset', 'info');
}

// ===================== External Access =====================
function getFilteredRecommendations() {
  return filterState.filteredResults;
}