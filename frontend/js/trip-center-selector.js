// js/trip-center-selector.js - Let users choose their trip center

let tripCenterState = {
  currentCenter: null,
  searchResults: [],
  isSearching: false,
  selectedLocation: null
};

/**
 * Initialize trip center selector
 */
function initTripCenterSelector(tripData) {
  // Set initial center from trip data
  tripCenterState.currentCenter = calculateTripCenter();
  
  // Render the selector UI
  renderTripCenterUI();
  attachTripCenterListeners();
}

/**
 * Render trip center selector UI
 */
function renderTripCenterUI() {
  const section = document.querySelector('.recommendations-section');
  if (!section) return;

  const center = tripCenterState.currentCenter;
  const centerName = center?.formatted || 'Trip Center';

  const html = `
    <div class="trip-center-banner">
      <div class="trip-center-info">
        <div class="trip-center-icon">
          <i class="fas fa-crosshairs"></i>
        </div>
        <div class="trip-center-details">
          <div class="trip-center-label">Recommendations Center Point</div>
          <div class="trip-center-name">${escapeHtml(centerName)}</div>
          <div class="trip-center-coords">${center?.lat?.toFixed(4)}, ${center?.lon?.toFixed(4)}</div>
        </div>
      </div>
      <button class="btn-change-center" id="btnChangeCenter">
        <i class="fas fa-map-marker-alt"></i>
        Change Location
      </button>
    </div>
  `;

  // Insert before filters
  const filters = section.querySelector('.recommendations-filters');
  if (filters) {
    filters.insertAdjacentHTML('beforebegin', html);
  } else {
    section.insertAdjacentHTML('afterbegin', html);
  }
}

/**
 * Attach event listeners
 */
function attachTripCenterListeners() {
  const btn = document.getElementById('btnChangeCenter');
  if (btn) {
    btn.onclick = openTripCenterModal;
  }
}

/**
 * Open trip center selection modal
 */
function openTripCenterModal() {
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.id = 'tripCenterModal';
  
  modal.innerHTML = `
    <div class="modal-content modal-large">
      <div class="modal-header">
        <h3>
          <i class="fas fa-map-marker-alt"></i>
          Choose Your Trip Center
        </h3>
        <button class="modal-close" onclick="closeTripCenterModal()">&times;</button>
      </div>
      
      <div class="modal-body">
        <div class="trip-center-explanation">
          <i class="fas fa-info-circle"></i>
          <p>Set a center point for your trip. AI will use this to calculate distances and find nearby places.</p>
        </div>

        <!-- Search Box -->
        <div class="trip-center-search">
          <div class="search-input-group">
            <i class="fas fa-search"></i>
            <input 
              type="text" 
              id="tripCenterSearch" 
              placeholder="Search for a landmark, hotel, or address..."
              autocomplete="off"
            >
            <button class="btn-search-clear" id="btnSearchClear" style="display: none;">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="search-results" id="searchResults"></div>
        </div>

        <!-- Quick Options -->
        <div class="trip-center-quick-options">
          <h4>Quick Options</h4>
          <div class="quick-options-grid">
            <button class="quick-option-btn" onclick="useCurrentLocation()">
              <i class="fas fa-location-arrow"></i>
              <span>Use My Location</span>
            </button>
            <button class="quick-option-btn" onclick="useDestinationCenter()">
              <i class="fas fa-city"></i>
              <span>City Center</span>
            </button>
            <button class="quick-option-btn" onclick="useFirstPlace()">
              <i class="fas fa-map-pin"></i>
              <span>First Added Place</span>
            </button>
          </div>
        </div>

        <!-- Selected Location Preview -->
        <div class="selected-location-preview" id="selectedLocationPreview" style="display: none;">
          <div class="preview-header">
            <h4>Selected Location</h4>
            <button class="btn-preview-clear" onclick="clearSelection()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="preview-content" id="previewContent"></div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeTripCenterModal()">Cancel</button>
        <button class="btn-primary" id="btnSaveCenter" disabled>
          <i class="fas fa-check"></i>
          Set as Center
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  
  // Attach search listeners
  const searchInput = document.getElementById('tripCenterSearch');
  const clearBtn = document.getElementById('btnSearchClear');
  const saveBtn = document.getElementById('btnSaveCenter');

  let searchTimeout;
  searchInput.oninput = (e) => {
    const query = e.target.value.trim();
    
    // Show/hide clear button
    clearBtn.style.display = query ? 'flex' : 'none';
    
    // Debounced search
    clearTimeout(searchTimeout);
    if (query.length >= 3) {
      searchTimeout = setTimeout(() => searchLocations(query), 500);
    } else {
      document.getElementById('searchResults').innerHTML = '';
    }
  };

  clearBtn.onclick = () => {
    searchInput.value = '';
    clearBtn.style.display = 'none';
    document.getElementById('searchResults').innerHTML = '';
  };

  saveBtn.onclick = saveTripCenter;
  
  // Focus search input
  setTimeout(() => searchInput.focus(), 100);
}

/**
 * Search for locations using Geoapify
 */
async function searchLocations(query) {
  const resultsContainer = document.getElementById('searchResults');
  
  resultsContainer.innerHTML = `
    <div class="search-loading">
      <i class="fas fa-spinner fa-spin"></i>
      Searching...
    </div>
  `;

  try {
    // Get current trip destination for bias
    const destination = recommendationsState.tripData?.destination || '';
    const searchQuery = `${query}, ${destination}`;
    
    // Use Geoapify geocoding
    const GEOAPIFY_KEY = 'd7783f671a844052821fdfa43df3109f'; // From your env
    const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(searchQuery)}&apiKey=${GEOAPIFY_KEY}&limit=8`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      tripCenterState.searchResults = data.features.map(feature => ({
        name: feature.properties.name || feature.properties.formatted,
        address: feature.properties.formatted,
        lat: feature.properties.lat,
        lon: feature.properties.lon,
        type: feature.properties.result_type,
        city: feature.properties.city,
        country: feature.properties.country
      }));
      
      displaySearchResults();
    } else {
      resultsContainer.innerHTML = `
        <div class="search-empty">
          <i class="fas fa-search"></i>
          <p>No locations found. Try a different search.</p>
        </div>
      `;
    }
  } catch (err) {
    console.error('Search error:', err);
    resultsContainer.innerHTML = `
      <div class="search-error">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Search failed. Please try again.</p>
      </div>
    `;
  }
}

