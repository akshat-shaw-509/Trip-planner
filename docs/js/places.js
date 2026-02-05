let currentTripId = null;
let allPlaces = [];
let currentFilter = 'all';
let map = null;
let markers = [];
let currentTripData = null;

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

  //Load trip data
  await loadTripContext();
  if (!currentTripData) {
    console.error('Failed to load trip data');
    showToast('Failed to load trip details', 'error');
    return;
  }
  //Trip center selector
  if (typeof initTripCenterSelector === 'function') {
    try {
      await initTripCenterSelector(currentTripData);
    } catch (err) {
      console.error('Trip center init failed:', err);
    }
  }
  // Load places
  await loadPlaces();
  // Recommendations
  if (typeof initRecommendations === 'function') {
    try {
      await initRecommendations(currentTripId, currentTripData);
    } catch (err) {
      console.error('Recommendations init failed:', err);
    }
  } else {
    console.error('initRecommendations function not found!');
  }
  initFilters();
  //Initialize map
  setTimeout(() => {
    initMap();
  }, 500);
  document.getElementById('addPlaceBtn')?.addEventListener('click', openAddPlaceModal);
  document.getElementById('addPlaceBtnBottom')?.addEventListener('click', openAddPlaceModal);
  document.getElementById('closeModal')?.addEventListener('click', closePlaceModal);
  document.getElementById('cancelBtn')?.addEventListener('click', closePlaceModal);
  document.getElementById('placeForm')?.addEventListener('submit', handlePlaceSubmit);
  document.getElementById('toggleMapBtn')?.addEventListener('click', toggleMap);
  document.getElementById('closeMapBtn')?.addEventListener('click', closeMap);
document.getElementById('openFilterBtn')?.addEventListener('click', () => {
  document.getElementById('filterModal').style.display = 'block';
});
//Trip Context
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
    return currentTripData;
  } catch (err) {
    console.error('Failed to load trip context:', err);
    showToast('Failed to load trip details', 'error');
    throw err;
  }
}
//Places
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

function openAddPlaceModal() {
  document.getElementById('placeForm')?.reset();
  document.getElementById('placeModal').style.display = 'block';
}

function closePlaceModal() {
  document.getElementById('placeModal').style.display = 'none';
}

