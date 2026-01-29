// ============================================================
// COMPARISON MODULE - SIDE PANEL ONLY (NO BOTTOM BAR)
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
    <div class="comparison-overlay" id="comparisonOverlay"></div>
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
      <div class="comparison-footer">
        <button class="comparison-clear-all" onclick="clearAllComparisons()">
          <i class="fas fa-trash-alt"></i>
          Clear All
        </button>
        <button class="comparison-add-all" onclick="addAllFromComparison()">
          <i class="fas fa-plus-circle"></i>
          Add All to Trip
        </button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', panelHTML);
  
  // Add overlay click handler
  const overlay = document.getElementById('comparisonOverlay');
  if (overlay) {
    overlay.addEventListener('click', closeComparisonPanel);
  }
  
  console.log('✅ Comparison panel initialized');
}

// Initialize on DOM load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initComparisonPanel);
} else {
  initComparisonPanel();
}

// ====================== TOGGLE SELECTION ======================
window.toggleCompareSelection = function(place, card) {
  const placeName = place.name || place._id;

  if (comparisonState.selectedPlaces.has(placeName)) {
    comparisonState.selectedPlaces.delete(placeName);
    card.classList.remove('comparing');
    card.classList.remove('selected');
    
    const checkbox = card.querySelector('.rec-card-compare-checkbox i');
    if (checkbox) {
      checkbox.style.display = 'none';
    }

    if (typeof showToast === 'function') {
      showToast('Removed from comparison', 'info');
    }
  } else {
    if (comparisonState.selectedPlaces.size >= comparisonState.maxCompare) {
      if (typeof showToast === 'function') {
        showToast(`You can compare up to ${comparisonState.maxCompare} places`, 'warning');
      }
      return;
    }

    comparisonState.selectedPlaces.set(placeName, place);
    card.classList.add('comparing');
    card.classList.add('selected');
    
    const checkbox = card.querySelector('.rec-card-compare-checkbox i');
    if (checkbox) {
      checkbox.style.display = 'block';
    }

    if (typeof showToast === 'function') {
      showToast('Added to comparison', 'success');
    }
  }

  updateComparisonPanel();
};

// ====================== UPDATE PANEL ======================
window.updateComparisonPanel = function() {
  const panel = document.getElementById('comparisonPanel');
  const overlay = document.getElementById('comparisonOverlay');
  const grid = document.getElementById('comparisonGrid');
  const empty = document.getElementById('comparisonEmpty');
  const count = document.getElementById('comparisonCount');

  if (!panel || !grid || !empty || !count) {
    console.warn('Comparison panel elements not found');
    return;
  }

  const selectedCount = comparisonState.selectedPlaces.size;

  count.textContent = `(${selectedCount})`;

  if (selectedCount > 0) {
    empty.style.display = 'none';
    grid.style.display = 'grid';
    renderComparisonItems();
  } else {
    grid.innerHTML = '';
    empty.style.display = 'flex';
  }
};

// ====================== RENDER ITEMS ======================
function renderComparisonItems() {
  const grid = document.getElementById('comparisonGrid');
  if (!grid) return;

  const items = Array.from(comparisonState.selectedPlaces.values());

  grid.innerHTML = items.map(place => createComparisonItem(place)).join('');

  items.forEach(place => {
    const item = grid.querySelector(`[data-place-name="${escapeAttr(place.name)}"]`);
    if (!item) return;

    const removeBtn = item.querySelector('.comparison-remove');
    if (removeBtn) {
      removeBtn.onclick = () => removeFromComparison(place.name);
    }

    const addBtn = item.querySelector('.comparison-btn-add');
    if (addBtn) {
      addBtn.onclick = () => addFromComparison(place);
    }

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

  const cards = document.querySelectorAll('.recommendation-card');
  cards.forEach(card => {
    const cardName = card.querySelector('.rec-name')?.textContent;
    if (cardName === placeName) {
      card.classList.remove('comparing');
      card.classList.remove('selected');
      const checkbox = card.querySelector('.rec-card-compare-checkbox i');
      if (checkbox) {
        checkbox.style.display = 'none';
      }
    }
  });

  updateComparisonPanel();
  
  if (typeof showToast === 'function') {
    showToast('Removed from comparison', 'info');
  }
}

// ====================== ADD FROM COMPARISON ======================
async function addFromComparison(place) {
  if (typeof addRecommendationToTrip === 'function') {
    await addRecommendationToTrip(place);
    removeFromComparison(place.name);
  } else {
    console.error('addRecommendationToTrip function not found');
    if (typeof showToast === 'function') {
      showToast('Failed to add place', 'error');
    }
  }
}

// ====================== ADD ALL FROM COMPARISON ======================
window.addAllFromComparison = async function() {
  const count = comparisonState.selectedPlaces.size;
  
  if (count === 0) {
    if (typeof showToast === 'function') {
      showToast('No places selected', 'warning');
    }
    return;
  }
  
  if (count > 3) {
    if (!confirm(`Add ${count} places to your trip?`)) {
      return;
    }
  }
  
  let successCount = 0;
  const selectedPlaces = Array.from(comparisonState.selectedPlaces.values());
  
  for (const place of selectedPlaces) {
    try {
      if (typeof addRecommendationToTrip === 'function') {
        await addRecommendationToTrip(place);
        successCount++;
      }
    } catch (err) {
      console.error('Failed to add place:', place.name, err);
    }
  }
  
  if (successCount > 0) {
    if (typeof showToast === 'function') {
      showToast(`✅ Added ${successCount} place${successCount > 1 ? 's' : ''} to your trip!`, 'success');
    }
    clearAllComparisons();
    closeComparisonPanel();
  } else {
    if (typeof showToast === 'function') {
      showToast('Failed to add places', 'error');
    }
  }
};

// ====================== OPEN COMPARISON PANEL ======================
window.openComparisonPanel = function() {
  const panel = document.getElementById('comparisonPanel');
  const overlay = document.getElementById('comparisonOverlay');
  
  if (comparisonState.selectedPlaces.size === 0) {
    if (typeof showToast === 'function') {
      showToast('Please select places to compare', 'info');
    }
    return;
  }
  
  if (panel && overlay) {
    panel.classList.add('active');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
};

// ====================== CLOSE PANEL ======================
window.closeComparisonPanel = function() {
  const panel = document.getElementById('comparisonPanel');
  const overlay = document.getElementById('comparisonOverlay');
  
  if (panel && overlay) {
    panel.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
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

  comparisonState.selectedPlaces.clear();

  document.querySelectorAll('.recommendation-card.comparing, .recommendation-card.selected').forEach(card => {
    card.classList.remove('comparing');
    card.classList.remove('selected');
    const checkbox = card.querySelector('.rec-card-compare-checkbox i');
    if (checkbox) {
      checkbox.style.display = 'none';
    }
  });

  updateComparisonPanel();
  
  if (typeof showToast === 'function') {
    showToast('Comparison cleared', 'info');
  }
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

console.log('✅ Comparison module loaded (side panel only)');
