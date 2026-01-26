// ===================== STATE =====================
let recommendationsState = {
  currentTripId: null,
  tripData: null,
  recommendations: [],
  userPreferences: null,
  isLoading: false
};

// ===================== INITIALIZATION =====================
async function initRecommendations(tripId, tripData) { 
  recommendationsState.currentTripId = tripId;
  recommendationsState.tripData = tripData;  
  
  console.log('initRecommendations called with:', { tripId, tripData });
  
  // Initialize trip center selector with trip data
  if (typeof initTripCenterSelector === 'function' && tripData) {
    await initTripCenterSelector(tripData);
  }
  
  await loadRecommendations();
}

// ===================== LOAD RECOMMENDATIONS =====================
async function loadRecommendations(options = {}) {
  try {
    recommendationsState.isLoading = true;
    showRecommendationsLoading();

    const res = await apiService.recommendations.getForTrip(
      recommendationsState.currentTripId,
      options
    );

    const responseData = res.data || {};

    // Normalize backend response
    recommendationsState.recommendations = Array.isArray(responseData)
      ? responseData
      : responseData.places || [];

    console.log(
      'Loaded recommendations:',
      recommendationsState.recommendations.length
    );

    displayRecommendations();
  } catch (err) {
    console.error('Error loading recommendations:', err);
    showRecommendationsError();
  } finally {
    recommendationsState.isLoading = false;
  }
}

// ===================== LOAD USER PREFERENCES =====================
async function loadUserPreferences() {
  try {
    const res = await apiService.preferences.get();
    recommendationsState.userPreferences = res.data;
    return res.data;
  } catch (err) {
    console.error('Error loading preferences:', err);
    showToast('Failed to load preferences', 'error');
    return null;
  }
}

// ===================== DISPLAY RECOMMENDATIONS =====================
function displayRecommendations() {
  const container = document.getElementById('recommendationsGrid');
  if (!container) return;

  const recs = recommendationsState.recommendations;

  if (recs.length === 0) {
    container.innerHTML = `
      <div class="recommendations-empty">
        <i class="fas fa-compass"></i>
        <h3>No recommendations yet</h3>
        <p>Try another category or add more places</p>
      </div>
    `;
    return;
  }

  container.innerHTML = recs.map(rec => createRecommendationCard(rec)).join('');

  // Attach card listeners
  recs.forEach((rec, index) => {
    const card = container.children[index];
    const addBtn = card.querySelector('.btn-add-to-trip');
    const detailsBtn = card.querySelector('.btn-view-details');
    
    if (addBtn) {
      addBtn.onclick = () => addRecommendationToTrip(rec);
    }
    if (detailsBtn) {
      detailsBtn.onclick = () => showRecommendationDetails(rec);
    }
  });
}

// ===================== RECOMMENDATION CARD =====================
function createRecommendationCard(rec) {
  const icon = getCategoryIcon(rec.category);

  const reasonsHTML = (rec.reasons || []).map(reason => `
    <span class="reason-tag">
      <i class="fas fa-check-circle"></i>
      ${escapeHtml(reason)}
    </span>
  `).join('');

  return `
    <div class="recommendation-card">
      <div class="rec-header">
        <div class="rec-title">
          <h3>${escapeHtml(rec.name)}</h3>
          <span class="rec-category">
            <i class="fas fa-fa-${icon}"></i>
            ${escapeHtml(rec.category)}
          </span>
        </div>
        <div class="rec-score">
          <i class="fas fa-star"></i>
          ${(rec.recommendationScore || rec.rating || 0).toFixed(1)}
        </div>
      </div>

      <div class="rec-meta">
        <div class="rec-rating">
          <i class="fas fa-star"></i>
          ${(rec.rating || 0).toFixed(1)}
        </div>
        ${rec.distanceFromCenter ? `
          <div class="rec-distance">
            <i class="fas fa-map-marker-alt"></i>
            ${rec.distanceFromCenter.toFixed(1)} km away
          </div>
        ` : ''}
      </div>

      ${reasonsHTML ? `
        <div class="rec-reasons">
          <div class="rec-reasons-title">Why we recommend this</div>
          ${reasonsHTML}
        </div>
      ` : ''}

      ${rec.address ? `
        <div class="rec-address">
          <i class="fas fa-map-pin"></i>
          ${escapeHtml(rec.address)}
        </div>
      ` : ''}

      <div class="rec-actions">
        <button class="btn-add-to-trip">
          <i class="fas fa-plus"></i> Add to Trip
        </button>
        <button class="btn-view-details">
          <i class="fas fa-info"></i>
        </button>
      </div>
    </div>
  `;
}

