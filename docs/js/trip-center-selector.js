// =====================================================================
// TRIP CENTER SELECTOR - FINAL VERSION WITH API KEY FALLBACKS
// =====================================================================

let tripCenterState = {
  currentCenter: null,
  searchResults: [],
  isSearching: false,
  selectedLocation: null,
  geoapifyApiKey: null // Will be loaded from backend or config
}

// -------------------------------------------------------
// UTILITY FUNCTIONS (defined first)
// -------------------------------------------------------
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// -------------------------------------------------------
// API KEY LOADING WITH MULTIPLE FALLBACK OPTIONS
// -------------------------------------------------------
async function loadGeoapifyApiKey() {
  // Option 1: Try to load from backend endpoint
  try {
    const baseURL = apiService.baseURL || 'http://localhost:5000/api'
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
        console.log('✓ Geoapify API key loaded from backend')
        return true
      }
    }
  } catch (error) {
    console.warn('Backend API key endpoint not available:', error.message)
  }

  // Option 2: Try to load from window config (if set in HTML)
  if (window.GEOAPIFY_API_KEY) {
    tripCenterState.geoapifyApiKey = window.GEOAPIFY_API_KEY
    console.log('✓ Geoapify API key loaded from window config')
    return true
  }

  // Option 3: Try to load from config.js if it exists
  if (typeof CONFIG !== 'undefined' && CONFIG.GEOAPIFY_API_KEY) {
    tripCenterState.geoapifyApiKey = CONFIG.GEOAPIFY_API_KEY
    console.log('✓ Geoapify API key loaded from CONFIG')
    return true
  }

  console.error('❌ Failed to load Geoapify API key from any source')
  console.info('ℹ️  To fix this, add the API key in one of these ways:')
  console.info('   1. Create backend endpoint: GET /api/config/geoapify-api-key')
  console.info('   2. Add to HTML: <script>window.GEOAPIFY_API_KEY = "your_key"</script>')
  console.info('   3. Add to config.js: CONFIG.GEOAPIFY_API_KEY = "your_key"')
  return false
}

// -------------------------------------------------------
// GEOCODING
// -------------------------------------------------------
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
    console.error('Geocoding API error:', err)
  }

  return null
}

// -------------------------------------------------------
// SAVE COORDINATES
// -------------------------------------------------------
async function saveTripCoordinates(tripId, coords) {
  try {
    if (typeof apiService === 'undefined') {
      console.warn('apiService not available, skipping coordinate save')
      return
    }

    await apiService.trips.update(tripId, {
      destinationCoords: coords
    })
    
    console.log('✓ Saved coordinates to trip:', coords)
  } catch (err) {
    console.error('Failed to save coordinates:', err.message)
  }
}

