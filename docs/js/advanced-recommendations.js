<<<<<<< HEAD
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

  // Using Sets so we don’t accidentally save duplicates.
  // (Also easy to add/remove without worrying about index.)
  savedPlaces: new Set(),
  selectedForBulk: new Set()
};

/**
 * Initialize advanced recommendation controls
 * This gets everything started - builds UI, adds click handlers, loads saved stuff
 * Made it simple so it doesn't break when navigating between pages
 */

function initAdvancedRecommendations() {
  renderAdvancedControls();
  attachAdvancedListeners();
  loadSavedPreferences();
}

/**
 * Render advanced control panel
 * This builds the HTML and inserts it right before the recommendations grid.
 * I used a template string because it’s quicker than creating every node manually.
 */
function renderAdvancedControls() {
  const container = document.querySelector('.recommendations-section');
  if (!container) return; // if the section isn't on this page, just stop

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
        <!-- Radius Control -->
        <div class="control-group">
          <label class="control-label">
            Search Radius
            <span class="control-value" id="radiusValue">10 km</span>
          </label>
          <input type="range" class="range-slider" id="radiusSlider" 
                min="1" max="50" value="10" step="1">
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: #9ca3af; margin-top: 4px;">
            <span>1 km</span>
            <span>50 km</span>
          </div>
        </div>

        <!-- Min Rating Control -->
        <div class="control-group">
          <label class="control-label">
            Minimum Rating
            <span class="control-value" id="ratingValue">3.0 ⭐</span>
          </label>
          <input type="range" class="range-slider" id="ratingSlider" 
                min="0" max="5" value="3" step="0.5">
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: #9ca3af; margin-top: 4px;">
            <span>Any</span>
            <span>5.0 ⭐</span>
          </div>
        </div>

        <!-- Max Results Control -->
        <div class="control-group">
          <label class="control-label">
            Show Results
            <span class="control-value" id="resultsValue">50</span>
          </label>
          <input type="range" class="range-slider" id="resultsSlider" 
                min="10" max="100" value="50" step="10">
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: #9ca3af; margin-top: 4px;">
            <span>10</span>
            <span>100</span>
          </div>
        </div>

        <!-- Sort By -->
        <div class="control-group">
          <label class="control-label">Sort By</label>
          <div class="sort-options">
            <button class="sort-btn active" data-sort="score">
              <i class="fas fa-star"></i>
              Best Match
            </button>
            <button class="sort-btn" data-sort="rating">
              <i class="fas fa-trophy"></i>
              Highest Rated
            </button>
            <button class="sort-btn" data-sort="distance">
              <i class="fas fa-location-arrow"></i>
              Nearest
            </button>
            <button class="sort-btn" data-sort="price">
              <i class="fas fa-dollar-sign"></i>
              Budget
            </button>
          </div>
        </div>

        <!-- View Mode -->
        <div class="control-group">
          <label class="control-label">View Mode</label>
          <div class="view-mode-toggle">
            <button class="view-mode-btn active" data-view="grid">
              <i class="fas fa-th"></i>
              Grid
            </button>
            <button class="view-mode-btn" data-view="compact">
              <i class="fas fa-th-large"></i>
              Compact
            </button>
            <button class="view-mode-btn" data-view="list">
              <i class="fas fa-list"></i>
              List
            </button>
          </div>
        </div>

        <!-- Quick Filters -->
        <div class="control-group">
          <label class="control-label">Quick Filters</label>
          <div class="sort-options">
            <button class="quick-action-btn" id="hiddenGemsBtn">
              <i class="fas fa-gem"></i>
              Hidden Gems
            </button>
            <button class="quick-action-btn" id="budgetBtn">
              <i class="fas fa-piggy-bank"></i>
              Budget Friendly
            </button>
            <button class="quick-action-btn" id="topRatedBtn">
              <i class="fas fa-award"></i>
              Top Rated Only
            </button>
            <button class="quick-action-btn" id="nearbyBtn">
              <i class="fas fa-map-marker-alt"></i>
              Nearby (5km)
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Bulk Actions Bar -->
    <!-- This shows up only when user selects some cards for bulk actions. -->
    <div class="bulk-actions-bar" id="bulkActionsBar">
      <span class="bulk-count" id="bulkCount">0 selected</span>
      <div class="bulk-actions">
        <button class="bulk-action-btn primary" onclick="bulkAddToTrip()">
          <i class="fas fa-plus"></i>
          Add All
        </button>
        <button class="bulk-action-btn secondary" onclick="bulkSaveForLater()">
          <i class="fas fa-heart"></i>
          Save
        </button>
        <button class="bulk-action-btn secondary" onclick="clearBulkSelection()">
          <i class="fas fa-times"></i>
          Clear
        </button>
      </div>
    </div>
  `;

  // Insert controls before recommendations grid so it appears above the cards.
  const grid = document.getElementById('recommendationsGrid');
  if (grid) {
    grid.insertAdjacentHTML('beforebegin', controlsHTML);
  }
}

/**
 * Attach event listeners to controls
 * Mostly just updates advancedRecState + triggers filtering/sorting/reload.
 * Note: I used debouncing to avoid spamming reload/filter on slider drag.
 */
function attachAdvancedListeners() {
  // Toggle controls panel (collapse/expand)
  const toggle = document.getElementById('recControlsToggle');
  const body = document.getElementById('recControlsBody');
  if (toggle && body) {
    toggle.onclick = () => {
      body.classList.toggle('hidden');
      toggle.classList.toggle('collapsed');
    };
  }

  // Radius slider -> triggers a reload because this likely changes API results.
  const radiusSlider = document.getElementById('radiusSlider');
  const radiusValue = document.getElementById('radiusValue');
  if (radiusSlider && radiusValue) {
    radiusSlider.oninput = (e) => {
      const value = e.target.value;
      radiusValue.textContent = `${value} km`;
      advancedRecState.options.radius = parseInt(value);
      debouncedReload();
    };
  }

  // Rating slider -> can be applied locally, so we just filter.
  const ratingSlider = document.getElementById('ratingSlider');
  const ratingValue = document.getElementById('ratingValue');
  if (ratingSlider && ratingValue) {
    ratingSlider.oninput = (e) => {
      const value = parseFloat(e.target.value);
      ratingValue.textContent = value === 0 ? 'Any' : `${value.toFixed(1)} ⭐`;
      advancedRecState.options.minRating = value;
      debouncedFilter();
    };
  }

  // Results slider -> triggers reload because we want different “limit” amount.
  const resultsSlider = document.getElementById('resultsSlider');
  const resultsValue = document.getElementById('resultsValue');
  if (resultsSlider && resultsValue) {
    resultsSlider.oninput = (e) => {
      const value = e.target.value;
      resultsValue.textContent = value;
      advancedRecState.options.maxResults = parseInt(value);
      debouncedReload();
    };
  }

  // Sort buttons -> updates sort type and resorts current filtered list.
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      advancedRecState.options.sortBy = btn.dataset.sort;
      applySorting();
    };
  });

  // View mode buttons -> just changes CSS class on the grid.
  document.querySelectorAll('.view-mode-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.view-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      advancedRecState.options.viewMode = btn.dataset.view;
      applyViewMode();
    };
  });

  // Quick filter buttons -> toggle flags, then re-filter.
  const hiddenGemsBtn = document.getElementById('hiddenGemsBtn');
  const budgetBtn = document.getElementById('budgetBtn');
  const topRatedBtn = document.getElementById('topRatedBtn');
  const nearbyBtn = document.getElementById('nearbyBtn');

  if (hiddenGemsBtn) {
    hiddenGemsBtn.onclick = () => {
      hiddenGemsBtn.classList.toggle('active');
      advancedRecState.options.showHiddenGems = !advancedRecState.options.showHiddenGems;
      applyQuickFilters();
    };
  }

  if (budgetBtn) {
    budgetBtn.onclick = () => {
      budgetBtn.classList.toggle('active');
      advancedRecState.options.budgetFriendly = !advancedRecState.options.budgetFriendly;
      applyQuickFilters();
    };
  }

  if (topRatedBtn) {
    topRatedBtn.onclick = () => {
      topRatedBtn.classList.toggle('active');
      advancedRecState.options.topRatedOnly = !advancedRecState.options.topRatedOnly;
      applyQuickFilters();
    };
  }

  if (nearbyBtn) {
    nearbyBtn.onclick = () => {
      nearbyBtn.classList.toggle('active');
      advancedRecState.options.nearbyOnly = !advancedRecState.options.nearbyOnly;
      applyQuickFilters();
    };
  }
}

/**
 * Debounced reload recommendations
 * We use setTimeout + clearTimeout to debounce, so rapid slider changes only trigger 1 reload. [web:7]
 */
let reloadTimeout;
function debouncedReload() {
  clearTimeout(reloadTimeout);
  reloadTimeout = setTimeout(() => {
    // Safety check so this file doesn't crash if recommendations module isn't loaded.
    if (typeof loadRecommendations === 'function') {
      loadRecommendations({
        radius: advancedRecState.options.radius * 1000, // km -> meters (API expects meters)
        limit: advancedRecState.options.maxResults
      });
    }
  }, 500);
}

/**
 * Debounced filter
 * Faster delay because filtering is local and should feel instant-ish. [web:7]
 */
let filterTimeout;
function debouncedFilter() {
  clearTimeout(filterTimeout);
  filterTimeout = setTimeout(() => {
    applyQuickFilters();
  }, 300);
}

/**
 * Apply sorting
 * Sorts only the current filtered list (filterState.filteredResults).
 * If filterState is missing, just exit because it means recommendations haven't loaded yet.
 */
function applySorting() {
  if (!filterState || !filterState.filteredResults) return;

  const sorted = [...filterState.filteredResults];
  const sortBy = advancedRecState.options.sortBy;

  switch (sortBy) {
    case 'rating':
      sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
    case 'distance':
      sorted.sort((a, b) => (a.distanceFromCenter || 0) - (b.distanceFromCenter || 0));
      break;
    case 'price':
      sorted.sort((a, b) => (a.priceLevel || 0) - (b.priceLevel || 0));
      break;
    case 'score':
    default:
      sorted.sort((a, b) => (b.recommendationScore || 0) - (a.recommendationScore || 0));
      break;
  }

  filterState.filteredResults = sorted;

  // Let the main recommendations renderer repaint the UI.
  if (typeof displayFilteredRecommendations === 'function') {
    displayFilteredRecommendations();
  }

  // Add small UI badges after rendering (Top Rated / Hidden Gem / Budget + save button).
  addQualityBadges();
}

/**
 * Apply view mode
 * Basically toggles CSS class on the grid to change layout.
 */
function applyViewMode() {
  const grid = document.getElementById('recommendationsGrid');
  if (!grid) return;

  grid.classList.remove('grid', 'compact', 'list');
  grid.classList.add(advancedRecState.options.viewMode);
}

/**
 * Apply quick filters
 * Filters starting from "allRecommendations" every time (so toggles don't stack weirdly).
 */
function applyQuickFilters() {
  if (!filterState || !filterState.allRecommendations) return;

  const filtered = [...filterState.allRecommendations];
  const opts = advancedRecState.options;

  // Min rating filter (skip if 0 = Any)
  if (opts.minRating > 0) {
    filtered = filtered.filter(r => (r.rating || 0) >= opts.minRating);
  }

  // Hidden gems = good rating but a bit away from center (rough logic for now).
  if (opts.showHiddenGems) {
    filtered = filtered.filter(r =>
      (r.rating || 0) >= 4.0 && (r.distanceFromCenter || 0) > 3
    );
  }

  // Budget friendly = cheaper places (assuming priceLevel: 1 cheap -> 4 expensive)
  if (opts.budgetFriendly) {
    filtered = filtered.filter(r => (r.priceLevel || 2) <= 2);
  }

  // Top rated only = stricter rating cutoff
  if (opts.topRatedOnly) {
    filtered = filtered.filter(r => (r.rating || 0) >= 4.5);
  }

  // Nearby only = very close results
  if (opts.nearbyOnly) {
    filtered = filtered.filter(r => (r.distanceFromCenter || 0) <= 5);
  }

  filterState.filteredResults = filtered;
  applySorting(); // sorting also triggers UI render + badges
}

/**
 * Add quality badges to recommendation cards
 * After cards are rendered, we decorate them: badge + save button + bulk checkbox handler.
 * NOTE: This assumes card order matches filterState.filteredResults order.
 */
function addQualityBadges() {
  const cards = document.querySelectorAll('.recommendation-card');

  cards.forEach((card, index) => {
    const rec = filterState.filteredResults[index];
    if (!rec) return;

    // Cleanup first so we don’t duplicate badges when sorting/filtering reruns.
    card.querySelectorAll('.quality-badge').forEach(b => b.remove());
    card.querySelectorAll('.save-for-later').forEach(s => s.remove());

    let badge = null;

    // Top rated badge
    if (rec.rating >= 4.7) {
      badge = '<div class="quality-badge top-rated"><i class="fas fa-crown"></i> Top Rated</div>';
    }
    // Hidden gem badge
    else if (rec.rating >= 4.0 && rec.distanceFromCenter > 5) {
      badge = '<div class="quality-badge hidden-gem"><i class="fas fa-gem"></i> Hidden Gem</div>';
    }
    // Budget badge
    else if (rec.priceLevel <= 1) {
      badge = '<div class="quality-badge budget"><i class="fas fa-piggy-bank"></i> Budget</div>';
    }

    if (badge) {
      card.insertAdjacentHTML('afterbegin', badge);
    }

    // Save-for-later button: uses Set so it’s easy to check saved state.
    const isSaved = advancedRecState.savedPlaces.has(rec.name);
    const saveBtn = `
      <div class="save-for-later ${isSaved ? 'saved' : ''}" onclick="toggleSaveForLater('${rec.name}', event)">
        <i class="fas fa-heart"></i>
      </div>
    `;
    card.insertAdjacentHTML('afterbegin', saveBtn);

    // Bulk selection: hook into existing checkbox element if present.
    const checkbox = card.querySelector('.rec-card-compare-checkbox');
    if (checkbox) {
      checkbox.onclick = (e) => {
        e.stopPropagation(); // don’t trigger card click (like opening details)
        toggleBulkSelection(rec, card);
      };
    }
  });
}

/**
 * Toggle save for later
 * Attached to window because it's called from inline onclick in the HTML.
 */
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
  addQualityBadges(); // re-render the heart state
};

/**
 * Toggle bulk selection
 * Adds/removes selection and updates the checkbox UI + bulk action bar.
 */
function toggleBulkSelection(rec, card) {
  const checkbox = card.querySelector('.rec-card-compare-checkbox');

  if (advancedRecState.selectedForBulk.has(rec.name)) {
    advancedRecState.selectedForBulk.delete(rec.name);
    card.classList.remove('comparing');

    if (checkbox) {
      checkbox.classList.remove('checked');
      checkbox.innerHTML = '';
    }
  } else {
    advancedRecState.selectedForBulk.add(rec.name);
    card.classList.add('comparing');

    if (checkbox) {
      checkbox.classList.add('checked');
      checkbox.innerHTML = '<i class="fas fa-check"></i>';
    }
  }

  updateBulkActionsBar();
}

/**
 * Update bulk actions bar
 * Shows the bar only if something is selected.
 */
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

/**
 * Bulk add to trip
 * Loops selected places one by one (await inside loop) so we can count successes.
 * Not the fastest, but easier to handle errors per item.
 */
window.bulkAddToTrip = async function() {
  const selected = Array.from(advancedRecState.selectedForBulk);

  if (selected.length === 0) {
    showToast('No places selected', 'warning');
    return;
  }

  let addedCount = 0;

  for (const placeName of selected) {
    const rec = filterState.filteredResults.find(r => r.name === placeName);
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

/**
 * Bulk save for later
 * Adds all selected places to savedPlaces Set, then persists to sessionStorage.
 */
window.bulkSaveForLater = function() {
  const selected = Array.from(advancedRecState.selectedForBulk);

  selected.forEach(placeName => {
    advancedRecState.savedPlaces.add(placeName);
  });

  showToast(`Saved ${selected.length} place(s) for later!`, 'success');
  saveSavedPreferences();
  clearBulkSelection();
  addQualityBadges();
};

/**
 * Clear bulk selection
 * Also resets the UI state on cards.
 */
window.clearBulkSelection = function() {
  advancedRecState.selectedForBulk.clear();

  document.querySelectorAll('.recommendation-card.comparing').forEach(card => {
    card.classList.remove('comparing');
    const checkbox = card.querySelector('.rec-card-compare-checkbox');
    if (checkbox) {
      checkbox.classList.remove('checked');
      checkbox.innerHTML = '';
    }
  });

  updateBulkActionsBar();
};

/**
 * Save preferences to sessionStorage
 * sessionStorage stores strings, so we JSON.stringify the array version of the Set. [web:6]
 */
function saveSavedPreferences() {
  try {
    sessionStorage.setItem('savedPlaces', JSON.stringify(Array.from(advancedRecState.savedPlaces))); // [web:6]
  } catch (err) {
    console.error('Error saving preferences:', err);
  }
}

/**
 * Load saved preferences
 * Parse the stored JSON array and convert back to Set for easy lookups. [web:6]
 */
function loadSavedPreferences() {
  try {
    const saved = sessionStorage.getItem('savedPlaces');
    if (saved) {
      advancedRecState.savedPlaces = new Set(JSON.parse(saved)); // [web:6]
    }
  } catch (err) {
    console.error('Error loading preferences:', err);
  }
}
=======
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

  // Using Sets so we don’t accidentally save duplicates.
  // (Also easy to add/remove without worrying about index.)
  savedPlaces: new Set(),
  selectedForBulk: new Set()
};

/**
 * Initialize advanced recommendation controls
 * This gets everything started - builds UI, adds click handlers, loads saved stuff
 * Made it simple so it doesn't break when navigating between pages
 */

function initAdvancedRecommendations() {
  renderAdvancedControls();
  attachAdvancedListeners();
  loadSavedPreferences();
}

/**
 * Render advanced control panel
 * This builds the HTML and inserts it right before the recommendations grid.
 * I used a template string because it’s quicker than creating every node manually.
 */
function renderAdvancedControls() {
  const container = document.querySelector('.recommendations-section');
  if (!container) return; // if the section isn't on this page, just stop

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
        <!-- Radius Control -->
        <div class="control-group">
          <label class="control-label">
            Search Radius
            <span class="control-value" id="radiusValue">10 km</span>
          </label>
          <input type="range" class="range-slider" id="radiusSlider" 
                min="1" max="50" value="10" step="1">
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: #9ca3af; margin-top: 4px;">
            <span>1 km</span>
            <span>50 km</span>
          </div>
        </div>

        <!-- Min Rating Control -->
        <div class="control-group">
          <label class="control-label">
            Minimum Rating
            <span class="control-value" id="ratingValue">3.0 ⭐</span>
          </label>
          <input type="range" class="range-slider" id="ratingSlider" 
                min="0" max="5" value="3" step="0.5">
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: #9ca3af; margin-top: 4px;">
            <span>Any</span>
            <span>5.0 ⭐</span>
          </div>
        </div>

        <!-- Max Results Control -->
        <div class="control-group">
          <label class="control-label">
            Show Results
            <span class="control-value" id="resultsValue">50</span>
          </label>
          <input type="range" class="range-slider" id="resultsSlider" 
                min="10" max="100" value="50" step="10">
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: #9ca3af; margin-top: 4px;">
            <span>10</span>
            <span>100</span>
          </div>
        </div>

        <!-- Sort By -->
        <div class="control-group">
          <label class="control-label">Sort By</label>
          <div class="sort-options">
            <button class="sort-btn active" data-sort="score">
              <i class="fas fa-star"></i>
              Best Match
            </button>
            <button class="sort-btn" data-sort="rating">
              <i class="fas fa-trophy"></i>
              Highest Rated
            </button>
            <button class="sort-btn" data-sort="distance">
              <i class="fas fa-location-arrow"></i>
              Nearest
            </button>
            <button class="sort-btn" data-sort="price">
              <i class="fas fa-dollar-sign"></i>
              Budget
            </button>
          </div>
        </div>

        <!-- View Mode -->
        <div class="control-group">
          <label class="control-label">View Mode</label>
          <div class="view-mode-toggle">
            <button class="view-mode-btn active" data-view="grid">
              <i class="fas fa-th"></i>
              Grid
            </button>
            <button class="view-mode-btn" data-view="compact">
              <i class="fas fa-th-large"></i>
              Compact
            </button>
            <button class="view-mode-btn" data-view="list">
              <i class="fas fa-list"></i>
              List
            </button>
          </div>
        </div>

        <!-- Quick Filters -->
        <div class="control-group">
          <label class="control-label">Quick Filters</label>
          <div class="sort-options">
            <button class="quick-action-btn" id="hiddenGemsBtn">
              <i class="fas fa-gem"></i>
              Hidden Gems
            </button>
            <button class="quick-action-btn" id="budgetBtn">
              <i class="fas fa-piggy-bank"></i>
              Budget Friendly
            </button>
            <button class="quick-action-btn" id="topRatedBtn">
              <i class="fas fa-award"></i>
              Top Rated Only
            </button>
            <button class="quick-action-btn" id="nearbyBtn">
              <i class="fas fa-map-marker-alt"></i>
              Nearby (5km)
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Bulk Actions Bar -->
    <!-- This shows up only when user selects some cards for bulk actions. -->
    <div class="bulk-actions-bar" id="bulkActionsBar">
      <span class="bulk-count" id="bulkCount">0 selected</span>
      <div class="bulk-actions">
        <button class="bulk-action-btn primary" onclick="bulkAddToTrip()">
          <i class="fas fa-plus"></i>
          Add All
        </button>
        <button class="bulk-action-btn secondary" onclick="bulkSaveForLater()">
          <i class="fas fa-heart"></i>
          Save
        </button>
        <button class="bulk-action-btn secondary" onclick="clearBulkSelection()">
          <i class="fas fa-times"></i>
          Clear
        </button>
      </div>
    </div>
  `;

  // Insert controls before recommendations grid so it appears above the cards.
  const grid = document.getElementById('recommendationsGrid');
  if (grid) {
    grid.insertAdjacentHTML('beforebegin', controlsHTML);
  }
}

