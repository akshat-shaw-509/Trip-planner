// js/comparison.js - Comparison Drawer Logic

let comparisonState = {
  selectedPlaces: [],
  maxSelection: 3
};

/**
 * Initialize comparison system
 */
function initComparison() {
  renderComparisonUI();
  attachComparisonListeners();
}

/**
 * Render comparison UI (drawer + floating button)
 */
function renderComparisonUI() {
  const html = `
    <!-- Comparison Floating Button -->
    <button class="compare-float-btn" id="compareFloatBtn">
      <span class="compare-count-badge" id="compareCountBadge">0</span>
      <span>Compare Places</span>
    </button>

    <!-- Comparison Overlay -->
    <div class="comparison-overlay" id="comparisonOverlay"></div>

    <!-- Comparison Drawer -->
    <div class="comparison-drawer" id="comparisonDrawer">
      <div class="comparison-header">
        <h3>
          <i class="fas fa-balance-scale"></i>
          Compare Places
        </h3>
        <button class="comparison-close-btn" id="comparisonCloseBtn">&times;</button>
      </div>
      <div class="comparison-body" id="comparisonBody">
        <!-- Comparison table will be inserted here -->
      </div>
      <div class="comparison-footer">
        <button class="btn-cancel" onclick="closeComparison()">Close</button>
        <button class="comparison-add-btn" id="comparisonAddAllBtn">
          <i class="fas fa-plus"></i>
          Add All to Trip
        </button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);
}

/**
 * Attach comparison event listeners
 */
function attachComparisonListeners() {
  const floatBtn = document.getElementById('compareFloatBtn');
  const overlay = document.getElementById('comparisonOverlay');
  const closeBtn = document.getElementById('comparisonCloseBtn');
  const addAllBtn = document.getElementById('comparisonAddAllBtn');

  if (floatBtn) {
    floatBtn.addEventListener('click', openComparison);
  }

  if (overlay) {
    overlay.addEventListener('click', closeComparison);
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', closeComparison);
  }

  if (addAllBtn) {
    addAllBtn.addEventListener('click', addAllToTrip);
  }
}

/**
 * Toggle place selection for comparison
 */
function toggleCompareSelection(place, cardElement) {
  const index = comparisonState.selectedPlaces.findIndex(p => p.name === place.name);

  if (index > -1) {
    // Deselect
    comparisonState.selectedPlaces.splice(index, 1);
    cardElement.classList.remove('comparing');
    const checkbox = cardElement.querySelector('.rec-card-compare-checkbox');
    if (checkbox) {
      checkbox.classList.remove('checked');
      checkbox.innerHTML = '';
    }
  } else {
    // Select
    if (comparisonState.selectedPlaces.length >= comparisonState.maxSelection) {
      showToast(`You can only compare up to ${comparisonState.maxSelection} places`, 'warning');
      return;
    }

    comparisonState.selectedPlaces.push(place);
    cardElement.classList.add('comparing');
    const checkbox = cardElement.querySelector('.rec-card-compare-checkbox');
    if (checkbox) {
      checkbox.classList.add('checked');
      checkbox.innerHTML = '<i class="fas fa-check"></i>';
    }
  }

  updateCompareButton();
}

/**
 * Update floating compare button
 */
function updateCompareButton() {
  const btn = document.getElementById('compareFloatBtn');
  const badge = document.getElementById('compareCountBadge');

  if (!btn || !badge) return;

  const count = comparisonState.selectedPlaces.length;
  badge.textContent = count;

  if (count >= 2) {
    btn.classList.add('show');
  } else {
    btn.classList.remove('show');
  }
}

/**
 * Open comparison drawer
 */
function openComparison() {
  if (comparisonState.selectedPlaces.length < 2) {
    showToast('Select at least 2 places to compare', 'info');
    return;
  }

  renderComparisonTable();

  const overlay = document.getElementById('comparisonOverlay');
  const drawer = document.getElementById('comparisonDrawer');

  if (overlay && drawer) {
    overlay.classList.add('active');
    drawer.classList.add('active');
  }
}

/**
 * Close comparison drawer
 */
function closeComparison() {
  const overlay = document.getElementById('comparisonOverlay');
  const drawer = document.getElementById('comparisonDrawer');

  if (overlay && drawer) {
    overlay.classList.remove('active');
    drawer.classList.remove('active');
  }
}

/**
 * Render comparison table
 */
function renderComparisonTable() {
  const body = document.getElementById('comparisonBody');
  if (!body) return;

  const places = comparisonState.selectedPlaces;

  const tableHTML = `
    <table class="comparison-table">
      <thead>
        <tr>
          <th>Feature</th>
          ${places.map(p => `<th>${escapeHtml(p.name)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        <!-- Category -->
        <tr>
          <td>Category</td>
          ${places.map(p => `
            <td>
              <div class="comparison-place-category">
                <i class="fas fa-${getCategoryIcon(p.category)}"></i>
                ${escapeHtml(p.category)}
              </div>
            </td>
          `).join('')}
        </tr>

        <!-- Rating -->
        <tr>
          <td>Rating</td>
          ${places.map(p => {
            const isBest = p.rating === Math.max(...places.map(pl => pl.rating));
            return `
              <td>
                <div class="comparison-rating ${isBest ? 'comparison-better' : ''}">
                  <i class="fas fa-star"></i>
                  ${p.rating.toFixed(1)}
                </div>
              </td>
            `;
          }).join('')}
        </tr>

        <!-- Distance -->
        <tr>
          <td>Distance</td>
          ${places.map(p => {
            const isClosest = p.distanceFromCenter === Math.min(...places.map(pl => pl.distanceFromCenter));
            return `
              <td>
                <div class="comparison-distance ${isClosest ? 'comparison-better' : ''}">
                  ${p.distanceFromCenter.toFixed(1)} km
                </div>
              </td>
            `;
          }).join('')}
        </tr>

        <!-- Price Level -->
        <tr>
          <td>Price Level</td>
          ${places.map(p => `
            <td>
              <div class="comparison-price">
                ${'$'.repeat(p.priceLevel || 2)}
              </div>
            </td>
          `).join('')}
        </tr>

        <!-- Recommendation Score -->
        <tr>
          <td>Recommendation Score</td>
          ${places.map(p => {
            const isBest = p.recommendationScore === Math.max(...places.map(pl => pl.recommendationScore));
            return `
              <td>
                <div class="${isBest ? 'comparison-better' : ''}">
                  <strong>${p.recommendationScore.toFixed(1)}</strong> / 10
                </div>
              </td>
            `;
          }).join('')}
        </tr>

        <!-- Why Recommended -->
        <tr>
          <td>Why Recommended</td>
          ${places.map(p => `
            <td>
              <div class="comparison-reasons">
                ${p.reasons.slice(0, 2).map(reason => `
                  <div class="comparison-reason-tag">
                    <i class="fas fa-check-circle"></i>
                    ${escapeHtml(reason)}
                  </div>
                `).join('')}
              </div>
            </td>
          `).join('')}
        </tr>

        <!-- Address -->
        <tr>
          <td>Address</td>
          ${places.map(p => `
            <td>
              <div style="font-size: 13px; color: #6b7280;">
                ${escapeHtml(p.address || 'Not available')}
              </div>
            </td>
          `).join('')}
        </tr>

        <!-- Action Buttons -->
        <tr>
          <td>Action</td>
          ${places.map(p => `
            <td>
              <button class="comparison-add-btn" onclick="addSingleFromComparison('${escapeHtml(p.name)}')">
                <i class="fas fa-plus"></i>
                Add to Trip
              </button>
            </td>
          `).join('')}
        </tr>
      </tbody>
    </table>
  `;

  body.innerHTML = tableHTML;
}

/**
 * Add single place from comparison
 */
window.addSingleFromComparison = async function(placeName) {
  const place = comparisonState.selectedPlaces.find(p => p.name === placeName);
  if (!place) return;

  try {
    await addRecommendationToTrip(place);
    
    // Remove from comparison
    comparisonState.selectedPlaces = comparisonState.selectedPlaces.filter(p => p.name !== placeName);
    
    if (comparisonState.selectedPlaces.length < 2) {
      closeComparison();
    } else {
      renderComparisonTable();
    }
    
    updateCompareButton();
    
    // Update card UI
    const cards = document.querySelectorAll('.recommendation-card');
    cards.forEach(card => {
      const cardName = card.querySelector('.rec-title h3')?.textContent;
      if (cardName === placeName) {
        card.classList.remove('comparing');
        const checkbox = card.querySelector('.rec-card-compare-checkbox');
        if (checkbox) {
          checkbox.classList.remove('checked');
          checkbox.innerHTML = '';
        }
      }
    });
  } catch (err) {
    console.error('Error adding place:', err);
  }
};

/**
 * Add all compared places to trip
 */
async function addAllToTrip() {
  const btn = document.getElementById('comparisonAddAllBtn');
  if (!btn) return;

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';

  let addedCount = 0;
  for (const place of comparisonState.selectedPlaces) {
    try {
      await addRecommendationToTrip(place);
      addedCount++;
    } catch (err) {
      console.error('Error adding place:', err);
    }
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-plus"></i> Add All to Trip';

  if (addedCount > 0) {
    showToast(`Added ${addedCount} place(s) to your trip!`, 'success');
    
    // Clear comparison
    comparisonState.selectedPlaces = [];
    updateCompareButton();
    closeComparison();
    
    // Clear all comparing states
    document.querySelectorAll('.recommendation-card.comparing').forEach(card => {
      card.classList.remove('comparing');
      const checkbox = card.querySelector('.rec-card-compare-checkbox');
      if (checkbox) {
        checkbox.classList.remove('checked');
        checkbox.innerHTML = '';
      }
    });
    
    // Reload recommendations and places
    if (typeof loadRecommendations === 'function') {
      await loadRecommendations();
    }
    if (typeof loadPlaces === 'function') {
      await loadPlaces();
    }
  }
}

/**
 * Clear comparison selections
 */
function clearComparisonSelections() {
  comparisonState.selectedPlaces = [];
  updateCompareButton();
  
  document.querySelectorAll('.recommendation-card.comparing').forEach(card => {
    card.classList.remove('comparing');
    const checkbox = card.querySelector('.rec-card-compare-checkbox');
    if (checkbox) {
      checkbox.classList.remove('checked');
      checkbox.innerHTML = '';
    }
  });
}