// ===================== ADD TO TRIP =====================
async function addRecommendationToTrip(rec) {
  try {
    const placeData = {
      name: rec.name,
      category: rec.category,
      address: rec.address || '',
      location: rec.location,
      rating: rec.rating || 0,
      priceLevel: rec.priceLevel || 0,
      description: rec.description || '',
      notes: (rec.reasons || []).join('. ')
    };

    await apiService.places.create(
      recommendationsState.currentTripId,
      placeData
    );

    showToast('Place added to your trip!', 'success');

    await trackPlaceAdded(rec.category);

    // Refresh only added places (NOT AI again)
    if (typeof loadPlaces === 'function') {
      await loadPlaces();
    }

    // Remove added item from recommendations UI
    recommendationsState.recommendations =
      recommendationsState.recommendations.filter(r => r.name !== rec.name);

    displayRecommendations();
  } catch (err) {
    console.error('Error adding place:', err);
    showToast('Failed to add place', 'error');
  }
}

// ===================== DETAILS MODAL =====================
function showRecommendationDetails(rec) {
  const modal = document.createElement('div');
  modal.className = 'modal active';

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>${escapeHtml(rec.name)}</h3>
        <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
      </div>
      <div class="modal-body">
        <p><strong>Category:</strong> ${escapeHtml(rec.category)}</p>
        <p><strong>Rating:</strong> ${(rec.rating || 0).toFixed(1)}</p>
        ${rec.distanceFromCenter ? `<p><strong>Distance:</strong> ${rec.distanceFromCenter.toFixed(2)} km</p>` : ''}
        <p><strong>Address:</strong> ${escapeHtml(rec.address || 'N/A')}</p>
        ${rec.description ? `<p>${escapeHtml(rec.description)}</p>` : ''}
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
        <button class="btn-primary" onclick="addRecommendationToTripFromModal(${JSON.stringify(rec).replace(/"/g, '&quot;')})">
          <i class="fas fa-plus"></i> Add to Trip
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

// Modal helper
window.addRecommendationToTripFromModal = async function(rec) {
  await addRecommendationToTrip(rec);
  document.querySelector('.modal')?.remove();
};

// ===================== PREFERENCES TRACKING =====================
async function trackPlaceAdded(category) {
  try {
    await apiService.preferences.trackSearch({
      category,
      query: '',
      location: null
    });
  } catch (err) {
    console.warn('Preference tracking failed:', err);
  }
}

// ===================== LOADING & ERROR UI =====================
function showRecommendationsLoading() {
  const container = document.getElementById('recommendationsGrid');
  if (!container) return;
  container.innerHTML = `
    <div class="recommendations-loading">
      <div class="loading-spinner"></div>
      <p>Finding personalized recommendations...</p>
    </div>
  `;
}

function showRecommendationsError() {
  const container = document.getElementById('recommendationsGrid');
  if (!container) return;
  container.innerHTML = `
    <div class="recommendations-empty">
      <i class="fas fa-exclamation-triangle"></i>
      <h3>Failed to load recommendations</h3>
      <button class="btn-primary" onclick="loadRecommendations()">Retry</button>
    </div>
  `;
}

// ===================== HELPERS =====================
function getCategoryIcon(category) {
  const icons = {
    restaurant: 'utensils',
    attraction: 'landmark',
    accommodation: 'bed',
    transport: 'bus',
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

// Export for use in other modules
window.loadRecommendations = loadRecommendations;