/**
 * Attach event listeners to controls
 * Mostly just updates advancedRecState + triggers filtering/sorting/reload.
 * Note: I used debouncing to avoid spamming reload/filter on slider drag.
 */
function attachAdvancedListeners() {
  // Toggle controls panel (collapse/expand)
  const toggle = document.getElementById('recControlsToggle');
  const body = document.getElementById('recControlsBody');
  if (toggle && body) {
    toggle.onclick = () => {
      body.classList.toggle('hidden');
      toggle.classList.toggle('collapsed');
    };
  }

  // Radius slider -> triggers a reload because this likely changes API results.
  const radiusSlider = document.getElementById('radiusSlider');
  const radiusValue = document.getElementById('radiusValue');
  if (radiusSlider && radiusValue) {
    radiusSlider.oninput = (e) => {
      const value = e.target.value;
      radiusValue.textContent = `${value} km`;
      advancedRecState.options.radius = parseInt(value);
      debouncedReload();
    };
  }

  // Rating slider -> can be applied locally, so we just filter.
  const ratingSlider = document.getElementById('ratingSlider');
  const ratingValue = document.getElementById('ratingValue');
  if (ratingSlider && ratingValue) {
    ratingSlider.oninput = (e) => {
      const value = parseFloat(e.target.value);
      ratingValue.textContent = value === 0 ? 'Any' : `${value.toFixed(1)} ⭐`;
      advancedRecState.options.minRating = value;
      debouncedFilter();
    };
  }

  // Results slider -> triggers reload because we want different “limit” amount.
  const resultsSlider = document.getElementById('resultsSlider');
  const resultsValue = document.getElementById('resultsValue');
  if (resultsSlider && resultsValue) {
    resultsSlider.oninput = (e) => {
      const value = e.target.value;
      resultsValue.textContent = value;
      advancedRecState.options.maxResults = parseInt(value);
      debouncedReload();
    };
  }

  // Sort buttons -> updates sort type and resorts current filtered list.
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      advancedRecState.options.sortBy = btn.dataset.sort;
      applySorting();
    };
  });

  // View mode buttons -> just changes CSS class on the grid.
  document.querySelectorAll('.view-mode-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.view-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      advancedRecState.options.viewMode = btn.dataset.view;
      applyViewMode();
    };
  });

  // Quick filter buttons -> toggle flags, then re-filter.
  const hiddenGemsBtn = document.getElementById('hiddenGemsBtn');
  const budgetBtn = document.getElementById('budgetBtn');
  const topRatedBtn = document.getElementById('topRatedBtn');
  const nearbyBtn = document.getElementById('nearbyBtn');

  if (hiddenGemsBtn) {
    hiddenGemsBtn.onclick = () => {
      hiddenGemsBtn.classList.toggle('active');
      advancedRecState.options.showHiddenGems = !advancedRecState.options.showHiddenGems;
      applyQuickFilters();
    };
  }

  if (budgetBtn) {
    budgetBtn.onclick = () => {
      budgetBtn.classList.toggle('active');
      advancedRecState.options.budgetFriendly = !advancedRecState.options.budgetFriendly;
      applyQuickFilters();
    };
  }

  if (topRatedBtn) {
    topRatedBtn.onclick = () => {
      topRatedBtn.classList.toggle('active');
      advancedRecState.options.topRatedOnly = !advancedRecState.options.topRatedOnly;
      applyQuickFilters();
    };
  }

  if (nearbyBtn) {
    nearbyBtn.onclick = () => {
      nearbyBtn.classList.toggle('active');
      advancedRecState.options.nearbyOnly = !advancedRecState.options.nearbyOnly;
      applyQuickFilters();
    };
  }
}

