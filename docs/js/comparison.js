//============================================================
// COMPARISON PANEL - DIAGNOSTIC VERSION
// Handles side-by-side comparison of recommended places
//============================================================

console.log('🔍 COMPARISON.JS LOADING...');

// ====================== STATE ======================
window.comparisonState = {
  selectedPlaces: new Set(),
  placesData: new Map(),
  isOpen: false
};

console.log('✅ Comparison state initialized:', window.comparisonState);

// ====================== CREATE PANEL HTML ======================
function createComparisonPanelHTML() {
  console.log('📦 Creating comparison panel HTML...');
  
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

// ====================== CREATE FLOATING BUTTON ======================
function createFloatingCompareButton() {
  console.log('🔘 Creating floating compare button...');
  
  // Check if button already exists
  if (document.getElementById('floatingCompareBtn')) {
    console.log('⚠️ Floating button already exists');
    return;
  }
  
  const buttonHTML = `
    <button class="floating-compare-btn" id="floatingCompareBtn" onclick="openComparisonPanel()" style="display: none;">
      <i class="fas fa-balance-scale"></i>
      <span class="floating-compare-text">Compare</span>
      <span class="floating-compare-count" id="floatingCompareCount">0</span>
    </button>
  `;
  
  document.body.insertAdjacentHTML('beforeend', buttonHTML);
  console.log('✅ Floating compare button created');
  
  // Verify it exists
  const btn = document.getElementById('floatingCompareBtn');
  console.log('🔍 Button element:', btn);
}

// ====================== INITIALIZATION ======================
function initComparisonPanel() {
  console.log('🚀 Initializing comparison panel');
  
  // Create comparison panel HTML if it doesn't exist
  if (!document.querySelector('.comparison-panel')) {
    createComparisonPanelHTML();
  } else {
    console.log('ℹ️ Comparison panel already exists');
  }
  
  // Create floating compare button
  createFloatingCompareButton();
  
  // Attach event listeners
  attachComparisonListeners();
  
  console.log('✅ Comparison panel initialization complete');
}

// ✅ AUTO-INITIALIZE IMMEDIATELY
if (document.readyState === 'loading') {
  console.log('⏳ Waiting for DOM to load...');
  document.addEventListener('DOMContentLoaded', initComparisonPanel);
} else {
  console.log('✅ DOM already loaded, initializing now');
  initComparisonPanel();
}

// ====================== ATTACH LISTENERS ======================
function attachComparisonListeners() {
  console.log('🎧 Attaching comparison listeners...');
  
  // Close on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && window.comparisonState.isOpen) {
      closeComparisonPanel();
    }
  });
  
  console.log('✅ Listeners attached');
}