/**
 * Display search results
 */
function displaySearchResults() {
  const resultsContainer = document.getElementById('searchResults');
  const results = tripCenterState.searchResults;
  
  if (results.length === 0) {
    resultsContainer.innerHTML = '<div class="search-empty">No results found</div>';
    return;
  }

  resultsContainer.innerHTML = results.map((result, index) => `
    <div class="search-result-item" onclick="selectLocation(${index})">
      <div class="result-icon">
        <i class="fas fa-${getLocationIcon(result.type)}"></i>
      </div>
      <div class="result-details">
        <div class="result-name">${escapeHtml(result.name)}</div>
        <div class="result-address">${escapeHtml(result.address)}</div>
      </div>
      <div class="result-action">
        <i class="fas fa-chevron-right"></i>
      </div>
    </div>
  `).join('');
}

/**
 * Get icon for location type
 */
function getLocationIcon(type) {
  const icons = {
    amenity: 'building',
    street: 'road',
    house: 'home',
    city: 'city',
    suburb: 'map',
    postcode: 'mail-bulk'
  };
  return icons[type] || 'map-marker-alt';
}

/**
 * Select a location from search results
 */
function selectLocation(index) {
  const location = tripCenterState.searchResults[index];
  tripCenterState.selectedLocation = location;
  
  // Show preview
  const preview = document.getElementById('selectedLocationPreview');
  const previewContent = document.getElementById('previewContent');
  
  previewContent.innerHTML = `
    <div class="preview-location">
      <div class="preview-icon">
        <i class="fas fa-map-marker-alt"></i>
      </div>
      <div class="preview-info">
        <div class="preview-name">${escapeHtml(location.name)}</div>
        <div class="preview-address">${escapeHtml(location.address)}</div>
        <div class="preview-coords">
          <i class="fas fa-globe"></i>
          ${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}
        </div>
      </div>
    </div>
  `;
  
  preview.style.display = 'block';
  
  // Enable save button
  document.getElementById('btnSaveCenter').disabled = false;
  
  // Clear search
  document.getElementById('tripCenterSearch').value = '';
  document.getElementById('searchResults').innerHTML = '';
  document.getElementById('btnSearchClear').style.display = 'none';
}

/**
 * Clear selected location
 */
function clearSelection() {
  tripCenterState.selectedLocation = null;
  document.getElementById('selectedLocationPreview').style.display = 'none';
  document.getElementById('btnSaveCenter').disabled = true;
}

/**
 * Use current browser location
 */
function useCurrentLocation() {
  if (!navigator.geolocation) {
    showToast('Geolocation not supported by your browser', 'error');
    return;
  }

  showToast('Getting your location...', 'info');
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      tripCenterState.selectedLocation = {
        name: 'My Current Location',
        address: 'Current GPS Position',
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        type: 'current'
      };
      
      selectLocation(0);
      tripCenterState.searchResults = [tripCenterState.selectedLocation];
      showToast('Location obtained!', 'success');
    },
    (error) => {
      showToast('Failed to get location: ' + error.message, 'error');
    }
  );
}

