// ============================================================
// COMPARISON MODULE - Complete Implementation
// ============================================================

const comparisonState = {
  selectedPlaces: new Map(), // Map<placeName, placeData>
  maxCompare: 4
};

// ====================== INITIALIZATION ======================
function initComparisonPanel() {
  // Check if panel already exists
  if (document.getElementById('comparisonPanel')) {
    return;
  }

  const panelHTML = `
    <div class="comparison-panel" id="comparisonPanel">
      <div class="comparison-header">
        <h3>
          <i class="fas fa-balance-scale"></i>
          Compare Places
          <span class="comparison-count" id="comparisonCount">(0)</span>
        </h3>
        <button class="comparison-close" onclick="closeComparisonPanel()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="comparison-body">
        <div class="comparison-grid" id="comparisonGrid">
          <!-- Comparison items will be inserted here -->
        </div>
        <div class="comparison-empty" id="comparisonEmpty" style="display: none;">
          <i class="fas fa-info-circle"></i>
          <p>Select places to compare by clicking the checkbox on each card</p>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', panelHTML);
  console.log('✅ Comparison panel initialized');
}

// Initialize on DOM load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initComparisonPanel);
} else {
  initComparisonPanel();
}

// ====================== TOGGLE SELECTION ======================
/**
 * Toggle place in comparison selection
 * @param {Object} place - Place data from recommendation card
 * @param {HTMLElement} card - The card element
 */
window.toggleCompareSelection = function(place, card) {
  const placeName = place.name || place._id;

  if (comparisonState.selectedPlaces.has(placeName)) {
    // Remove from comparison
    comparisonState.selectedPlaces.delete(placeName);
    card.classList.remove('comparing');
    
    const checkbox = card.querySelector('.rec-card-compare-checkbox i');
    if (checkbox) {
      checkbox.style.display = 'none';
    }

    showToast('Removed from comparison', 'info');
  } else {
    // Check max limit
    if (comparisonState.selectedPlaces.size >= comparisonState.maxCompare) {
      showToast(`You can compare up to ${comparisonState.maxCompare} places`, 'warning');
      return;
    }

    // Add to comparison
    comparisonState.selectedPlaces.set(placeName, place);
    card.classList.add('comparing');
    
    const checkbox = card.querySelector('.rec-card-compare-checkbox i');
    if (checkbox) {
      checkbox.style.display = 'block';
    }

    showToast('Added to comparison', 'success');
  }

  updateComparisonPanel();
};

// ====================== UPDATE PANEL ======================
/**
 * Update the comparison panel UI
 */
window.updateComparisonPanel = function() {
  const panel = document.getElementById('comparisonPanel');
  const grid = document.getElementById('comparisonGrid');
  const empty = document.getElementById('comparisonEmpty');
  const count = document.getElementById('comparisonCount');

  if (!panel || !grid || !empty || !count) {
    console.warn('Comparison panel elements not found');
    return;
  }

  const selectedCount = comparisonState.selectedPlaces.size;

  // Update count
  count.textContent = `(${selectedCount})`;

  // Show/hide panel
  if (selectedCount > 0) {
    panel.classList.add('active');
    empty.style.display = 'none';
    grid.style.display = 'grid';
    renderComparisonItems();
  } else {
    panel.classList.remove('active');
    grid.innerHTML = '';
  }
};

// ====================== RENDER ITEMS ======================
function renderComparisonItems() {
  const grid = document.getElementById('comparisonGrid');
  if (!grid) return;

  const items = Array.from(comparisonState.selectedPlaces.values());

  grid.innerHTML = items.map(place => createComparisonItem(place)).join('');

  // Attach event listeners
  items.forEach(place => {
    const item = grid.querySelector(`[data-place-name="${escapeAttr(place.name)}"]`);
    if (!item) return;

    // Remove button
    const removeBtn = item.querySelector('.comparison-remove');
    if (removeBtn) {
      removeBtn.onclick = () => removeFromComparison(place.name);
    }

    // Add button
    const addBtn = item.querySelector('.comparison-btn-add');
    if (addBtn) {
      addBtn.onclick = () => addFromComparison(place);
    }

    // Details button
    const detailsBtn = item.querySelector('.comparison-btn-details');
    if (detailsBtn) {
      detailsBtn.onclick = () => {
        if (typeof showRecommendationDetails === 'function') {
          showRecommendationDetails(place);
        }
      };
    }
  });
}

// ====================== CREATE COMPARISON ITEM ======================
function createComparisonItem(place) {
  const rating = place.rating || place.recommendationScore || 0;
  const distance = place.distanceFromCenter || 0;
  const priceLevel = place.priceLevel || 0;

  // Find best value (lowest price, highest rating, closest distance)
  const allPlaces = Array.from(comparisonState.selectedPlaces.values());
  const bestRating = Math.max(...allPlaces.map(p => p.rating || 0));
  const bestDistance = Math.min(...allPlaces.map(p => p.distanceFromCenter || 999));
  const bestPrice = Math.min(...allPlaces.map(p => p.priceLevel || 5));

  const isHighlightRating = rating === bestRating && allPlaces.length > 1;
  const isHighlightDistance = distance === bestDistance && allPlaces.length > 1;
  const isHighlightPrice = priceLevel === bestPrice && allPlaces.length > 1;

  return `
    <div class="comparison-item" data-place-name="${escapeAttr(place.name)}">
      <div class="comparison-item-header">
        <div>
          <div class="comparison-item-name">${escapeHtml(place.name)}</div>
          <div class="comparison-item-category">
            <i class="fas fa-${getCategoryIcon(place.category)}"></i>
            ${escapeHtml(place.category)}
          </div>
        </div>
        <button class="comparison-remove" title="Remove">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="comparison-stats">
        <div class="comparison-stat">
          <span class="comparison-stat-label">
            <i class="fas fa-star"></i> Rating
          </span>
          <span class="comparison-stat-value ${isHighlightRating ? 'highlight' : ''}">
            ${rating.toFixed(1)} / 5.0
          </span>
        </div>

        ${distance > 0 ? `
          <div class="comparison-stat">
            <span class="comparison-stat-label">
              <i class="fas fa-map-marker-alt"></i> Distance
            </span>
            <span class="comparison-stat-value ${isHighlightDistance ? 'highlight' : ''}">
              ${distance.toFixed(1)} km
            </span>
          </div>
        ` : ''}

        ${priceLevel > 0 ? `
          <div class="comparison-stat">
            <span class="comparison-stat-label">
              <i class="fas fa-dollar-sign"></i> Price Level
            </span>
            <span class="comparison-stat-value ${isHighlightPrice ? 'highlight' : ''}">
              ${'$'.repeat(priceLevel)} / $$$$$
            </span>
          </div>
        ` : ''}

        ${place.address ? `
          <div class="comparison-stat">
            <span class="comparison-stat-label">
              <i class="fas fa-map-pin"></i> Location
            </span>
            <span class="comparison-stat-value" style="font-size: 11px; text-align: right;">
              ${escapeHtml(place.address.substring(0, 30))}${place.address.length > 30 ? '...' : ''}
            </span>
          </div>
        ` : ''}
      </div>

      <div class="comparison-actions">
        <button class="comparison-btn-add">
          <i class="fas fa-plus"></i> Add
        </button>
        <button class="comparison-btn-details">
          <i class="fas fa-info"></i> Details
        </button>
      </div>
    </div>
  `;
}

// ====================== REMOVE FROM COMPARISON ======================
function removeFromComparison(placeName) {
  comparisonState.selectedPlaces.delete(placeName);

  // Update the card UI
  const cards = document.querySelectorAll('.recommendation-card');
  cards.forEach(card => {
    const cardName = card.querySelector('.rec-name')?.textContent;
    if (cardName === placeName) {
      card.classList.remove('comparing');
      const checkbox = card.querySelector('.rec-card-compare-checkbox i');
      if (checkbox) {
        checkbox.style.display = 'none';
      }
    }
  });

  updateComparisonPanel();
  showToast('Removed from comparison', 'info');
}

// ====================== ADD FROM COMPARISON ======================
async function addFromComparison(place) {
  if (typeof addRecommendationToTrip === 'function') {
    await addRecommendationToTrip(place);
    removeFromComparison(place.name);
  } else {
    console.error('addRecommendationToTrip function not found');
    showToast('Failed to add place', 'error');
  }
}

// ====================== CLOSE PANEL ======================
window.closeComparisonPanel = function() {
  const panel = document.getElementById('comparisonPanel');
  if (panel) {
    panel.classList.remove('active');
  }
};

// ====================== CLEAR ALL ======================
window.clearAllComparisons = function() {
  if (comparisonState.selectedPlaces.size === 0) {
    return;
  }

  if (!confirm(`Remove all ${comparisonState.selectedPlaces.size} places from comparison?`)) {
    return;
  }

  // Clear selection
  comparisonState.selectedPlaces.clear();

  // Update all cards
  document.querySelectorAll('.recommendation-card.comparing').forEach(card => {
    card.classList.remove('comparing');
    const checkbox = card.querySelector('.rec-card-compare-checkbox i');
    if (checkbox) {
      checkbox.style.display = 'none';
    }
  });

  updateComparisonPanel();
  showToast('Comparison cleared', 'info');
};

// ====================== UTILITIES ======================
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

function escapeAttr(text) {
  if (!text) return '';
  return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Make available globally
window.comparisonState = comparisonState;
window.initComparisonPanel = initComparisonPanel;

console.log('✅ Comparison module loaded');