// -------------------------------------------------------
// CALCULATE CENTER FROM PLACES
// -------------------------------------------------------
async function calculateCenterFromPlaces(tripId) {
  try {
    if (typeof apiService === 'undefined') return null
    
    const res = await apiService.places.getByTrip(tripId)
    const places = res.data || []

    if (places.length === 0) return null

    // Calculate average coordinates
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

// -------------------------------------------------------
// CALCULATE TRIP CENTER (MAIN LOGIC)
// -------------------------------------------------------
async function calculateTripCenter(tripData) {
  if (!tripData) {
    console.warn('No trip data provided')
    return { lat: 20.5937, lon: 78.9629, formatted: 'Default Location' }
  }

  // Priority 1: Use saved coordinates if they exist
  if (tripData.destinationCoords && tripData.destinationCoords.length === 2) {
    console.log('✓ Using saved trip coordinates')
    return {
      lat: tripData.destinationCoords[1],
      lon: tripData.destinationCoords[0],
      formatted: tripData.destination || 'Trip Center'
    }
  }

  // Priority 2: Geocode the destination automatically (only if API key is loaded)
  if (tripData.destination && tripCenterState.geoapifyApiKey) {
    console.log('📍 Auto-geocoding destination:', tripData.destination)
    
    try {
      const geocoded = await geocodeDestination(tripData.destination)
      
      if (geocoded) {
        console.log('✓ Geocoded successfully:', geocoded.formatted)
        
        // Save coordinates to trip for future use
        await saveTripCoordinates(tripData._id, [geocoded.lon, geocoded.lat])
        
        return {
          lat: geocoded.lat,
          lon: geocoded.lon,
          formatted: geocoded.formatted || tripData.destination
        }
      }
    } catch (err) {
      console.error('Geocoding failed:', err.message)
    }
  } else if (tripData.destination && !tripCenterState.geoapifyApiKey) {
    console.warn('⚠️  Skipping geocoding - API key not available')
  }

  // Priority 3: Calculate from added places
  if (tripData._id) {
    try {
      const center = await calculateCenterFromPlaces(tripData._id)
      if (center) {
        console.log('✓ Calculated center from places:', center)
        return center
      }
    } catch (err) {
      console.error('Failed to calculate from places:', err.message)
    }
  }

  // Fallback: Default location (center of India)
  console.warn('⚠️  Using default location - consider adding coordinates or enabling geocoding')
  return { 
    lat: 20.5937, 
    lon: 78.9629, 
    formatted: tripData.destination || 'Default Location' 
  }
}

// -------------------------------------------------------
// UI RENDERING
// -------------------------------------------------------
function renderTripCenterUI() {
  const section = document.querySelector('.recommendations-section')
  if (!section) return

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

  // Insert above filters if they exist
  const filters = section.querySelector('.recommendations-filters')
  if (filters) {
    filters.insertAdjacentHTML('beforebegin', html)
  } else {
    section.insertAdjacentHTML('afterbegin', html)
  }
}

function attachTripCenterListeners() {
  const btn = document.getElementById('btnChangeCenter')
  if (btn) btn.onclick = openTripCenterModal
}

function updateTripCenterBanner() {
  const banner = document.querySelector('.trip-center-banner')
  if (!banner) return

  banner.querySelector('.trip-center-name').textContent =
    tripCenterState.currentCenter.formatted

  banner.querySelector('.trip-center-coords').textContent =
    `${tripCenterState.currentCenter.lat.toFixed(4)}, ${tripCenterState.currentCenter.lon.toFixed(4)}`
}

// -------------------------------------------------------
// MAIN INITIALIZATION FUNCTION
// -------------------------------------------------------
async function initTripCenterSelector(tripData) {
  console.log('🚀 Initializing trip center with data:', tripData)
  
  // Load API key first
  await loadGeoapifyApiKey()
  
  // Calculate center automatically from trip destination
  tripCenterState.currentCenter = await calculateTripCenter(tripData)
  
  console.log('📍 Trip center calculated:', tripCenterState.currentCenter)

  // Render UI and attach events
  renderTripCenterUI()
  attachTripCenterListeners()
}

// -------------------------------------------------------
// MODAL FUNCTIONS
// -------------------------------------------------------
function openTripCenterModal() {
  // Check if geocoding is available
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
        <!-- Search -->
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

        <!-- Quick Options -->
        <div class="trip-center-quick-options">
          <h4>Quick Options</h4>
          <div class="quick-options-grid">
            <button onclick="useDestinationCenter()" ${!canSearch ? 'disabled title="API key required"' : ''}>
              <i class="fas fa-city"></i> City Center
            </button>
            <button onclick="useFirstPlace()">
              <i class="fas fa-map-pin"></i> First Added Place
            </button>
            <button onclick="usePlacesAverage()">
              <i class="fas fa-map-marked-alt"></i> Average of Places
            </button>
          </div>
        </div>

        <!-- Selected Preview -->
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

// -------------------------------------------------------
// SEARCH FUNCTIONS
// -------------------------------------------------------
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

    tripCenterState.searchResults = data.features.map(f => ({
      name: f.properties.name || f.properties.formatted,
      address: f.properties.formatted,
      lat: f.properties.lat,
      lon: f.properties.lon,
      type: f.properties.result_type
    }))

    displaySearchResults()
  } catch (err) {
    console.error(err)
    resultsContainer.innerHTML = `<div class="search-error">Search failed</div>`
  }
}

function displaySearchResults() {
  const container = document.getElementById('searchResults')

  container.innerHTML = tripCenterState.searchResults
    .map((r, i) => `
      <div class="search-result-item" onclick="selectLocation(${i})">
        <i class="fas fa-map-marker-alt"></i>
        <div>
          <div>${escapeHtml(r.name)}</div>
          <small>${escapeHtml(r.address)}</small>
        </div>
      </div>
    `).join('')
}

function selectLocation(index) {
  const loc = tripCenterState.searchResults[index]
  tripCenterState.selectedLocation = loc

  document.getElementById('previewContent').innerHTML = `
    <strong>${escapeHtml(loc.name)}</strong><br>
    ${escapeHtml(loc.address)}<br>
    ${loc.lat.toFixed(4)}, ${loc.lon.toFixed(4)}
  `

  document.getElementById('selectedLocationPreview').style.display = 'block'
  document.getElementById('btnSaveCenter').disabled = false
}

// -------------------------------------------------------
// QUICK OPTIONS
// -------------------------------------------------------
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

  // Show loading state
  const previewEl = document.getElementById('selectedLocationPreview')
  const previewContent = document.getElementById('previewContent')
  const saveBtn = document.getElementById('btnSaveCenter')
  
  if (previewEl && previewContent) {
    previewEl.style.display = 'block'
    previewContent.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Geocoding destination...'
    saveBtn.disabled = true
  }

  const geocoded = await geocodeDestination(tripData.destination)
  
  if (geocoded) {
    tripCenterState.selectedLocation = {
      name: tripData.destination,
      address: geocoded.formatted,
      lat: geocoded.lat,
      lon: geocoded.lon
    }
    
    // Show preview
    if (previewContent) {
      previewContent.innerHTML = `
        <strong>${escapeHtml(tripData.destination)}</strong><br>
        ${escapeHtml(geocoded.formatted)}<br>
        ${geocoded.lat.toFixed(4)}, ${geocoded.lon.toFixed(4)}
      `
    }
    if (saveBtn) {
      saveBtn.disabled = false
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
      tripCenterState.selectedLocation = {
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
      document.getElementById('btnSaveCenter').disabled = false
    }
  } catch (err) {
    showToast('Failed to load places', 'error')
  }
}

async function usePlacesAverage() {
  try {
    const res = await apiService.places.getByTrip(recommendationsState.currentTripId)
    const places = res.data || []
    
    if (places.length === 0) {
      showToast('No places added yet', 'warning')
      return
    }

    let totalLat = 0, totalLon = 0, count = 0
    places.forEach(p => {
      if (p.location?.coordinates?.length === 2) {
        totalLon += p.location.coordinates[0]
        totalLat += p.location.coordinates[1]
        count++
      }
    })

    if (count === 0) {
      showToast('No valid coordinates found', 'warning')
      return
    }

    tripCenterState.selectedLocation = {
      name: 'Average of All Places',
      address: `Calculated from ${count} places`,
      lon: totalLon / count,
      lat: totalLat / count
    }

    document.getElementById('previewContent').innerHTML = `
      <strong>Average of All Places</strong><br>
      Calculated from ${count} places<br>
      ${(totalLat / count).toFixed(4)}, ${(totalLon / count).toFixed(4)}
    `
    document.getElementById('selectedLocationPreview').style.display = 'block'
    document.getElementById('btnSaveCenter').disabled = false
  } catch (err) {
    showToast('Failed to calculate average', 'error')
  }
}

function clearSelection() {
  tripCenterState.selectedLocation = null
  document.getElementById('selectedLocationPreview').style.display = 'none'
  document.getElementById('btnSaveCenter').disabled = true
}

// -------------------------------------------------------
// SAVE CENTER
// -------------------------------------------------------
async function saveTripCenter() {
  if (!tripCenterState.selectedLocation) return

  const loc = tripCenterState.selectedLocation

  try {
    await apiService.trips.update(recommendationsState.currentTripId, {
      destinationCoords: [loc.lon, loc.lat]
    })

    tripCenterState.currentCenter = {
      lat: loc.lat,
      lon: loc.lon,
      formatted: loc.name
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

// -------------------------------------------------------
// EXPORTS
// -------------------------------------------------------
window.initTripCenterSelector = initTripCenterSelector
window.tripCenterState = tripCenterState
window.useDestinationCenter = useDestinationCenter
window.useFirstPlace = useFirstPlace
window.usePlacesAverage = usePlacesAverage
window.clearSelection = clearSelection
window.closeTripCenterModal = closeTripCenterModal
