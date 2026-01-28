// FIXED places.js - Proper map initialization!

let currentTripId = null;
let allPlaces = [];
let currentFilter = 'all';
let map = null;
let markers = []; // Track markers for cleanup
let currentTripData = null;

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
    
    // Update map if it's initialized
    if (map) {
      updatePlaceMarkers();
    }
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
      
      // Update map markers when filter changes
      if (map) {
        updatePlaceMarkers();
      }
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

// ===================== Map Functions (FIXED) =====================
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
      updatePlaceMarkers();
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
        updatePlaceMarkers();
      }
    }, 300);

  } catch (err) {
    console.error('❌ Map initialization failed:', err);
    showToast('Failed to initialize map', 'error');
  }
}

// ✅ Update markers on the map
function updatePlaceMarkers() {
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

  // Filter places based on current filter
  let filtered = currentFilter === 'all'
    ? allPlaces
    : allPlaces.filter(p => p.category.toLowerCase() === currentFilter);

  if (filtered.length === 0) {
    console.log('ℹ️ No places to show on map');
    return;
  }

  console.log(`📍 Adding ${filtered.length} markers to map...`);

  // Add marker for each place
  const bounds = [];
  
  filtered.forEach(place => {
    if (!place.location?.coordinates || place.location.coordinates.length !== 2) {
      console.warn('⚠️ Place missing valid coordinates:', place.name);
      return;
    }

    const [lon, lat] = place.location.coordinates;
    
    // Validate coordinates
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      console.warn('⚠️ Invalid coordinates for:', place.name, [lat, lon]);
      return;
    }

    const icon = getCategoryIcon(place.category);

    // Create custom icon with category color
    const categoryColors = {
      restaurant: '#EF4444',
      attraction: '#3B82F6',
      accommodation: '#8B5CF6',
      transport: '#10B981',
      other: '#6B7280'
    };

    const color = categoryColors[place.category.toLowerCase()] || categoryColors.other;

    const markerIcon = L.divIcon({
      html: `<div style="background: ${color}; color: white; padding: 8px; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
              <i class="fas fa-${icon}" style="font-size: 16px;"></i>
            </div>`,
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18]
    });

    try {
      // Create marker
      const marker = L.marker([lat, lon], { icon: markerIcon })
        .addTo(map)
        .bindPopup(`
          <div style="padding: 12px; min-width: 200px;">
            <div style="font-weight: 600; font-size: 16px; margin-bottom: 8px;">
              ${escapeHtml(place.name)}
            </div>
            <div style="color: #666; margin-bottom: 8px;">
              <i class="fas fa-${icon}"></i> ${place.category}
            </div>
            ${place.rating > 0 ? `
              <div style="margin-bottom: 8px;">
                <span style="color: #FFA500;">⭐</span> ${place.rating.toFixed(1)}
              </div>
            ` : ''}
            ${place.address ? `
              <div style="color: #666; font-size: 13px; margin-bottom: 8px;">
                <i class="fas fa-map-marker-alt"></i> ${escapeHtml(place.address)}
              </div>
            ` : ''}
            ${place.notes ? `
              <div style="color: #666; font-size: 13px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee;">
                ${escapeHtml(place.notes)}
              </div>
            ` : ''}
          </div>
        `);

      markers.push(marker);
      bounds.push([lat, lon]);
    } catch (err) {
      console.error('Error adding marker for:', place.name, err);
    }
  });

  // Fit map to show all markers
  if (bounds.length > 0) {
    try {
      map.fitBounds(bounds, { 
        padding: [50, 50],
        maxZoom: 15
      });
    } catch (err) {
      console.error('Error fitting bounds:', err);
    }
  }

  console.log(`✅ Added ${markers.length} markers to map`);
}

// ===================== Utilities =====================
function getCategoryIcon(cat) {
  return {
    restaurant: 'utensils',
    attraction: 'landmark',
    accommodation: 'bed',
    transport: 'bus'
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