/**
 * Debounced reload recommendations
 * We use setTimeout + clearTimeout to debounce, so rapid slider changes only trigger 1 reload. [web:7]
 */
let reloadTimeout;
function debouncedReload() {
  clearTimeout(reloadTimeout);
  reloadTimeout = setTimeout(() => {
    // Safety check so this file doesn't crash if recommendations module isn't loaded.
    if (typeof loadRecommendations === 'function') {
      loadRecommendations({
        radius: advancedRecState.options.radius * 1000, // km -> meters (API expects meters)
        limit: advancedRecState.options.maxResults
      });
    }
  }, 500);
}

/**
 * Debounced filter
 * Faster delay because filtering is local and should feel instant-ish. [web:7]
 */
let filterTimeout;
function debouncedFilter() {
  clearTimeout(filterTimeout);
  filterTimeout = setTimeout(() => {
    applyQuickFilters();
  }, 300);
}

/**
 * Apply sorting
 * Sorts only the current filtered list (filterState.filteredResults).
 * If filterState is missing, just exit because it means recommendations haven't loaded yet.
 */
function applySorting() {
  if (!filterState || !filterState.filteredResults) return;

  const sorted = [...filterState.filteredResults];
  const sortBy = advancedRecState.options.sortBy;

  switch (sortBy) {
    case 'rating':
      sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
    case 'distance':
      sorted.sort((a, b) => (a.distanceFromCenter || 0) - (b.distanceFromCenter || 0));
      break;
    case 'price':
      sorted.sort((a, b) => (a.priceLevel || 0) - (b.priceLevel || 0));
      break;
    case 'score':
    default:
      sorted.sort((a, b) => (b.recommendationScore || 0) - (a.recommendationScore || 0));
      break;
  }

  filterState.filteredResults = sorted;

  // Let the main recommendations renderer repaint the UI.
  if (typeof displayFilteredRecommendations === 'function') {
    displayFilteredRecommendations();
  }

  // Add small UI badges after rendering (Top Rated / Hidden Gem / Budget + save button).
  addQualityBadges();
}

