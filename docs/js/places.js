// FIXED places.js - Map shows RECOMMENDED places, not added places!

let currentTripId = null;
let allPlaces = [];
let currentFilter = 'all';
let map = null;
let markers = []; // Track markers for cleanup
let currentTripData = null;
let recommendedPlaces = []; // ✅ NEW: Store recommended places for map

// ===================== Page Init =====================
document.addEventListener('DOMContentLoaded', async () => {
  const token = sessionStorage.getItem('accessToken');
  if (!token) {
    showToast('Please login first', 'error');
    window.location.href = './login.html';
    return;
  }

  currentTripId =
    new URLSearchParams(window.location.search).get('id') ||
    sessionStorage.getItem('currentTripId');

  if (!currentTripId) {
    showToast('Trip not found', 'error');
    setTimeout(() => (window.location.href = './trips.html'), 2000);
    return;
  }

  sessionStorage.setItem('currentTripId', currentTripId);

  await loadTripContext();
  await loadPlaces();

  if (currentTripData && typeof initRecommendations === 'function') {
    await initRecommendations(currentTripId, currentTripData);
  }

  initFilters();
  
  // ✅ Initialize map after DOM is ready and places are loaded
  setTimeout(() => {
    initMap();
  }, 500);

  // UI handlers
  document.getElementById('addPlaceBtn')?.addEventListener('click', openAddPlaceModal);
  document.getElementById('addPlaceBtnBottom')?.addEventListener('click', openAddPlaceModal);
  document.getElementById('closeModal')?.addEventListener('click', closePlaceModal);
  document.getElementById('cancelBtn')?.addEventListener('click', closePlaceModal);
  document.getElementById('placeForm')?.addEventListener('submit', handlePlaceSubmit);

  document.getElementById('toggleMapBtn')?.addEventListener('click', toggleMap);
  document.getElementById('closeMapBtn')?.addEventListener('click', closeMap);
});

// ===================== Trip Context =====================
async function loadTripContext() {
  try {
    const res = await apiService.trips.getById(currentTripId);
    currentTripData = res.data;

    const tripInfoEl = document.getElementById('tripInfo');
    if (tripInfoEl && currentTripData) {
      const days =
        Math.ceil(
          (new Date(currentTripData.endDate) -
            new Date(currentTripData.startDate)) /
            (1000 * 60 * 60 * 24)
        ) + 1;

      tripInfoEl.textContent = `${currentTripData.destination}${
        currentTripData.country ? ', ' + currentTripData.country : ''
      } • ${days} Days`;
    }
  } catch (err) {
    console.error('Failed to load trip context:', err);
  }
}

// ===================== Places =====================
async function loadPlaces(filters = {}) {
  try {
    const res = await apiService.places.getByTrip(currentTripId, filters);
    allPlaces = res.data || [];
    displayPlaces();
  } catch (err) {
    console.error('Failed to load places:', err);
    allPlaces = [];
    displayPlaces();
  }
}

function displayPlaces() {
  const grid = document.getElementById('placesGrid');
  const emptyEl = document.getElementById('emptyPlaces');
  if (!grid) return;

  let filtered = currentFilter === 'all'
    ? allPlaces
    : allPlaces.filter(p => p.category.toLowerCase() === currentFilter);

  if (filtered.length === 0) {
    grid.style.display = 'none';
    emptyEl && (emptyEl.style.display = 'flex');
    return;
  }

  emptyEl && (emptyEl.style.display = 'none');
  grid.style.display = 'grid';
  grid.innerHTML = filtered.map(createPlaceCard).join('');

  // Attach card-level actions
  filtered.forEach(place => {
    const card = document.querySelector(`[data-place-id="${place._id}"]`);
    if (!card) return;

    card.querySelector('.btn-toggle-favorite')?.addEventListener('click', e => {
      e.stopPropagation();
      toggleFavorite(place._id, e.currentTarget);
    });

    card.querySelector('.btn-add-schedule')?.addEventListener('click', e => {
      e.stopPropagation();
      addToSchedule(place._id);
    });

    card.querySelector('.btn-delete-place')?.addEventListener('click', e => {
      e.stopPropagation();
      deletePlace(place._id);
    });
  });
}

