// Stores currently selected places for comparison
let comparisonState = {
  selectedPlaces: [],
  maxSelection: 3
};

// ===================== Init =====================
// Call this once when recommendations page loads
function initComparison() {
  renderComparisonUI();
  attachComparisonListeners();
}

// ===================== UI Rendering =====================
// Injects comparison button, overlay, and drawer into DOM
function renderComparisonUI() {
  const html = `
    <!-- Floating Compare Button -->
    <button class="compare-float-btn" id="compareFloatBtn">
      <span class="compare-count-badge" id="compareCountBadge">0</span>
      <span>Compare Places</span>
    </button>

    <!-- Overlay -->
    <div class="comparison-overlay" id="comparisonOverlay"></div>

    <!-- Drawer -->
    <div class="comparison-drawer" id="comparisonDrawer">
      <div class="comparison-header">
        <h3>
          <i class="fas fa-balance-scale"></i>
          Compare Places
        </h3>
        <button class="comparison-close-btn" id="comparisonCloseBtn">&times;</button>
      </div>

      <div class="comparison-body" id="comparisonBody"></div>

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

// ===================== Event Binding =====================
function attachComparisonListeners() {
  document.getElementById('compareFloatBtn')
    ?.addEventListener('click', openComparison);

  document.getElementById('comparisonOverlay')
    ?.addEventListener('click', closeComparison);

  document.getElementById('comparisonCloseBtn')
    ?.addEventListener('click', closeComparison);

  document.getElementById('comparisonAddAllBtn')
    ?.addEventListener('click', addAllToTrip);
}

// ===================== Selection Logic =====================
// Adds or removes a place from comparison list
function toggleCompareSelection(place, cardElement) {
  const index = comparisonState.selectedPlaces.findIndex(
    p => p.name === place.name
  );

  // Remove if already selected
  if (index > -1) {
    comparisonState.selectedPlaces.splice(index, 1);
    cardElement.classList.remove('comparing');
    updateCompareCheckbox(cardElement, false);
  } 
  // Add new place (respect max limit)
  else {
    if (comparisonState.selectedPlaces.length >= comparisonState.maxSelection) {
      showToast(
        `You can compare up to ${comparisonState.maxSelection} places`,
        'warning'
      );
      return;
    }

    comparisonState.selectedPlaces.push(place);
    cardElement.classList.add('comparing');
    updateCompareCheckbox(cardElement, true);
  }

  updateCompareButton();
}

// Updates checkbox UI inside recommendation card
function updateCompareCheckbox(card, checked) {
  const checkbox = card.querySelector('.rec-card-compare-checkbox');
  if (!checkbox) return;

  checkbox.classList.toggle('checked', checked);
  checkbox.innerHTML = checked ? '<i class="fas fa-check"></i>' : '';
}

// ===================== Floating Button =====================
// Updates count badge and visibility
function updateCompareButton() {
  const btn = document.getElementById('compareFloatBtn');
  const badge = document.getElementById('compareCountBadge');
  if (!btn || !badge) return;

  const count = comparisonState.selectedPlaces.length;
  badge.textContent = count;

  // Only show button when comparison makes sense
  btn.classList.toggle('show', count >= 2);
}

// ===================== Drawer Control =====================
function openComparison() {
  if (comparisonState.selectedPlaces.length < 2) {
    showToast('Select at least 2 places to compare', 'info');
    return;
  }

  renderComparisonTable();
  document.getElementById('comparisonOverlay')?.classList.add('active');
  document.getElementById('comparisonDrawer')?.classList.add('active');
}

function closeComparison() {
  document.getElementById('comparisonOverlay')?.classList.remove('active');
  document.getElementById('comparisonDrawer')?.classList.remove('active');
}

// ===================== Comparison Table =====================
// Builds comparison table based on selected places
function renderComparisonTable() {
  const body = document.getElementById('comparisonBody');
  if (!body) return;

  const places = comparisonState.selectedPlaces;

  // Pre-calc best values for highlighting
  const maxRating = Math.max(...places.map(p => p.rating || 0));
  const minDistance = Math.min(...places.map(p => p.distanceFromCenter || Infinity));
  const maxScore = Math.max(...places.map(p => p.recommendationScore || 0));

  body.innerHTML = `
    <table class="comparison-table">
      <thead>
        <tr>
          <th>Feature</th>
          ${places.map(p => `<th>${escapeHtml(p.name)}</th>`).join('')}
        </tr>
      </thead>

      <tbody>
        <tr>
          <td>Category</td>
          ${places.map(p => `
            <td>
              <i class="fas fa-${getCategoryIcon(p.category)}"></i>
              ${escapeHtml(p.category)}
            </td>
          `).join('')}
        </tr>

        <tr>
          <td>Rating</td>
          ${places.map(p => `
            <td class="${p.rating === maxRating ? 'comparison-better' : ''}">
              ⭐ ${p.rating.toFixed(1)}
            </td>
          `).join('')}
        </tr>

        <tr>
          <td>Distance</td>
          ${places.map(p => `
            <td class="${p.distanceFromCenter === minDistance ? 'comparison-better' : ''}">
              ${p.distanceFromCenter.toFixed(1)} km
            </td>
          `).join('')}
        </tr>

        <tr>
          <td>Price</td>
          ${places.map(p => `
            <td>${'$'.repeat(p.priceLevel || 2)}</td>
          `).join('')}
        </tr>

        <tr>
          <td>Score</td>
          ${places.map(p => `
            <td class="${p.recommendationScore === maxScore ? 'comparison-better' : ''}">
              <strong>${p.recommendationScore.toFixed(1)}</strong> / 10
            </td>
          `).join('')}
        </tr>

        <tr>
          <td>Why Recommended</td>
          ${places.map(p => `
            <td>
              ${(p.reasons || []).slice(0, 2).map(r => `
                <div class="comparison-reason-tag">
                  <i class="fas fa-check-circle"></i>
                  ${escapeHtml(r)}
                </div>
              `).join('')}
            </td>
          `).join('')}
        </tr>

        <tr>
          <td>Address</td>
          ${places.map(p => `
            <td class="muted-text">
              ${escapeHtml(p.address || 'Not available')}
            </td>
          `).join('')}
        </tr>

        <tr>
          <td>Action</td>
          ${places.map(p => `
            <td>
              <button class="comparison-add-btn"
                onclick="addSingleFromComparison('${escapeHtml(p.name)}')">
                <i class="fas fa-plus"></i>
                Add to Trip
              </button>
            </td>
          `).join('')}
        </tr>
      </tbody>
    </table>
  `;
}

// ===================== Actions =====================
// Add a single place from comparison
window.addSingleFromComparison = async function (placeName) {
  const place = comparisonState.selectedPlaces.find(p => p.name === placeName);
  if (!place) return;

  try {
    await addRecommendationToTrip(place);

    // Remove from comparison list
    comparisonState.selectedPlaces =
      comparisonState.selectedPlaces.filter(p => p.name !== placeName);

    updateCompareButton();

    comparisonState.selectedPlaces.length < 2
      ? closeComparison()
      : renderComparisonTable();

    syncComparisonCards(placeName);
  } catch (err) {
    console.error('Failed to add place:', err);
  }
};

// Add all compared places to trip
async function addAllToTrip() {
  const btn = document.getElementById('comparisonAddAllBtn');
  if (!btn) return;

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';

  let added = 0;
  for (const place of comparisonState.selectedPlaces) {
    try {
      await addRecommendationToTrip(place);
      added++;
    } catch (err) {
      console.error('Add failed:', err);
    }
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-plus"></i> Add All to Trip';

  if (added > 0) {
    showToast(`Added ${added} place(s) to your trip`, 'success');
    clearComparisonSelections();

    if (typeof loadRecommendations === 'function') await loadRecommendations();
    if (typeof loadPlaces === 'function') await loadPlaces();
  }
}

// ===================== Cleanup =====================
// Clears selection state and resets UI
function clearComparisonSelections() {
  comparisonState.selectedPlaces = [];
  updateCompareButton();

  document.querySelectorAll('.recommendation-card.comparing')
    .forEach(card => {
      card.classList.remove('comparing');
      updateCompareCheckbox(card, false);
    });
}

// Sync card UI when place is added from comparison
function syncComparisonCards(placeName) {
  document.querySelectorAll('.recommendation-card').forEach(card => {
    const name = card.querySelector('.rec-title h3')?.textContent;
    if (name === placeName) {
      card.classList.remove('comparing');
      updateCompareCheckbox(card, false);
    }
  });
}