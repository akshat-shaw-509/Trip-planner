// ============================================================
// COMPARISON MODULE - Complete Implementation with Bottom Bar
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
window.toggleCompareSelection = function(place, card) {
  const placeName = place.name || place._id;

  if (comparisonState.selectedPlaces.has(placeName)) {
    comparisonState.selectedPlaces.delete(placeName);
    card.classList.remove('comparing');
    
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

console.log('✅ Comparison module loaded');

// ============================================================
// BOTTOM COMPARISON BAR - INTEGRATED FUNCTIONALITY
// ============================================================

const comparisonBarState = {
  selectedCards: new Set(),
  selectedData: new Map()
};

// ====================== BOTTOM BAR INITIALIZATION ======================
function initComparisonBar() {
  if (!document.getElementById('comparisonBottomBar')) {
    createComparisonBarHTML();
  }
  attachComparisonBarListeners();
  console.log('✅ Bottom comparison bar initialized');
}

function createComparisonBarHTML() {
  const barHTML = `
    <div class="comparison-bottom-bar" id="comparisonBottomBar" aria-hidden="true">
      <div class="comparison-bar-count">
        <i class="fas fa-check-circle"></i>
        <span class="comparison-bar-count-text">
          <span class="comparison-bar-count-number" id="comparisonBarNumber">0</span>
          selected
        </span>
      </div>
      
      <div class="comparison-bar-actions">
        <button class="comparison-bar-btn primary" id="compareBarBtn">
          <i class="fas fa-balance-scale"></i>
          Compare
        </button>
        
        <button class="comparison-bar-btn secondary" id="addAllBarBtn">
          <i class="fas fa-plus"></i>
          Add All
        </button>
        
        <button class="comparison-bar-btn clear" id="clearBarBtn">
          <i class="fas fa-times"></i>
          Clear
        </button>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', barHTML);
}

function attachComparisonBarListeners() {
  const compareBtn = document.getElementById('compareBarBtn');
  if (compareBtn) {
    compareBtn.onclick = handleCompareBarClick;
  }
  
  const addAllBtn = document.getElementById('addAllBarBtn');
  if (addAllBtn) {
    addAllBtn.onclick = handleAddAllBarClick;
  }
  
  const clearBtn = document.getElementById('clearBarBtn');
  if (clearBtn) {
    clearBtn.onclick = handleClearBarClick;
  }
  
  document.addEventListener('click', function(e) {
    const checkbox = e.target.closest('.rec-card-compare-checkbox');
    if (checkbox) {
      const card = checkbox.closest('.recommendation-card');
      if (card) {
        handleCheckboxBarClick(card, checkbox);
      }
    }
  });
}

function handleCheckboxBarClick(card, checkbox) {
  const cardId = card.dataset.placeId || card.dataset.name;
  
  if (!cardId) {
    console.warn('Card missing ID');
    return;
  }
  
  if (comparisonBarState.selectedCards.has(cardId)) {
    deselectBarCard(card, cardId);
  } else {
    selectBarCard(card, cardId);
  }
  
  updateComparisonBottomBar();
}

function selectBarCard(card, cardId) {
  comparisonBarState.selectedCards.add(cardId);
  
  const cardData = extractBarCardData(card);
  comparisonBarState.selectedData.set(cardId, cardData);
  
  card.classList.add('selected');
  
  const checkIcon = card.querySelector('.rec-card-compare-checkbox i');
  if (checkIcon) {
    checkIcon.style.display = 'block';
  }
  
  if (navigator.vibrate) {
    navigator.vibrate(10);
  }
  
  // Sync with side panel comparison
  if (typeof window.comparisonState !== 'undefined' && window.comparisonState.selectedPlaces) {
    window.comparisonState.selectedPlaces.set(cardId, cardData);
  }
}

function deselectBarCard(card, cardId) {
  comparisonBarState.selectedCards.delete(cardId);
  comparisonBarState.selectedData.delete(cardId);
  
  card.classList.remove('selected');
  
  const checkIcon = card.querySelector('.rec-card-compare-checkbox i');
  if (checkIcon) {
    checkIcon.style.display = 'none';
  }
  
  // Sync with side panel comparison
  if (typeof window.comparisonState !== 'undefined' && window.comparisonState.selectedPlaces) {
    window.comparisonState.selectedPlaces.delete(cardId);
  }
}

function extractBarCardData(card) {
  return {
    id: card.dataset.placeId || card.dataset.name,
    name: card.querySelector('.rec-name')?.textContent || 'Unknown',
    category: card.dataset.category || 'attraction',
    rating: parseFloat(card.querySelector('.rec-rating')?.textContent) || 0,
    distance: parseFloat(card.dataset.distance) || null,
    distanceFromCenter: parseFloat(card.dataset.distance) || null,
    priceLevel: parseInt(card.dataset.priceLevel) || 0,
    lat: parseFloat(card.dataset.lat) || 0,
    lon: parseFloat(card.dataset.lon) || 0,
    address: card.querySelector('.rec-address')?.textContent || '',
    description: card.querySelector('.rec-description')?.textContent || '',
    reasons: Array.from(card.querySelectorAll('.reason-tag')).map(tag => tag.textContent.trim())
  };
}

function updateComparisonBottomBar() {
  const bar = document.getElementById('comparisonBottomBar');
  const numberEl = document.getElementById('comparisonBarNumber');
  
  if (!bar || !numberEl) return;
  
  const count = comparisonBarState.selectedCards.size;
  
  numberEl.textContent = count;
  
  if (count > 0) {
    bar.classList.add('visible');
    bar.setAttribute('aria-hidden', 'false');
  } else {
    bar.classList.remove('visible');
    bar.setAttribute('aria-hidden', 'true');
  }
  
  // Sync with side panel
  if (typeof updateComparisonPanel === 'function') {
    updateComparisonPanel();
  }
}

function handleCompareBarClick() {
  const count = comparisonBarState.selectedCards.size;
  
  if (count === 0) {
    if (typeof showToast === 'function') {
      showToast('Please select places to compare', 'warning');
    }
    return;
  }
  
  if (count === 1) {
    if (typeof showToast === 'function') {
      showToast('Select at least 2 places to compare', 'info');
    }
    return;
  }
  
  // Sync selections
  if (typeof window.comparisonState !== 'undefined' && window.comparisonState.selectedPlaces) {
    window.comparisonState.selectedPlaces.clear();
    comparisonBarState.selectedData.forEach((data, id) => {
      window.comparisonState.selectedPlaces.set(id, data);
    });
  }
  
  // Open panel
  const panel = document.getElementById('comparisonPanel');
  if (panel) {
    panel.classList.add('active');
  }
  
  if (typeof updateComparisonPanel === 'function') {
    updateComparisonPanel();
  }
}

async function handleAddAllBarClick() {
  const count = comparisonBarState.selectedCards.size;
  
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
  const selectedData = Array.from(comparisonBarState.selectedData.values());
  
  for (const placeData of selectedData) {
    try {
      if (typeof addRecommendationToTrip === 'function') {
        await addRecommendationToTrip(placeData);
        successCount++;
      }
    } catch (err) {
      console.error('Failed to add place:', placeData.name, err);
    }
  }
  
  if (successCount > 0) {
    if (typeof showToast === 'function') {
      showToast(`✅ Added ${successCount} place${successCount > 1 ? 's' : ''} to your trip!`, 'success');
    }
    handleClearBarClick();
  } else {
    if (typeof showToast === 'function') {
      showToast('Failed to add places', 'error');
    }
  }
}

function handleClearBarClick() {
  const count = comparisonBarState.selectedCards.size;
  
  if (count > 3) {
    if (!confirm(`Clear ${count} selected places?`)) {
      return;
    }
  }
  
  document.querySelectorAll('.recommendation-card.selected').forEach(card => {
    const cardId = card.dataset.placeId || card.dataset.name;
    if (cardId) {
      deselectBarCard(card, cardId);
    }
  });
  
  comparisonBarState.selectedCards.clear();
  comparisonBarState.selectedData.clear();
  
  // Clear side panel too
  if (typeof window.comparisonState !== 'undefined' && window.comparisonState.selectedPlaces) {
    window.comparisonState.selectedPlaces.clear();
  }
  
  updateComparisonBottomBar();
  
  if (typeof showToast === 'function') {
    showToast('Selection cleared', 'info');
  }
}

// Expose globally
window.comparisonBarState = comparisonBarState;
window.initComparisonBar = initComparisonBar;
window.clearAllBarSelections = handleClearBarClick;

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initComparisonBar);
} else {
  initComparisonBar();
}

console.log('✅ Bottom comparison bar integrated');
