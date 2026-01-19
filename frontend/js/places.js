// js/places.js (FIXED - Working favorite toggle + better UI)
let currentTripId = null;
let allPlaces = [];
let currentFilter = 'all';
let map = null;
let currentTripData = null;

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        showToast('Please login first', 'error');
        window.location.href = 'login.html';
        return;
    }

    currentTripId = new URLSearchParams(window.location.search).get('id') || localStorage.getItem('currentTripId');
    if (!currentTripId) {
        showToast('Trip not found', 'error');
        setTimeout(() => window.location.href = 'trips.html', 2000);
        return;
    }
    localStorage.setItem('currentTripId', currentTripId);
    
    await loadTripContext();
    await loadPlaces();
    
    if (currentTripData) {
        await initRecommendations(currentTripId, currentTripData);
    }
    
    if (allPlaces.length > 0) {
        const dayPlansSection = document.getElementById('dayPlansSection');
        if (dayPlansSection) {
            dayPlansSection.style.display = 'block';
        }
    }
    
    initFilters();
    
    document.getElementById('addPlaceBtn').onclick = openAddPlaceModal;
    const addPlaceBtnBottom = document.getElementById('addPlaceBtnBottom');
    if (addPlaceBtnBottom) {
        addPlaceBtnBottom.onclick = openAddPlaceModal;
    }
    document.getElementById('closeModal').onclick = closePlaceModal;
    document.getElementById('cancelBtn').onclick = closePlaceModal;
    document.getElementById('placeForm').addEventListener('submit', handlePlaceSubmit);
    
    const toggleMapBtn = document.getElementById('toggleMapBtn');
    const closeMapBtn = document.getElementById('closeMapBtn');
    if (toggleMapBtn) toggleMapBtn.onclick = toggleMap;
    if (closeMapBtn) closeMapBtn.onclick = closeMap;
});

async function loadTripContext() {
    try {
        const res = await apiService.trips.getById(currentTripId);
        const trip = res.data;
        currentTripData = trip;
        
        const tripInfoEl = document.getElementById('tripInfo');
        if (tripInfoEl) {
            const days = Math.ceil((new Date(trip.endDate) - new Date(trip.startDate)) / (1000 * 60 * 60 * 24)) + 1;
            tripInfoEl.textContent = `${trip.destination}${trip.country ? ', ' + trip.country : ''} • ${days} Days`;
        }
    } catch (err) {
        console.error('Error loading trip context:', err);
    }
}

async function loadPlaces(filterBy = {}) {
    try {
        const res = await apiService.places.getByTrip(currentTripId, filterBy);
        allPlaces = res.data || [];
        displayPlaces();
        
        const dayPlansSection = document.getElementById('dayPlansSection');
        if (dayPlansSection) {
            dayPlansSection.style.display = allPlaces.length > 0 ? 'block' : 'none';
        }
    } catch (err) {
        console.error('Error loading places:', err);
        allPlaces = [];
        displayPlaces();
    }
}

function displayPlaces() {
    const grid = document.getElementById('placesGrid');
    const emptyEl = document.getElementById('emptyPlaces');
    if (!grid) return;
    
    let filteredPlaces = allPlaces;
    if (currentFilter !== 'all') {
        filteredPlaces = filteredPlaces.filter(p => p.category.toLowerCase() === currentFilter);
    }
    
    if (filteredPlaces.length === 0) {
        grid.style.display = 'none';
        if (emptyEl) emptyEl.style.display = 'flex';
        return;
    }
    
    if (emptyEl) emptyEl.style.display = 'none';
    grid.style.display = 'grid';
    grid.innerHTML = filteredPlaces.map(p => createPlaceCard(p)).join('');
    
    // Attach event listeners
    filteredPlaces.forEach(p => {
        const card = document.querySelector(`[data-place-id="${p._id}"]`);
        if (card) {
            // Favorite button
            const favoriteBtn = card.querySelector('.btn-toggle-favorite');
            if (favoriteBtn) {
                favoriteBtn.onclick = (e) => {
                    e.stopPropagation();
                    toggleFavorite(p._id, favoriteBtn);
                };
            }
            
            // Schedule button
            const scheduleBtn = card.querySelector('.btn-add-schedule');
            if (scheduleBtn) {
                scheduleBtn.onclick = (e) => {
                    e.stopPropagation();
                    addToSchedule(p._id, e);
                };
            }
            
            // Delete button
            const deleteBtn = card.querySelector('.btn-delete-place');
            if (deleteBtn) {
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    deletePlace(p._id);
                };
            }
        }
    });
}

