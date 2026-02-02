let tripCenterState = {
  currentCenter: null,
  geoapifyApiKey: null
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

async function loadGeoapifyApiKey() {
  if (window.CONFIG && window.CONFIG.GEOAPIFY_API_KEY) {
    tripCenterState.geoapifyApiKey = window.CONFIG.GEOAPIFY_API_KEY
    return true
  }
  
  try {
    const baseURL = window.CONFIG?.API_BASE_URL || apiService?.baseURL || 'http://localhost:5000/api'
    const token = sessionStorage.getItem('accessToken')
    const response = await fetch(`${baseURL}/config/geoapify-api-key`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data.success && data.apiKey) {
        tripCenterState.geoapifyApiKey = data.apiKey
        return true
      }
    }
  } catch (err) {
    console.error('Failed to load API key:', err)
  }
  
  if (window.GEOAPIFY_API_KEY) {
    tripCenterState.geoapifyApiKey = window.GEOAPIFY_API_KEY
    return true
  }
  
  return false
}

async function geocodeDestination(destination) {
  if (!tripCenterState.geoapifyApiKey) {
    console.error('Geoapify API key not loaded')
    return null
  }
  
  const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(destination)}&apiKey=${tripCenterState.geoapifyApiKey}&limit=1&format=json`
  
  try {
    const res = await fetch(url)
    const data = await res.json()
    if (data.results && data.results.length > 0) {
      const result = data.results[0]
      return {
        lat: result.lat,
        lon: result.lon,
        formatted: result.formatted,
        city: result.city,
        country: result.country
      }
    }
  } catch (err) {
    console.error('Geocoding error:', err)
  }
  
  return null
}

async function saveTripCoordinates(tripId, coords) {
  try {
    if (typeof apiService === 'undefined') {
      console.warn('apiService not available, skipping coordinate save')
      return
    }
    await apiService.trips.update(tripId, {
      destinationCoords: coords
    })
    console.log('Saved coordinates to trip:', coords)
  } catch (err) {
    console.error('Failed to save coordinates:', err.message)
  }
}

async function calculateCenterFromPlaces(tripId) {
  try {
    if (typeof apiService === 'undefined') return null
    
    const res = await apiService.places.getByTrip(tripId)
    const places = res.data || []

    if (places.length === 0) return null

    let totalLat = 0
    let totalLon = 0
    let count = 0

    places.forEach(place => {
      if (place.location?.coordinates?.length === 2) {
        totalLon += place.location.coordinates[0]
        totalLat += place.location.coordinates[1]
        count++
      }
    })

    if (count === 0) return null

    return {
      lat: totalLat / count,
      lon: totalLon / count,
      formatted: 'Center of Added Places'
    }
  } catch (err) {
    console.error('Error calculating center from places:', err)
    return null
  }
}

async function calculateTripCenter(tripData) {
  if (!tripData) {
    console.warn('No trip data provided')
    return { lat: 20.5937, lon: 78.9629, formatted: 'Default Location' }
  }
  
  // Check if coordinates already saved
  if (tripData.destinationCoords && tripData.destinationCoords.length === 2) {
    return {
      lat: tripData.destinationCoords[1],
      lon: tripData.destinationCoords[0],
      formatted: tripData.destination || 'Trip Center'
    }
  }

  // Try geocoding destination
  if (tripData.destination && tripCenterState.geoapifyApiKey) {
    const searchQuery = tripData.country 
      ? `${tripData.destination}, ${tripData.country}`
      : tripData.destination
    
    const geocoded = await geocodeDestination(searchQuery)
    
    if (geocoded) {
      await saveTripCoordinates(tripData._id, [geocoded.lon, geocoded.lat])
      return {
        lat: geocoded.lat,
        lon: geocoded.lon,
        formatted: geocoded.formatted || tripData.destination
      }
    } 
  } else if (tripData.destination && !tripCenterState.geoapifyApiKey) {
    console.warn('Skipping geocoding - API key not available')
  }

  // Try calculating from places
  if (tripData._id) {
    try {
      const center = await calculateCenterFromPlaces(tripData._id)
      if (center) {
        return center
      }
    } catch (err) {
      console.error('Failed to calculate from places:', err.message)
    }
  }

  // Fallback
  console.warn('Using default location - no coordinates available')
  return { 
    lat: 20.5937, 
    lon: 78.9629, 
    formatted: tripData.destination || 'Default Location' 
  }
}

function renderTripCenterUI() {
  const section = document.querySelector('.recommendations-section')
  if (!section) {
    return
  }

  const center = tripCenterState.currentCenter
  const centerName = center?.formatted || 'Trip Center'

  const html = `
    <div class="trip-center-banner">
      <div class="trip-center-info">
        <div class="trip-center-icon">
          <i class="fas fa-crosshairs"></i>
        </div>
        <div class="trip-center-details">
          <div class="trip-center-label">Recommendations Center Point</div>
          <div class="trip-center-name">${escapeHtml(centerName)}</div>
          <div class="trip-center-coords">
            ${center?.lat?.toFixed(4)}, ${center?.lon?.toFixed(4)}
          </div>
        </div>
      </div>
      <button class="btn-change-center" id="btnChangeCenter">
        <i class="fas fa-map-marker-alt"></i>
        Change Location
      </button>
    </div>
  `
  section.insertAdjacentHTML('afterbegin', html)
}

function attachTripCenterListeners() {
  const btn = document.getElementById('btnChangeCenter')
  if (btn) {
    btn.onclick = openTripCenterModal
  } else {
    console.warn('⚠️ Change center button not found')
  }
}

function updateTripCenterBanner() {
  const banner = document.querySelector('.trip-center-banner')
  if (!banner) return
  
  banner.querySelector('.trip-center-name').textContent =
    tripCenterState.currentCenter.formatted
  banner.querySelector('.trip-center-coords').textContent =
    `${tripCenterState.currentCenter.lat.toFixed(4)}, ${tripCenterState.currentCenter.lon.toFixed(4)}`
}

async function initTripCenterSelector(tripData) {
  await loadGeoapifyApiKey()
  
  if (!tripCenterState.geoapifyApiKey) {
    console.warn('Geoapify API key not available - search will be limited')
  }
  
  tripCenterState.currentCenter = await calculateTripCenter(tripData)
  renderTripCenterUI()
  attachTripCenterListeners()
}

function openTripCenterModal() {
  const canSearch = tripCenterState.geoapifyApiKey !== null
  const modal = document.createElement('div')
  modal.className = 'modal active'
  modal.id = 'tripCenterModal'
  
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
          <p>
            Set a center point for your trip. AI uses this to calculate
            distances and find nearby places.
          </p>
        </div>

        ${canSearch ? `
        <div class="trip-center-search">
          <div class="search-input-group">
            <i class="fas fa-search"></i>
            <input
              id="tripCenterSearch"
              type="text"
              placeholder="Search landmark, hotel, or address..."
              autocomplete="off"
            />
            <button id="btnSearchClear" style="display:none">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div id="searchResults" class="search-results"></div>
        </div>
        ` : `
        <div class="trip-center-warning" style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <i class="fas fa-exclamation-triangle" style="color: #856404;"></i>
          <strong>Search unavailable</strong> - Geoapify API key not configured. 
          You can still use the quick options below.
        </div>
        `}

        <div class="trip-center-quick-options">
          <h4>Quick Options</h4>
          <div class="quick-options-grid">
            <button onclick="useDestinationCenter()" ${!canSearch ? 'disabled title="API key required"' : ''}>
              <i class="fas fa-city"></i> City Center
            </button>
            <button onclick="useFirstPlace()">
              <i class="fas fa-map-pin"></i> First Added Place
            </button>
            <button onclick="useCurrentLocation()">
  <i class="fas fa-location-crosshairs"></i> My Current Location
</button>
          </div>
        </div>

        <div id="selectedLocationPreview" style="display:none">
          <div class="preview-header">
            <h4>Selected Location</h4>
            <button onclick="clearSelection()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div id="previewContent"></div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeTripCenterModal()">Cancel</button>
        <button class="btn-primary" id="btnSaveCenter" disabled>
          <i class="fas fa-check"></i> Set as Center
        </button>
      </div>
    </div>
  `
  
  document.body.appendChild(modal)
  
  if (canSearch) {
    setupSearchHandlers()
  }
}

