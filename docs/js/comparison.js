//============================================================
// COMPARISON PANEL - FIXED VERSION
// Handles side-by-side comparison of recommended places
//============================================================

// ====================== STATE ======================
window.comparisonState = {
  selectedPlaces: new Set(),
  placesData: new Map(),
  isOpen: false
};

// ====================== INITIALIZATION ======================
function initComparisonPanel() {
  console.log('🔄 Initializing comparison panel');
  
  // Create comparison panel HTML if it doesn't exist
  if (!document.querySelector('.comparison-panel')) {
    createComparisonPanelHTML();
  }
  
  // Attach event listeners
  attachComparisonListeners();
}

// ✅ AUTO-INITIALIZE IMMEDIATELY (not on DOMContentLoaded)
// This ensures the panel exists when recommendation cards are created
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initComparisonPanel);
} else {
  // DOM already loaded, init immediately
  initComparisonPanel();
}

// ====================== CREATE PANEL HTML ======================
function createComparisonPanelHTML() {
  const panelHTML = `
    <!-- Comparison Overlay -->
    <div class="comparison-overlay" id="comparisonOverlay" onclick="closeComparisonPanel()"></div>
    
    <!-- Comparison Panel -->
    <div class="comparison-panel" id="comparisonPanel">
      <div class="comparison-header">
        <h3>
          <i class="fas fa-balance-scale"></i>
          Compare Places
          <span class="comparison-count" id="comparisonCount">0</span>
        </h3>
        <button class="comparison-close" onclick="closeComparisonPanel()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="comparison-body" id="comparisonBody">
        <div class="comparison-empty">
          <i class="fas fa-balance-scale"></i>
          <p>Select places from recommendations to compare them side by side</p>
        </div>
      </div>
      
      <div class="comparison-footer">
        <button class="comparison-clear-all" onclick="clearAllComparisons()">
          <i class="fas fa-trash"></i> Clear All
        </button>
        <button class="comparison-add-all" onclick="addAllToTrip()">
          <i class="fas fa-plus"></i> Add All to Trip
        </button>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', panelHTML);
  console.log('✅ Comparison panel HTML created');
}

// ====================== ATTACH LISTENERS ======================
function attachComparisonListeners() {
  // Close on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && window.comparisonState.isOpen) {
      closeComparisonPanel();
    }
  });
}

// ====================== ADD TO COMPARISON ======================
function addToComparison(place) {
  if (!place || !place.name) {
    console.error('Invalid place data');
    return;
  }
  
  // Add to state
  window.comparisonState.selectedPlaces.add(place.name);
  window.comparisonState.placesData.set(place.name, place);
  
  console.log(`✅ Added ${place.name} to comparison`);
  
  // Update UI
  updateComparisonPanel();
  
  // Show toast
  if (typeof showToast === 'function') {
    showToast(`Added ${place.name} to comparison`, 'success');
  }
}

window.addToComparison = addToComparison;

// ====================== REMOVE FROM COMPARISON ======================
function removeFromComparison(placeName) {
  window.comparisonState.selectedPlaces.delete(placeName);
  window.comparisonState.placesData.delete(placeName);
  
  console.log(`❌ Removed ${placeName} from comparison`);
  
  // Update UI
  updateComparisonPanel();
  
  // Update card checkbox
  const card = document.querySelector(`.recommendation-card[data-name="${placeName}"]`);
  if (card) {
    card.classList.remove('comparing');
    const checkbox = card.querySelector('.rec-card-compare-checkbox i');
    if (checkbox) checkbox.style.display = 'none';
  }
  
  // Show toast
  if (typeof showToast === 'function') {
    showToast(`Removed from comparison`, 'info');
  }
}

window.removeFromComparison = removeFromComparison;

// ====================== UPDATE COMPARISON PANEL ======================
function updateComparisonPanel() {
  const count = window.comparisonState.selectedPlaces.size;
  const countBadge = document.getElementById('comparisonCount');
  const body = document.getElementById('comparisonBody');
  const compareBtn = document.getElementById('compareBtn');
  const compareBadge = document.getElementById('compareCountBadge');
  
  // Update count badges
  if (countBadge) countBadge.textContent = count;
  if (compareBadge) compareBadge.textContent = count;
  
  // Show/hide compare button
  if (compareBtn) {
    compareBtn.style.display = count > 0 ? 'inline-flex' : 'none';
  }
  
  // Update panel content
  if (body) {
    if (count === 0) {
      body.innerHTML = `
        <div class="comparison-empty">
          <i class="fas fa-balance-scale"></i>
          <p>Select places from recommendations to compare them side by side</p>
        </div>
      `;
    } else {
      body.innerHTML = '<div class="comparison-grid"></div>';
      const grid = body.querySelector('.comparison-grid');
      
      window.comparisonState.selectedPlaces.forEach(placeName => {
        const place = window.comparisonState.placesData.get(placeName);
        if (place) {
          grid.innerHTML += createComparisonCard(place);
        }
      });
    }
  }
}

window.updateComparisonPanel = updateComparisonPanel;

// ====================== CREATE COMPARISON CARD ======================
function createComparisonCard(place) {
  const icon = getCategoryIcon(place.category);
  
  return `
    <div class="comparison-item">
      <div class="comparison-item-header">
        <div>
          <div class="comparison-item-name">${escapeHtml(place.name)}</div>
          <span class="comparison-item-category">
            <i class="fas fa-${icon}"></i>
            ${escapeHtml(place.category)}
          </span>
        </div>
        <button class="comparison-remove" onclick="removeFromComparison('${escapeHtml(place.name).replace(/'/g, "\\'")}')">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="comparison-stats">
        <div class="comparison-stat">
          <span class="comparison-stat-label">
            <i class="fas fa-star"></i>
            Rating
          </span>
          <span class="comparison-stat-value ${getBestValue('rating', place.rating) ? 'highlight' : ''}">
            ${(place.rating || 0).toFixed(1)}
          </span>
        </div>
        
        ${place.distanceFromCenter ? `
          <div class="comparison-stat">
            <span class="comparison-stat-label">
              <i class="fas fa-map-marker-alt"></i>
              Distance
            </span>
            <span class="comparison-stat-value ${getBestValue('distance', place.distanceFromCenter) ? 'highlight' : ''}">
              ${place.distanceFromCenter.toFixed(1)} km
            </span>
          </div>
        ` : ''}
        
        ${place.priceLevel ? `
          <div class="comparison-stat">
            <span class="comparison-stat-label">
              <i class="fas fa-dollar-sign"></i>
              Price Level
            </span>
            <span class="comparison-stat-value">
              ${'$'.repeat(place.priceLevel)}
            </span>
          </div>
        ` : ''}
        
        ${place.recommendationScore ? `
          <div class="comparison-stat">
            <span class="comparison-stat-label">
              <i class="fas fa-chart-line"></i>
              AI Score
            </span>
            <span class="comparison-stat-value ${getBestValue('score', place.recommendationScore) ? 'highlight' : ''}">
              ${place.recommendationScore.toFixed(1)}
            </span>
          </div>
        ` : ''}
      </div>
      
      <div class="comparison-actions">
        <button class="comparison-btn-add" onclick="addSinglePlaceToTrip('${escapeHtml(place.name).replace(/'/g, "\\'")}')">
          <i class="fas fa-plus"></i> Add to Trip
        </button>
        <button class="comparison-btn-details" onclick="showPlaceDetails('${escapeHtml(place.name).replace(/'/g, "\\'")}')">
          <i class="fas fa-info-circle"></i> Details
        </button>
      </div>
    </div>
  `;
}

// ====================== DETERMINE BEST VALUES ======================
function getBestValue(type, value) {
  const places = Array.from(window.comparisonState.placesData.values());
  
  if (places.length < 2) return false;
  
  if (type === 'rating' || type === 'score') {
    // Higher is better
    const maxValue = Math.max(...places.map(p => {
      if (type === 'rating') return p.rating || 0;
      return p.recommendationScore || 0;
    }));
    return value === maxValue;
  } else if (type === 'distance') {
    // Lower is better
    const minValue = Math.min(...places.map(p => p.distanceFromCenter || Infinity));
    return value === minValue;
  }
  
  return false;
}

// ====================== OPEN/CLOSE PANEL ======================
function openComparisonPanel() {
  const panel = document.getElementById('comparisonPanel');
  const overlay = document.getElementById('comparisonOverlay');
  
  if (panel && overlay) {
    panel.classList.add('active');
    overlay.classList.add('active');
    window.comparisonState.isOpen = true;
    document.body.style.overflow = 'hidden';
    
    console.log('📊 Comparison panel opened');
  } else {
    console.error('❌ Comparison panel or overlay not found!');
    console.log('Attempting to create panel...');
    createComparisonPanelHTML();
    // Try again
    setTimeout(openComparisonPanel, 100);
  }
}

window.openComparisonPanel = openComparisonPanel;

function closeComparisonPanel() {
  const panel = document.getElementById('comparisonPanel');
  const overlay = document.getElementById('comparisonOverlay');
  
  if (panel && overlay) {
    panel.classList.remove('active');
    overlay.classList.remove('active');
    window.comparisonState.isOpen = false;
    document.body.style.overflow = '';
    
    console.log('📊 Comparison panel closed');
  }
}

window.closeComparisonPanel = closeComparisonPanel;

// ====================== CLEAR ALL ======================
function clearAllComparisons() {
  // Remove comparing class from all cards
  document.querySelectorAll('.recommendation-card.comparing').forEach(card => {
    card.classList.remove('comparing');
    const checkbox = card.querySelector('.rec-card-compare-checkbox i');
    if (checkbox) checkbox.style.display = 'none';
  });
  
  // Clear state
  window.comparisonState.selectedPlaces.clear();
  window.comparisonState.placesData.clear();
  
  // Update UI
  updateComparisonPanel();
  
  if (typeof showToast === 'function') {
    showToast('Comparison cleared', 'info');
  }
  
  console.log('🗑️ All comparisons cleared');
}

window.clearAllComparisons = clearAllComparisons;

// ====================== ADD ALL TO TRIP ======================
async function addAllToTrip() {
  const places = Array.from(window.comparisonState.placesData.values());
  
  if (places.length === 0) {
    if (typeof showToast === 'function') {
      showToast('No places to add', 'warning');
    }
    return;
  }
  
  if (typeof showToast === 'function') {
    showToast(`Adding ${places.length} place(s)...`, 'info');
  }
  
  let successCount = 0;
  
  for (const place of places) {
    try {
      if (typeof addRecommendationToTrip === 'function') {
        await addRecommendationToTrip(place);
        successCount++;
      }
    } catch (err) {
      console.error('Error adding place:', err);
    }
  }
  
  if (successCount > 0) {
    if (typeof showToast === 'function') {
      showToast(`✅ Added ${successCount} place(s) to your trip!`, 'success');
    }
    
    // Clear comparison after adding
    clearAllComparisons();
    closeComparisonPanel();
  }
}

window.addAllToTrip = addAllToTrip;

// ====================== ADD SINGLE PLACE TO TRIP ======================
async function addSinglePlaceToTrip(placeName) {
  const place = window.comparisonState.placesData.get(placeName);
  
  if (!place) {
    console.error('Place not found:', placeName);
    return;
  }
  
  try {
    if (typeof addRecommendationToTrip === 'function') {
      await addRecommendationToTrip(place);
      
      // Remove from comparison
      removeFromComparison(placeName);
      
      if (typeof showToast === 'function') {
        showToast(`✅ Added ${placeName} to your trip!`, 'success');
      }
    }
  } catch (err) {
    console.error('Error adding place:', err);
    if (typeof showToast === 'function') {
      showToast('Failed to add place', 'error');
    }
  }
}

window.addSinglePlaceToTrip = addSinglePlaceToTrip;

// ====================== SHOW PLACE DETAILS ======================
function showPlaceDetails(placeName) {
  const place = window.comparisonState.placesData.get(placeName);
  
  if (!place) {
    console.error('Place not found:', placeName);
    return;
  }
  
  // Use the existing recommendation details modal if available
  if (typeof showRecommendationDetails === 'function') {
    showRecommendationDetails(place);
  } else {
    // Fallback: simple alert
    alert(`${place.name}\n\nCategory: ${place.category}\nRating: ${place.rating || 'N/A'}\n${place.description || ''}`);
  }
}

window.showPlaceDetails = showPlaceDetails;

// ====================== UTILITY FUNCTIONS ======================
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

// ====================== INTEGRATION WITH RECOMMENDATION CARDS ======================
// ✅ THIS IS THE KEY FUNCTION - Make it available immediately
window.handleCompareCheckboxClick = function(rec, card) {
  console.log('📊 handleCompareCheckboxClick called for:', rec.name);
  
  const checkIcon = card.querySelector('.rec-card-compare-checkbox i');
  
  if (card.classList.contains('comparing')) {
    // Remove from comparison
    card.classList.remove('comparing');
    if (checkIcon) checkIcon.style.display = 'none';
    removeFromComparison(rec.name);
  } else {
    // Add to comparison
    card.classList.add('comparing');
    if (checkIcon) checkIcon.style.display = 'block';
    addToComparison(rec);
  }
};

console.log('✅ comparison.js loaded and initialized');
console.log('✅ window.handleCompareCheckboxClick is available:', typeof window.handleCompareCheckboxClick);