function createPlaceCard(place) {
    const icon = getCategoryIcon(place.category);
    const badgeClass = place.category.toLowerCase();
    const dateStr = place.visitDate ? new Date(place.visitDate).toLocaleDateString() : 'No date';
    const isFavorite = place.isFavorite || false;
    const favoriteClass = isFavorite ? 'favorited' : '';
    
    return `
    <div class="place-card ${badgeClass}" data-place-id="${place._id}">
        <div class="place-card-header">
            <div class="place-avatar">
                <i class="fas fa-${icon}"></i>
            </div>
            <div class="place-info">
                <div class="place-name">${escapeHtml(place.name)}</div>
                <div class="place-meta">
                    <span class="place-date">
                        <i class="fas fa-calendar"></i>
                        ${dateStr}
                    </span>
                    ${place.rating > 0 ? `
                        <span class="place-rating">
                            <i class="fas fa-star"></i>
                            ${place.rating.toFixed(1)}
                        </span>
                    ` : ''}
                </div>
            </div>
            <button class="btn-toggle-favorite ${favoriteClass}" title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                <i class="fas fa-heart"></i>
            </button>
        </div>
        
        ${place.notes || place.description ? `
            <div class="place-description">
                ${escapeHtml(place.notes || place.description)}
            </div>
        ` : ''}
        
        <div class="place-badge ${badgeClass}">
            <i class="fas fa-${icon}"></i>
            ${escapeHtml(place.category)}
        </div>
        
        <div class="place-actions">
            <button class="btn-primary btn-small btn-add-schedule">
                <i class="fas fa-calendar-plus"></i>
                Add to Schedule
            </button>
            <button class="btn-delete-place btn-small" title="Delete place">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    </div>`;
}

function getCategoryIcon(cat) {
    const icons = {
        restaurant: 'utensils',
        attraction: 'landmark',
        accommodation: 'bed',
        transport: 'bus',
        other: 'map-marker-alt'
    };
    return icons[cat?.toLowerCase()] || 'map-marker-alt';
}

function initFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            displayPlaces();
        };
    });
}

function openAddPlaceModal() {
    document.getElementById('placeForm').reset();
    document.getElementById('placeModal').style.display = 'block';
}

function closePlaceModal() {
    document.getElementById('placeModal').style.display = 'none';
}

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
        
        if (typeof loadRecommendations === 'function' && currentTripData) {
            await loadRecommendations();
        }
        
        if (typeof loadDayPlans === 'function') {
            await loadDayPlans();
        }
        
        const dayPlansSection = document.getElementById('dayPlansSection');
        if (dayPlansSection && allPlaces.length > 0) {
            dayPlansSection.style.display = 'block';
        }
    } catch (err) {
        console.error(err);
        showToast('Failed to add place', 'error');
    }
}

function toggleMap() {
    const mapEl = document.getElementById('map');
    const toggleBtn = document.getElementById('toggleMapBtn');
    const closeBtn = document.getElementById('closeMapBtn');
    
    if (mapEl && toggleBtn && closeBtn) {
        mapEl.style.display = 'block';
        toggleBtn.style.display = 'none';
        closeBtn.style.display = 'inline-block';
        initMap();
        setTimeout(() => {
            if (map) map.invalidateSize();
        }, 200);
    }
}

function closeMap() {
    const mapEl = document.getElementById('map');
    const toggleBtn = document.getElementById('toggleMapBtn');
    const closeBtn = document.getElementById('closeMapBtn');
    
    if (mapEl && toggleBtn && closeBtn) {
        mapEl.style.display = 'none';
        toggleBtn.style.display = 'inline-block';
        closeBtn.style.display = 'none';
    }
}

function addToSchedule(placeId, event) {
    event.stopPropagation();
    showToast('Feature to add to schedule is not yet implemented', 'info');
}

/**
 * Toggle favorite - FIXED VERSION
 */
async function toggleFavorite(placeId, buttonElement) {
    try {
        // Optimistic UI update
        const isFavorited = buttonElement.classList.contains('favorited');
        buttonElement.classList.toggle('favorited');
        
        // Show loading state
        buttonElement.disabled = true;
        buttonElement.style.opacity = '0.6';
        
        // Make API call
        await apiService.places.toggleFavorite(placeId);
        
        // Update local data
        const place = allPlaces.find(p => p._id === placeId);
        if (place) {
            place.isFavorite = !isFavorited;
        }
        
        // Track preference
        if (place && !isFavorited) {
            try {
                await apiService.preferences.trackSearch({
                    category: place.category,
                    query: '',
                    location: null
                });
            } catch (err) {
                console.warn('Failed to track preference:', err);
            }
        }
        
        // Show success feedback
        showToast(
            isFavorited ? 'Removed from favorites' : 'Added to favorites', 
            'success'
        );
        
        // Re-enable button
        buttonElement.disabled = false;
        buttonElement.style.opacity = '1';
        
    } catch (err) {
        console.error('Error toggling favorite:', err);
        
        // Revert UI on error
        buttonElement.classList.toggle('favorited');
        buttonElement.disabled = false;
        buttonElement.style.opacity = '1';
        
        showToast('Failed to update favorite', 'error');
    }
}

/**
 * Delete place - NEW FUNCTION
 */
async function deletePlace(placeId) {
    if (!confirm('Are you sure you want to delete this place?')) {
        return;
    }
    
    try {
        await apiService.places.delete(placeId);
        showToast('Place deleted', 'success');
        await loadPlaces();
        
        if (typeof loadDayPlans === 'function') {
            await loadDayPlans();
        }
    } catch (err) {
        console.error('Error deleting place:', err);
        showToast('Failed to delete place', 'error');
    }
}

function initMap() {
    if (map) return;
    
    if (typeof L === 'undefined') {
        console.error('Leaflet not loaded');
        return;
    }
    
    map = L.map('map').setView([20.5937, 78.9629], 5);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}