/**
 * Use destination city center
 */
async function useDestinationCenter() {
  const destination = recommendationsState.tripData?.destination;
  if (!destination) {
    showToast('No destination set', 'error');
    return;
  }

  showToast('Finding city center...', 'info');
  
  try {
    const GEOAPIFY_KEY = 'd7783f671a844052821fdfa43df3109f';
    const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(destination)}&apiKey=${GEOAPIFY_KEY}&limit=1`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      tripCenterState.selectedLocation = {
        name: destination + ' City Center',
        address: feature.properties.formatted,
        lat: feature.properties.lat,
        lon: feature.properties.lon,
        type: 'city'
      };
      
      tripCenterState.searchResults = [tripCenterState.selectedLocation];
      selectLocation(0);
      showToast('City center found!', 'success');
    }
  } catch (err) {
    showToast('Failed to find city center', 'error');
  }
}

/**
 * Use first added place as center
 */
function useFirstPlace() {
  if (!allPlaces || allPlaces.length === 0) {
    showToast('No places added yet', 'warning');
    return;
  }

  const firstPlace = allPlaces.find(p => 
    p.location && p.location.coordinates && p.location.coordinates.length === 2
  );

  if (!firstPlace) {
    showToast('No places with coordinates found', 'warning');
    return;
  }

  tripCenterState.selectedLocation = {
    name: firstPlace.name,
    address: firstPlace.address || 'Added Place',
    lat: firstPlace.location.coordinates[1],
    lon: firstPlace.location.coordinates[0],
    type: 'place'
  };

  tripCenterState.searchResults = [tripCenterState.selectedLocation];
  selectLocation(0);
  showToast('Using ' + firstPlace.name, 'success');
}

/**
 * Save trip center
 */
async function saveTripCenter() {
  if (!tripCenterState.selectedLocation) {
    showToast('Please select a location', 'warning');
    return;
  }

  const btn = document.getElementById('btnSaveCenter');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

  try {
    const location = tripCenterState.selectedLocation;
    
    // Update trip with new center coordinates
    await apiService.trips.update(recommendationsState.currentTripId, {
      destinationCoords: [location.lon, location.lat]
    });

    // Update local state
    tripCenterState.currentCenter = {
      lat: location.lat,
      lon: location.lon,
      formatted: location.name
    };

    // Update UI
    updateTripCenterBanner();
    
    showToast('Trip center updated!', 'success');
    closeTripCenterModal();

    // Reload recommendations with new center
    if (typeof loadRecommendations === 'function') {
      showToast('Reloading recommendations...', 'info');
      await loadRecommendations();
    }

  } catch (err) {
    console.error('Error saving trip center:', err);
    showToast('Failed to save trip center', 'error');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-check"></i> Set as Center';
  }
}

/**
 * Update trip center banner
 */
function updateTripCenterBanner() {
  const banner = document.querySelector('.trip-center-banner');
  if (!banner) return;

  const center = tripCenterState.currentCenter;
  const nameEl = banner.querySelector('.trip-center-name');
  const coordsEl = banner.querySelector('.trip-center-coords');

  if (nameEl) nameEl.textContent = center.formatted || 'Trip Center';
  if (coordsEl) coordsEl.textContent = `${center.lat.toFixed(4)}, ${center.lon.toFixed(4)}`;
}

/**
 * Close trip center modal
 */
function closeTripCenterModal() {
  const modal = document.getElementById('tripCenterModal');
  if (modal) modal.remove();
}

/**
 * Get current trip center (from recommendations-enhanced.js)
 */
function calculateTripCenter() {
  const trip = recommendationsState.tripData;
  
  if (!trip) {
    return { lat: 20.5937, lon: 78.9629, formatted: 'Default Location' };
  }
  
  if (trip.destinationCoords && Array.isArray(trip.destinationCoords) && trip.destinationCoords.length === 2) {
    return { 
      lat: trip.destinationCoords[1], 
      lon: trip.destinationCoords[0],
      formatted: trip.destination || 'Trip Center'
    };
  }
  
  if (trip.location && trip.location.coordinates && trip.location.coordinates.length === 2) {
    return { 
      lat: trip.location.coordinates[1], 
      lon: trip.location.coordinates[0],
      formatted: trip.destination || 'Trip Center'
    };
  }
  
  return { lat: 20.5937, lon: 78.9629, formatted: 'Default Location' };
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Export for use in other modules
window.initTripCenterSelector = initTripCenterSelector;
window.tripCenterState = tripCenterState;