/**
 * Apply view mode
 * Basically toggles CSS class on the grid to change layout.
 */
function applyViewMode() {
  const grid = document.getElementById('recommendationsGrid');
  if (!grid) return;

  grid.classList.remove('grid', 'compact', 'list');
  grid.classList.add(advancedRecState.options.viewMode);
}

/**
 * Apply quick filters
 * Filters starting from "allRecommendations" every time (so toggles don't stack weirdly).
 */
function applyQuickFilters() {
  if (!filterState || !filterState.allRecommendations) return;

  const filtered = [...filterState.allRecommendations];
  const opts = advancedRecState.options;

  // Min rating filter (skip if 0 = Any)
  if (opts.minRating > 0) {
    filtered = filtered.filter(r => (r.rating || 0) >= opts.minRating);
  }

  // Hidden gems = good rating but a bit away from center (rough logic for now).
  if (opts.showHiddenGems) {
    filtered = filtered.filter(r =>
      (r.rating || 0) >= 4.0 && (r.distanceFromCenter || 0) > 3
    );
  }

  // Budget friendly = cheaper places (assuming priceLevel: 1 cheap -> 4 expensive)
  if (opts.budgetFriendly) {
    filtered = filtered.filter(r => (r.priceLevel || 2) <= 2);
  }

  // Top rated only = stricter rating cutoff
  if (opts.topRatedOnly) {
    filtered = filtered.filter(r => (r.rating || 0) >= 4.5);
  }

  // Nearby only = very close results
  if (opts.nearbyOnly) {
    filtered = filtered.filter(r => (r.distanceFromCenter || 0) <= 5);
  }

  filterState.filteredResults = filtered;
  applySorting(); // sorting also triggers UI render + badges
}