// ===================== Place Card =====================
function createPlaceCard(place) {
  const icon = getCategoryIcon(place.category);
  const isFavorite = place.isFavorite || false;

  return `
    <div class="place-card ${place.category.toLowerCase()}" data-place-id="${place._id}">
      <div class="place-card-header">
        <div class="place-avatar">
          <i class="fas fa-${icon}"></i>
        </div>

        <div class="place-info">
          <div class="place-name">${escapeHtml(place.name)}</div>
          <div class="place-meta">
            ${
              place.visitDate
                ? `<span><i class="fas fa-calendar"></i> ${new Date(
                    place.visitDate
                  ).toLocaleDateString()}</span>`
                : ''
            }
            ${
              place.rating > 0
                ? `<span><i class="fas fa-star"></i> ${place.rating.toFixed(1)}</span>`
                : ''
            }
          </div>
        </div>

        <button class="btn-toggle-favorite ${isFavorite ? 'favorited' : ''}">
          <i class="fas fa-heart"></i>
        </button>
      </div>

      ${
        place.notes || place.description
          ? `<div class="place-description">${escapeHtml(
              place.notes || place.description
            )}</div>`
          : ''
      }

      <div class="place-actions">
        <button class="btn-primary btn-small btn-add-schedule">
          <i class="fas fa-calendar-plus"></i> Add to Schedule
        </button>
        <button class="btn-delete-place btn-small">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `;
}

// ===================== Filters =====================
function initFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      displayPlaces();
    });
  });
}

// ===================== Modals =====================
function openAddPlaceModal() {
  document.getElementById('placeForm')?.reset();
  document.getElementById('placeModal').style.display = 'block';
}

function closePlaceModal() {
  document.getElementById('placeModal').style.display = 'none';
}

// ===================== Geocoding Helper =====================
async function geocodePlace(placeName, address) {
  try {
    const query = address || placeName;
    const response = await fetch(`${API_BASE_URL}/places/geocode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`
      },
      body: JSON.stringify({ location: query })
    });

    if (!response.ok) {
      throw new Error('Geocoding failed');
    }

    const result = await response.json();
    return result.data;
  } catch (err) {
    console.error('Geocoding error:', err);
    return null;
  }
}

// ===================== Create Place (FIXED) =====================
async function handlePlaceSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('placeName').value.trim();
  const address = document.getElementById('placeAddress').value.trim();

  // ✅ GEOCODE THE PLACE FIRST
  showToast('Finding location...', 'info');
  const coords = await geocodePlace(name, address);

  if (!coords) {
    showToast('Could not find location. Please enter a valid address or place name.', 'error');
    return;
  }

  const data = {
    name: name,
    category: document.getElementById('placeCategory').value.toLowerCase(),
    visitDate: document.getElementById('placeVisitDate').value || null,
    rating: parseFloat(document.getElementById('placeRating').value) || 0,
    address: address || coords.formatted,
    description: document.getElementById('placeDescription').value.trim(),
    priceLevel: parseInt(document.getElementById('placePrice').value) || 0,
    notes: document.getElementById('placeNotes').value.trim(),
    // ✅ ADD COORDINATES (REQUIRED BY MODEL)
    location: {
      type: 'Point',
      coordinates: [coords.lon, coords.lat] // [longitude, latitude]
    }
  };

  try {
    await apiService.places.create(currentTripId, data);
    showToast('Place added successfully!', 'success');
    closePlaceModal();
    await loadPlaces();

    typeof loadRecommendations === 'function' && loadRecommendations();
  } catch (err) {
    console.error('Failed to add place:', err);
    showToast('Failed to add place: ' + (err.message || 'Unknown error'), 'error');
  }
}