function closeTripCenterModal() {
  document.getElementById('tripCenterModal')?.remove()
}

function setupSearchHandlers() {
  const input = document.getElementById('tripCenterSearch')
  const clearBtn = document.getElementById('btnSearchClear')
  const saveBtn = document.getElementById('btnSaveCenter')
  
  if (!input) return
  
  let timeout
  input.oninput = e => {
    const query = e.target.value.trim()
    clearBtn.style.display = query ? 'block' : 'none'
    clearTimeout(timeout)
    
    if (query.length >= 3) {
      timeout = setTimeout(() => searchLocations(query), 500)
    } else {
      document.getElementById('searchResults').innerHTML = ''
    }
  }

  clearBtn.onclick = () => {
    input.value = ''
    clearBtn.style.display = 'none'
    document.getElementById('searchResults').innerHTML = ''
  }
  
  saveBtn.onclick = saveTripCenter
}

async function searchLocations(query) {
  if (!tripCenterState.geoapifyApiKey) {
    console.error('Geoapify API key not loaded')
    showToast('Search unavailable - API key not loaded', 'error')
    return
  }
  
  const resultsContainer = document.getElementById('searchResults')
  resultsContainer.innerHTML = `<div class="search-loading">
    <i class="fas fa-spinner fa-spin"></i> Searching...
  </div>`

  try {
    const destination = recommendationsState.tripData?.destination || ''
    const searchQuery = destination ? `${query}, ${destination}` : query
    const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(searchQuery)}&apiKey=${tripCenterState.geoapifyApiKey}&limit=8`
    
    const res = await fetch(url)
    const data = await res.json()
    
    if (!data.features?.length) {
      resultsContainer.innerHTML = `<div class="search-empty">No results found</div>`
      return
    }

    const searchResults = data.features.map(f => ({
      name: f.properties.name || f.properties.formatted,
      address: f.properties.formatted,
      lat: f.properties.lat,
      lon: f.properties.lon,
      type: f.properties.result_type
    }))
    
    displaySearchResults(searchResults)
  } catch (err) {
    console.error(err)
    resultsContainer.innerHTML = `<div class="search-error">Search failed</div>`
  }
}

function displaySearchResults(results) {
  const container = document.getElementById('searchResults')
  container.innerHTML = results
    .map((r, i) => `
      <div class="search-result-item" onclick="selectLocation(${i}, ${escapeHtml(JSON.stringify(r))})">
        <i class="fas fa-map-marker-alt"></i>
        <div>
          <div>${escapeHtml(r.name)}</div>
          <small>${escapeHtml(r.address)}</small>
        </div>
      </div>
    `).join('')
}

function selectLocation(index, locationData) {
  const loc = typeof locationData === 'string' ? JSON.parse(locationData) : locationData
  
  document.getElementById('previewContent').innerHTML = `
    <strong>${escapeHtml(loc.name)}</strong><br>
    ${escapeHtml(loc.address)}<br>
    ${loc.lat.toFixed(4)}, ${loc.lon.toFixed(4)}
  `
  document.getElementById('selectedLocationPreview').style.display = 'block'
  document.getElementById('btnSaveCenter').disabled = false
  
  // Store in button's data attribute for later use
  document.getElementById('btnSaveCenter').dataset.selectedLocation = JSON.stringify(loc)
}

async function useDestinationCenter() {
  const tripData = recommendationsState?.tripData
  if (!tripData?.destination) {
    showToast('No destination set for this trip', 'error')
    return
  }

  if (!tripCenterState.geoapifyApiKey) {
    showToast('Geocoding unavailable - API key not configured', 'error')
    return
  }
  
  const previewEl = document.getElementById('selectedLocationPreview')
  const previewContent = document.getElementById('previewContent')
  const saveBtn = document.getElementById('btnSaveCenter')
  
  if (previewEl && previewContent) {
    previewEl.style.display = 'block'
    previewContent.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Geocoding destination...'
    saveBtn.disabled = true
  }
  
  const searchQuery = tripData.country 
    ? `${tripData.destination}, ${tripData.country}`
    : tripData.destination
    
  const geocoded = await geocodeDestination(searchQuery)
  
  if (geocoded) {
    const selectedLocation = {
      name: tripData.destination,
      address: geocoded.formatted,
      lat: geocoded.lat,
      lon: geocoded.lon
    }
    
    if (previewContent) {
      previewContent.innerHTML = `
        <strong>${escapeHtml(tripData.destination)}</strong><br>
        ${escapeHtml(geocoded.formatted)}<br>
        ${geocoded.lat.toFixed(4)}, ${geocoded.lon.toFixed(4)}
      `
    }
    if (saveBtn) {
      saveBtn.disabled = false
      saveBtn.dataset.selectedLocation = JSON.stringify(selectedLocation)
    }
    showToast('Destination center found!', 'success')
  } else {
    if (previewContent) {
      previewContent.innerHTML = '<span style="color: red;">Failed to geocode destination</span>'
    }
    showToast('Failed to find destination coordinates', 'error')
  }
}

async function useFirstPlace() {
  try {
    const res = await apiService.places.getByTrip(recommendationsState.currentTripId)
    const places = res.data || []
    
    if (places.length === 0) {
      showToast('No places added yet', 'warning')
      return
    }

    const first = places[0]
    if (first.location?.coordinates) {
      const selectedLocation = {
        name: first.name,
        address: first.address || '',
        lon: first.location.coordinates[0],
        lat: first.location.coordinates[1]
      }
      
      document.getElementById('previewContent').innerHTML = `
        <strong>${escapeHtml(first.name)}</strong><br>
        ${escapeHtml(first.address || 'No address')}<br>
        ${first.location.coordinates[1].toFixed(4)}, ${first.location.coordinates[0].toFixed(4)}
      `
      document.getElementById('selectedLocationPreview').style.display = 'block'
      const saveBtn = document.getElementById('btnSaveCenter')
      saveBtn.disabled = false
      saveBtn.dataset.selectedLocation = JSON.stringify(selectedLocation)
    }
  } catch (err) {
    showToast('Failed to load places', 'error')
  }
}

async function useCurrentLocation() {
  if (!navigator.geolocation) {
    showToast('Geolocation not supported by browser', 'error')
    return
  }
  
  const previewEl = document.getElementById('selectedLocationPreview')
  const previewContent = document.getElementById('previewContent')
  const saveBtn = document.getElementById('btnSaveCenter')
  
  previewEl.style.display = 'block'
  previewContent.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting your location...'
  saveBtn.disabled = true
  
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords
      
      const selectedLocation = {
        name: 'My Current Location',
        address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        lat: latitude,
        lon: longitude
      }
      
      previewContent.innerHTML = `
        <strong>My Current Location</strong><br>
        ${latitude.toFixed(4)}, ${longitude.toFixed(4)}
      `
      saveBtn.disabled = false
      saveBtn.dataset.selectedLocation = JSON.stringify(selectedLocation)
      showToast('Current location found!', 'success')
    },
    (error) => {
      previewContent.innerHTML = '<span style="color: red;">Failed to get location</span>'
      showToast('Please enable location access', 'error')
      console.error('Geolocation error:', error)
    }
  )
}

function clearSelection() {
  document.getElementById('selectedLocationPreview').style.display = 'none'
  const saveBtn = document.getElementById('btnSaveCenter')
  saveBtn.disabled = true
  delete saveBtn.dataset.selectedLocation
}

async function saveTripCenter() {
  const saveBtn = document.getElementById('btnSaveCenter')
  const selectedLocation = JSON.parse(saveBtn.dataset.selectedLocation || '{}')
  
  if (!selectedLocation.lat || !selectedLocation.lon) return

  try {
    await apiService.trips.update(recommendationsState.currentTripId, {
      destinationCoords: [selectedLocation.lon, selectedLocation.lat]
    })

    tripCenterState.currentCenter = {
      lat: selectedLocation.lat,
      lon: selectedLocation.lon,
      formatted: selectedLocation.name
    }

    updateTripCenterBanner()
    closeTripCenterModal()
    showToast('Trip center updated!', 'success')

    if (typeof loadRecommendations === 'function') {
      await loadRecommendations()
    }
  } catch (err) {
    console.error(err)
    showToast('Failed to save trip center', 'error')
  }
}

window.initTripCenterSelector = initTripCenterSelector
window.tripCenterState = tripCenterState
window.useDestinationCenter = useDestinationCenter
window.useFirstPlace = useFirstPlace
window.useCurrentLocation = useCurrentLocation
window.clearSelection = clearSelection
window.closeTripCenterModal = closeTripCenterModal