/**
 * Add quality badges to recommendation cards
 * After cards are rendered, we decorate them: badge + save button + bulk checkbox handler.
 * NOTE: This assumes card order matches filterState.filteredResults order.
 */
function addQualityBadges() {
  const cards = document.querySelectorAll('.recommendation-card');

  cards.forEach((card, index) => {
    const rec = filterState.filteredResults[index];
    if (!rec) return;

    // Cleanup first so we don’t duplicate badges when sorting/filtering reruns.
    card.querySelectorAll('.quality-badge').forEach(b => b.remove());
    card.querySelectorAll('.save-for-later').forEach(s => s.remove());

    let badge = null;

    // Top rated badge
    if (rec.rating >= 4.7) {
      badge = '<div class="quality-badge top-rated"><i class="fas fa-crown"></i> Top Rated</div>';
    }
    // Hidden gem badge
    else if (rec.rating >= 4.0 && rec.distanceFromCenter > 5) {
      badge = '<div class="quality-badge hidden-gem"><i class="fas fa-gem"></i> Hidden Gem</div>';
    }
    // Budget badge
    else if (rec.priceLevel <= 1) {
      badge = '<div class="quality-badge budget"><i class="fas fa-piggy-bank"></i> Budget</div>';
    }

    if (badge) {
      card.insertAdjacentHTML('afterbegin', badge);
    }

    // Save-for-later button: uses Set so it’s easy to check saved state.
    const isSaved = advancedRecState.savedPlaces.has(rec.name);
    const saveBtn = `
      <div class="save-for-later ${isSaved ? 'saved' : ''}" onclick="toggleSaveForLater('${rec.name}', event)">
        <i class="fas fa-heart"></i>
      </div>
    `;
    card.insertAdjacentHTML('afterbegin', saveBtn);

    // Bulk selection: hook into existing checkbox element if present.
    const checkbox = card.querySelector('.rec-card-compare-checkbox');
    if (checkbox) {
      checkbox.onclick = (e) => {
        e.stopPropagation(); // don’t trigger card click (like opening details)
        toggleBulkSelection(rec, card);
      };
    }
  });
}