// ===================== Favorites =====================
async function toggleFavorite(placeId, btn) {
  const wasFavorited = btn.classList.contains('favorited');
  btn.classList.toggle('favorited');
  btn.disabled = true;

  try {
    await apiService.places.toggleFavorite(placeId);
    const place = allPlaces.find(p => p._id === placeId);
    if (place) place.isFavorite = !wasFavorited;

    showToast(
      wasFavorited ? 'Removed from favorites' : 'Added to favorites',
      'success'
    );
  } catch (err) {
    console.error('Favorite toggle failed:', err);
    btn.classList.toggle('favorited');
    showToast('Failed to update favorite', 'error');
  } finally {
    btn.disabled = false;
  }
}

// ===================== Delete =====================
async function deletePlace(placeId) {
  if (!confirm('Delete this place?')) return;

  try {
    await apiService.places.delete(placeId);
    showToast('Place deleted', 'success');
    await loadPlaces();
  } catch (err) {
    console.error('Delete failed:', err);
    showToast('Failed to delete place', 'error');
  }
}

// ===================== Map Functions (FIXED FOR RECOMMENDATIONS) =====================
function toggleMap() {
  const mapEl = document.getElementById('map');
  mapEl.style.display = 'block';
  
  if (!map) {
    initMap();
  }
  
  // Force resize after showing
  setTimeout(() => {
    if (map) {
      map.invalidateSize();
      updateRecommendedMarkers(); // ✅ Show recommended places
    }
  }, 100);
}

function closeMap() {
  document.getElementById('map').style.display = 'none';
}

function initMap() {
  // Check if Leaflet is loaded
  if (typeof L === 'undefined') {
    console.error('❌ Leaflet library not loaded!');
    showToast('Map library not loaded. Please refresh the page.', 'error');
    return;
  }

  // Check if map already exists
  if (map) {
    console.log('ℹ️ Map already initialized');
    map.invalidateSize();
    return;
  }

  const mapContainer = document.getElementById('map');
  if (!mapContainer) {
    console.error('❌ Map container not found!');
    return;
  }

  console.log('🗺️ Initializing Leaflet map...');

  try {
    // Create map with default center (India)
    map = L.map('map', {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: true,
      scrollWheelZoom: true
    });

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    console.log('✅ Map initialized successfully');

    // Force container size recalculation
    setTimeout(() => {
      if (map) {
        map.invalidateSize();
        updateRecommendedMarkers(); // ✅ Show recommended places
      }
    }, 300);

  } catch (err) {
    console.error('❌ Map initialization failed:', err);
    showToast('Failed to initialize map', 'error');
  }
}

