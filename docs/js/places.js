// Handles trip places: list, filters, favorites, add/delete, and map view

let currentTripId = null;
let allPlaces = [];
let currentFilter = 'all';
let map = null;
let currentTripData = null;

// ===================== Page Init =====================
document.addEventListener('DOMContentLoaded', async () => {
  const token = sessionStorage.getItem('accessToken');
  if (!token) {
    showToast('Please login first', 'error');
    window.location.href = './login.html';
    return;
  }

  // Get trip ID from URL or storage
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

// Pass trip data to recommendations
if (currentTripData && typeof initRecommendations === 'function') {
  await initRecommendations(currentTripId, currentTripData);  // ✅ Pass both params
}

  initFilters();

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

// ===================== Create Place =====================
async function handlePlaceSubmit(e) {
  e.preventDefault();

  const data = {
    name: document.getElementById('placeName').value.trim(),
    category: document.getElementById('placeCategory').value.toLowerCase(),
    visitDate: document.getElementById('placeVisitDate').value || null,
    rating: parseFloat(document.getElementById('placeRating').value) || 0,
    address: document.getElementById('placeAddress').value.trim(),
    description: document.getElementById('placeDescription').value.trim(),
    priceLevel: parseInt(document.getElementById('placePrice').value) || 0,
    notes: document.getElementById('placeNotes').value.trim()
  };

  try {
    await apiService.places.create(currentTripId, data);
    showToast('Place added', 'success');
    closePlaceModal();
    await loadPlaces();

    typeof loadRecommendations === 'function' && loadRecommendations();
  } catch (err) {
    console.error('Failed to add place:', err);
    showToast('Failed to add place', 'error');
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

// ===================== Map =====================
function toggleMap() {
  document.getElementById('map').style.display = 'block';
  document.getElementById('toggleMapBtn').style.display = 'none';
  document.getElementById('closeMapBtn').style.display = 'inline-block';
  initMap();
}

function closeMap() {
  document.getElementById('map').style.display = 'none';
  document.getElementById('toggleMapBtn').style.display = 'inline-block';
  document.getElementById('closeMapBtn').style.display = 'none';
}

function initMap() {
  if (map || typeof L === 'undefined') return;
  map = L.map('map').setView([20.5937, 78.9629], 5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);
}



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