/**
 * Toggle save for later
 * Attached to window because it's called from inline onclick in the HTML.
 */
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
  addQualityBadges(); // re-render the heart state
};

/**
 * Toggle bulk selection
 * Adds/removes selection and updates the checkbox UI + bulk action bar.
 */
function toggleBulkSelection(rec, card) {
  const checkbox = card.querySelector('.rec-card-compare-checkbox');

  if (advancedRecState.selectedForBulk.has(rec.name)) {
    advancedRecState.selectedForBulk.delete(rec.name);
    card.classList.remove('comparing');

    if (checkbox) {
      checkbox.classList.remove('checked');
      checkbox.innerHTML = '';
    }
  } else {
    advancedRecState.selectedForBulk.add(rec.name);
    card.classList.add('comparing');

    if (checkbox) {
      checkbox.classList.add('checked');
      checkbox.innerHTML = '<i class="fas fa-check"></i>';
    }
  }

  updateBulkActionsBar();
}

/**
 * Update bulk actions bar
 * Shows the bar only if something is selected.
 */
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

/**
 * Bulk add to trip
 * Loops selected places one by one (await inside loop) so we can count successes.
 * Not the fastest, but easier to handle errors per item.
 */
window.bulkAddToTrip = async function() {
  const selected = Array.from(advancedRecState.selectedForBulk);

  if (selected.length === 0) {
    showToast('No places selected', 'warning');
    return;
  }

  let addedCount = 0;

  for (const placeName of selected) {
    const rec = filterState.filteredResults.find(r => r.name === placeName);
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

/**
 * Bulk save for later
 * Adds all selected places to savedPlaces Set, then persists to sessionStorage.
 */
window.bulkSaveForLater = function() {
  const selected = Array.from(advancedRecState.selectedForBulk);

  selected.forEach(placeName => {
    advancedRecState.savedPlaces.add(placeName);
  });

  showToast(`Saved ${selected.length} place(s) for later!`, 'success');
  saveSavedPreferences();
  clearBulkSelection();
  addQualityBadges();
};

/**
 * Clear bulk selection
 * Also resets the UI state on cards.
 */
window.clearBulkSelection = function() {
  advancedRecState.selectedForBulk.clear();

  document.querySelectorAll('.recommendation-card.comparing').forEach(card => {
    card.classList.remove('comparing');
    const checkbox = card.querySelector('.rec-card-compare-checkbox');
    if (checkbox) {
      checkbox.classList.remove('checked');
      checkbox.innerHTML = '';
    }
  });

  updateBulkActionsBar();
};

/**
 * Save preferences to sessionStorage
 * sessionStorage stores strings, so we JSON.stringify the array version of the Set. [web:6]
 */
function saveSavedPreferences() {
  try {
    sessionStorage.setItem('savedPlaces', JSON.stringify(Array.from(advancedRecState.savedPlaces))); // [web:6]
  } catch (err) {
    console.error('Error saving preferences:', err);
  }
}

/**
 * Load saved preferences
 * Parse the stored JSON array and convert back to Set for easy lookups. [web:6]
 */
function loadSavedPreferences() {
  try {
    const saved = sessionStorage.getItem('savedPlaces');
    if (saved) {
      advancedRecState.savedPlaces = new Set(JSON.parse(saved)); // [web:6]
    }
  } catch (err) {
    console.error('Error loading preferences:', err);
  }
}
>>>>>>> 0007615a5a7317e8689fc9727726ee86c5585786