// ====================== ADD TO COMPARISON ======================
function addToComparison(place) {
  console.log('➕ Adding to comparison:', place.name);
  
  if (!place || !place.name) {
    console.error('❌ Invalid place data:', place);
    return;
  }
  
  // Add to state
  window.comparisonState.selectedPlaces.add(place.name);
  window.comparisonState.placesData.set(place.name, place);
  
  console.log('✅ Added to comparison. Total places:', window.comparisonState.selectedPlaces.size);
  console.log('📊 Selected places:', Array.from(window.comparisonState.selectedPlaces));
  
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
  console.log('➖ Removing from comparison:', placeName);
  
  window.comparisonState.selectedPlaces.delete(placeName);
  window.comparisonState.placesData.delete(placeName);
  
  console.log('✅ Removed. Remaining places:', window.comparisonState.selectedPlaces.size);
  
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

// ====================== UPDATE FLOATING BUTTON ======================
function updateFloatingCompareButton(count) {
  console.log('🔄 Updating floating button. Count:', count);
  
  let floatingBtn = document.getElementById('floatingCompareBtn');
  
  // Create button if it doesn't exist
  if (!floatingBtn) {
    console.warn('⚠️ Floating button not found, creating it...');
    createFloatingCompareButton();
    floatingBtn = document.getElementById('floatingCompareBtn');
  }
  
  const floatingCount = document.getElementById('floatingCompareCount');
  
  if (floatingBtn && floatingCount) {
    floatingCount.textContent = count;
    
    console.log(`📊 Count: ${count}, Should show: ${count >= 2}`);
    
    // Only show when 2 or more places are selected
    if (count >= 2) {
      console.log('✅ SHOWING floating button');
      floatingBtn.style.display = 'flex';
      
      // Add animation
      floatingBtn.classList.add('bounce-in');
      setTimeout(() => floatingBtn.classList.remove('bounce-in'), 600);
      
      // Log computed styles for debugging
      const computedStyle = window.getComputedStyle(floatingBtn);
      console.log('🎨 Button styles:', {
        display: computedStyle.display,
        position: computedStyle.position,
        bottom: computedStyle.bottom,
        right: computedStyle.right,
        zIndex: computedStyle.zIndex,
        visibility: computedStyle.visibility
      });
    } else {
      console.log('❌ HIDING floating button');
      floatingBtn.style.display = 'none';
    }
  } else {
    console.error('❌ Floating button or count element not found!');
    console.log('Button:', floatingBtn);
    console.log('Count element:', floatingCount);
  }
}

// ====================== UPDATE COMPARISON PANEL ======================
function updateComparisonPanel() {
  const count = window.comparisonState.selectedPlaces.size;
  
  console.log('🔄 updateComparisonPanel called. Count:', count);
  
  const countBadge = document.getElementById('comparisonCount');
  const body = document.getElementById('comparisonBody');
  const compareBtn = document.getElementById('compareBtn');
  const compareBadge = document.getElementById('compareCountBadge');
  
  // Update count badges
  if (countBadge) countBadge.textContent = count;
  if (compareBadge) compareBadge.textContent = count;
  
  // Show/hide header compare button (if it exists)
  if (compareBtn) {
    compareBtn.style.display = count >= 2 ? 'inline-flex' : 'none';
    console.log('📊 Header button display:', compareBtn.style.display);
  }
  
  // Update floating comparison button
  updateFloatingCompareButton(count);
  
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
    const maxValue = Math.max(...places.map(p => {
      if (type === 'rating') return p.rating || 0;
      return p.recommendationScore || 0;
    }));
    return value === maxValue;
  } else if (type === 'distance') {
    const minValue = Math.min(...places.map(p => p.distanceFromCenter || Infinity));
    return value === minValue;
  }
  
  return false;
}

// ====================== OPEN/CLOSE PANEL ======================
function openComparisonPanel() {
  console.log('📊 Opening comparison panel...');
  
  const panel = document.getElementById('comparisonPanel');
  const overlay = document.getElementById('comparisonOverlay');
  
  if (panel && overlay) {
    panel.classList.add('active');
    overlay.classList.add('active');
    window.comparisonState.isOpen = true;
    document.body.style.overflow = 'hidden';
    
    console.log('✅ Comparison panel opened');
  } else {
    console.error('❌ Comparison panel or overlay not found!');
    console.log('Attempting to create panel...');
    createComparisonPanelHTML();
    setTimeout(openComparisonPanel, 100);
  }
}

window.openComparisonPanel = openComparisonPanel;

function closeComparisonPanel() {
  console.log('📊 Closing comparison panel...');
  
  const panel = document.getElementById('comparisonPanel');
  const overlay = document.getElementById('comparisonOverlay');
  
  if (panel && overlay) {
    panel.classList.remove('active');
    overlay.classList.remove('active');
    window.comparisonState.isOpen = false;
    document.body.style.overflow = '';
    
    console.log('✅ Comparison panel closed');
  }
}

window.closeComparisonPanel = closeComparisonPanel;

// ====================== CLEAR ALL ======================
function clearAllComparisons() {
  console.log('🗑️ Clearing all comparisons...');
  
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
  
  console.log('✅ All comparisons cleared');
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
  
  if (typeof showRecommendationDetails === 'function') {
    showRecommendationDetails(place);
  } else {
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

// ====================== CHECKBOX CLICK HANDLER ======================
window.handleCompareCheckboxClick = function(rec, card) {
  console.log('🖱️ Checkbox clicked for:', rec.name);
  console.log('📦 Place data:', rec);
  
  const checkIcon = card.querySelector('.rec-card-compare-checkbox i');
  
  if (card.classList.contains('comparing')) {
    // Remove from comparison
    console.log('➖ Removing from comparison');
    card.classList.remove('comparing');
    if (checkIcon) checkIcon.style.display = 'none';
    removeFromComparison(rec.name);
  } else {
    // Add to comparison
    console.log('➕ Adding to comparison');
    card.classList.add('comparing');
    if (checkIcon) checkIcon.style.display = 'block';
    addToComparison(rec);
  }
};

console.log('✅ comparison.js fully loaded');
console.log('✅ window.handleCompareCheckboxClick available:', typeof window.handleCompareCheckboxClick);
console.log('✅ window.comparisonState:', window.comparisonState);