// ✅ NEW: Function to update recommended place markers
function updateRecommendedMarkers() {
  if (!map) {
    console.warn('⚠️ Cannot update markers - map not initialized');
    return;
  }

  // Clear existing markers
  markers.forEach(marker => {
    try {
      map.removeLayer(marker);
    } catch (err) {
      console.warn('Error removing marker:', err);
    }
  });
  markers = [];

  // Get recommended places from the recommendations grid
  const recommendationCards = document.querySelectorAll('.recommendation-card');
  
  if (recommendationCards.length === 0) {
    console.log('ℹ️ No recommended places to show on map');
    showToast('No recommendations available yet. AI is generating suggestions...', 'info');
    return;
  }

  console.log(`📍 Adding ${recommendationCards.length} recommended places to map...`);

  const bounds = [];
  let markersAdded = 0;

  recommendationCards.forEach(card => {
    // Extract place data from card
    const name = card.querySelector('.rec-name')?.textContent || 'Unknown Place';
    const category = card.dataset.category || 'attraction';
    const rating = card.querySelector('.rec-rating')?.textContent || 'N/A';
    const description = card.querySelector('.rec-description')?.textContent || '';
    
    // Get coordinates from data attributes if available
    const lat = parseFloat(card.dataset.lat);
    const lon = parseFloat(card.dataset.lon);

    // Skip if no valid coordinates
    if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
      console.warn('⚠️ Skipping place with invalid coordinates:', name);
      return;
    }

    // Validate coordinates
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      console.warn('⚠️ Invalid coordinate range for:', name, [lat, lon]);
      return;
    }

    const icon = getCategoryIcon(category);

    // Category colors
    const categoryColors = {
      restaurant: '#EF4444',
      attraction: '#3B82F6',
      accommodation: '#8B5CF6',
      transport: '#10B981',
      shopping: '#F59E0B',
      entertainment: '#EC4899',
      other: '#6B7280'
    };

    const color = categoryColors[category.toLowerCase()] || categoryColors.other;

    const markerIcon = L.divIcon({
      html: `<div style="background: ${color}; color: white; padding: 8px; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.4); border: 3px solid white;">
              <i class="fas fa-${icon}" style="font-size: 18px;"></i>
            </div>`,
      className: '',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20]
    });

    try {
      // Create marker
      const marker = L.marker([lat, lon], { icon: markerIcon })
        .addTo(map)
        .bindPopup(`
          <div style="padding: 14px; min-width: 250px; max-width: 300px;">
            <div style="font-weight: 700; font-size: 17px; margin-bottom: 10px; color: #1a2332;">
              ${escapeHtml(name)}
            </div>
            <div style="color: #666; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
              <i class="fas fa-${icon}"></i>
              <span style="text-transform: capitalize;">${category}</span>
            </div>
            ${rating !== 'N/A' ? `
              <div style="margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
                <span style="color: #FFA500; font-size: 16px;">⭐</span>
                <span style="font-weight: 600;">${rating}</span>
              </div>
            ` : ''}
            ${description ? `
              <div style="color: #666; font-size: 14px; margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee; line-height: 1.5;">
                ${escapeHtml(description.substring(0, 150))}${description.length > 150 ? '...' : ''}
              </div>
            ` : ''}
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee;">
              <button onclick="handleAddRecommendedPlace('${name.replace(/'/g, "\\'")}', '${category}')" 
                      style="background: #0066cc; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; width: 100%;">
                <i class="fas fa-plus"></i> Add to My Places
              </button>
            </div>
          </div>
        `, {
          maxWidth: 300,
          className: 'custom-popup'
        });

      markers.push(marker);
      bounds.push([lat, lon]);
      markersAdded++;
    } catch (err) {
      console.error('Error adding marker for:', name, err);
    }
  });

  // Fit map to show all markers
  if (bounds.length > 0) {
    try {
      map.fitBounds(bounds, { 
        padding: [60, 60],
        maxZoom: 13
      });
    } catch (err) {
      console.error('Error fitting bounds:', err);
    }
  }

  console.log(`✅ Added ${markersAdded} recommended place markers to map`);
  
  if (markersAdded === 0) {
    showToast('No location data available for recommended places', 'warning');
  }
}

// ✅ NEW: Handle adding recommended place to user's places
window.handleAddRecommendedPlace = function(name, category) {
  // Pre-fill the add place modal
  document.getElementById('placeName').value = name;
  document.getElementById('placeCategory').value = category.toLowerCase();
  openAddPlaceModal();
  
  // Close the popup
  if (map) {
    map.closePopup();
  }
};

// ===================== Utilities =====================
function getCategoryIcon(cat) {
  return {
    restaurant: 'utensils',
    attraction: 'landmark',
    accommodation: 'bed',
    transport: 'bus',
    shopping: 'shopping-bag',
    entertainment: 'film'
  }[cat?.toLowerCase()] || 'map-marker-alt';
}

function escapeHtml(text = '') {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===================== Add to Schedule (Placeholder) =====================
function addToSchedule(placeId) {
  showToast('Schedule feature coming soon!', 'info');
  console.log('Add to schedule:', placeId);
}

// ✅ EXPORT function so recommendations can trigger map update
window.updateMapWithRecommendations = function() {
  if (map) {
    updateRecommendedMarkers();
  }
};