async function geocodePlace(placeName, address) {
  try {
    const query = address || placeName;
    const baseURL = apiService?.baseURL || 'http://localhost:5000/api';
    const token = sessionStorage.getItem('accessToken');
    const response = await fetch(`${baseURL}/places/geocode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ location: query })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Geocoding API error:', errorData);
      throw new Error(errorData.error || 'Geocoding failed');
    }
    const result = await response.json();
    return result.data;
  } catch (err) {
    console.error('Geocoding error:', err);
    return null;
  }
}

async function handlePlaceSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('placeName').value.trim();
  const address = document.getElementById('placeAddress').value.trim();
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
    location: {
      type: 'Point',
      coordinates: [coords.lon, coords.lat]
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
function toggleMap() {
  const mapEl = document.getElementById('map');
  mapEl.style.display = 'block';
  if (!map) {
    initMap();
  }
  setTimeout(() => {
    if (map) {
      map.invalidateSize();
      updateRecommendedMarkers();
    }
  }, 100);
}
function closeMap() {
  document.getElementById('map').style.display = 'none';
}

function initMap() {
  if (typeof L === 'undefined') {
    showToast('Map library not loaded. Please refresh the page.', 'error');
    return;
  }
  if (map) {
    map.invalidateSize();
    return;
  }
  const mapContainer = document.getElementById('map');
  if (!mapContainer) {
    console.error('Map container not found!');
    return;
  }
  try {
    map = L.map('map', {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: true,
      scrollWheelZoom: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);
    setTimeout(() => {
      if (map) {
        map.invalidateSize();
        updateRecommendedMarkers();
      }
    }, 300);

  } catch (err) {
    console.error('Map initialization failed:', err);
    showToast('Failed to initialize map', 'error');
  }
}

function updateRecommendedMarkers() {
  if (!map) {
    console.warn('Cannot update markers - map not initialized');
    return;
  }
  markers.forEach(marker => {
    try {
      map.removeLayer(marker);
    } catch (err) {
      console.warn('Error removing marker:', err);
    }
  });
  markers = [];
  const recommendationCards = document.querySelectorAll('.recommendation-card');
  if (recommendationCards.length === 0) {
    showToast('No recommendations available yet', 'info');
    return;
  }
  const bounds = [];
  let markersAdded = 0;

  recommendationCards.forEach(card => {
    const name = card.querySelector('.rec-name')?.textContent || 'Unknown Place';
    const category = card.dataset.category || 'attraction';
    const rating = card.querySelector('.rec-rating')?.textContent || 'N/A';
    const description = card.querySelector('.rec-description')?.textContent || '';
    const lat = parseFloat(card.dataset.lat);
    const lon = parseFloat(card.dataset.lon);

    if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
      console.warn('Skipping place with invalid coordinates:', name);
      return;
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      console.warn('Invalid coordinate range for:', name, [lat, lon]);
      return;
    }
    const icon = getCategoryIcon(category);
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
  if (markersAdded === 0) {
    showToast('No location data available for recommended places', 'warning');
  }
}



window.handleAddRecommendedPlace = function(name, category) {
  document.getElementById('placeName').value = name;
  document.getElementById('placeCategory').value = category.toLowerCase();
  openAddPlaceModal();
  if (map) {
    map.closePopup();
  }
};

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

function addToSchedule(placeId) {
  showToast('Schedule feature coming soon!', 'info');
}

window.updateMapWithRecommendations = function() {
  if (map) {
    updateRecommendedMarkers();
  }
};
//Update visit status for a place
async function updateVisitStatus(placeId, status) {
  try {
    await apiService.places.updateVisitStatus(placeId, status)
    showToast(`Marked as ${status}`, 'success')
    await loadPlaces()
  } catch (err) {
    console.error('Failed to update visit status:', err)
    showToast('Failed to update status', 'error')
  }
}

//Search nearby places
async function searchNearbyPlaces() {
  try {
    const radius = document.getElementById('nearbyRadius')?.value || 5000
    const category = document.getElementById('nearbyCategory')?.value || ''
    showToast('Searching nearby places...', 'info')
    const options = {
      radius: parseInt(radius),
      limit: 20
    }
    
    if (category && category !== 'all') {
      options.category = category
    }
    const res = await apiService.places.searchNearby(currentTripId, options)
    const nearbyPlaces = res.data || []
    displayNearbyResults(nearbyPlaces)
    showToast(`Found ${nearbyPlaces.length} nearby places`, 'success')
  } catch (err) {
    console.error('Nearby search failed:', err)
    showToast('Failed to search nearby places', 'error')
  }
}

//Display nearby search results
function displayNearbyResults(places) {
  const modal = document.createElement('div')
  modal.className = 'modal active'
  modal.id = 'nearbyResultsModal'
  
  modal.innerHTML = `
    <div class="modal-content modal-large">
      <div class="modal-header">
        <h3><i class="fas fa-map-marker-alt"></i> Nearby Places</h3>
        <button class="modal-close" onclick="closeNearbyModal()">&times;</button>
      </div>
      
      <div class="modal-body">
        <div class="nearby-results-grid">
          ${places.map(place => `
            <div class="nearby-place-card">
              <div class="nearby-place-header">
                <h4>${escapeHtml(place.name)}</h4>
                ${place.rating ? `<span class="rating"><i class="fas fa-star"></i> ${place.rating.toFixed(1)}</span>` : ''}
              </div>
              
              <div class="nearby-place-info">
                ${place.address ? `<p><i class="fas fa-location-dot"></i> ${escapeHtml(place.address)}</p>` : ''}
                ${place.distance ? `<p><i class="fas fa-route"></i> ${place.distance.toFixed(2)} km away</p>` : ''}
              </div>
              
              <button class="btn-primary btn-small" onclick="addNearbyPlace('${place._id}')">
                <i class="fas fa-plus"></i> Add to Trip
              </button>
            </div>
          `).join('')}
        </div>
        
        ${places.length === 0 ? '<div class="empty-state"><p>No nearby places found</p></div>' : ''}
      </div>
    </div>
  `
  document.body.appendChild(modal)
}

//Add nearby place to trip
async function addNearbyPlace(placeId) {
  try {
    // Get place details first
    const place = await apiService.places.getPlaceById(placeId)
    await apiService.places.create(currentTripId, place.data)
    
    showToast('Place added to trip!', 'success')
    await loadPlaces()
    closeNearbyModal()
    
  } catch (err) {
    console.error('Failed to add nearby place:', err)
    showToast('Failed to add place', 'error')
  }
}

function closeNearbyModal() {
  document.getElementById('nearbyResultsModal')?.remove()
}

function createPlaceCard(place) {
  const icon = getCategoryIcon(place.category)
  const isFavorite = place.isFavorite || false
  const visitStatus = place.visitStatus || 'planned'
  
  return `
    <div class="place-card ${place.category.toLowerCase()}" data-place-id="${place._id}">
      <div class="place-card-header">
        <div class="place-avatar">
          <i class="fas fa-${icon}"></i>
        </div>

        <div class="place-info">
          <div class="place-name">${escapeHtml(place.name)}</div>
          <div class="place-meta">
            ${place.visitDate ? `<span><i class="fas fa-calendar"></i> ${new Date(place.visitDate).toLocaleDateString()}</span>` : ''}
            ${place.rating > 0 ? `<span><i class="fas fa-star"></i> ${place.rating.toFixed(1)}</span>` : ''}
          </div>
        </div>

        <button class="btn-toggle-favorite ${isFavorite ? 'favorited' : ''}">
          <i class="fas fa-heart"></i>
        </button>
      </div>

      ${place.notes || place.description ? `
        <div class="place-description">${escapeHtml(place.notes || place.description)}</div>
      ` : ''}

      <div class="place-visit-status">
        <label>Visit Status:</label>
        <select class="visit-status-select" onchange="updateVisitStatus('${place._id}', this.value)">
          <option value="planned" ${visitStatus === 'planned' ? 'selected' : ''}>📋 Planned</option>
          <option value="visited" ${visitStatus === 'visited' ? 'selected' : ''}>✅ Visited</option>
          <option value="skipped" ${visitStatus === 'skipped' ? 'selected' : ''}>⏭️ Skipped</option>
        </select>
      </div>

      <div class="place-actions">
        <button class="btn-primary btn-small btn-add-schedule">
          <i class="fas fa-calendar-plus"></i> Add to Schedule
        </button>
        <button class="btn-delete-place btn-small">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `
}
window.updateVisitStatus = updateVisitStatus
window.searchNearbyPlaces = searchNearbyPlaces
window.addNearbyPlace = addNearbyPlace
window.closeNearbyModal = closeNearbyModal
