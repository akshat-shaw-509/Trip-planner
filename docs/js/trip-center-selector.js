let tripCenterState = {
  currentCenter: null,
  searchResults: [],
  isSearching: false,
  selectedLocation: null
  // ❌ REMOVE THIS LINE: geoapifyApiKey: null
}

// ❌ DELETE THIS ENTIRE FUNCTION - You don't need it anymore
/*
async function loadGeoapifyApiKey() {
  // DELETE ALL OF THIS
}
*/

// ✅ UPDATE: Initialize without loading API key
async function initTripCenterSelector(tripData) {
  console.log('Initializing trip center with data:', tripData)
  
  // ❌ REMOVE THIS LINE
  // await loadGeoapifyApiKey()
  
  // Calculate center automatically from trip destination
  tripCenterState.currentCenter = await calculateTripCenter(tripData)
  
  console.log('Trip center calculated:', tripCenterState.currentCenter)

  // Render UI and attach events
  renderTripCenterUI()
  attachTripCenterListeners()
}

// ✅ UPDATE: Use backend API for geocoding
async function geocodeDestination(destination) {
  const baseURL = apiService.baseURL || 'http://localhost:5000/api'
  
  try {
    console.log('Geocoding via backend:', destination)
    
    const response = await fetch(`${baseURL}/geocode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ location: destination })
    })

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status}`)
    }

    const result = await response.json()
    
    if (result.success && result.data) {
      console.log('✓ Geocoded successfully:', result.data.formatted)
      return result.data
    }
    
    console.error('Geocoding failed:', result.error)
    return null
  } catch (err) {
    console.error('Geocoding API error:', err)
    return null
  }
}

// ✅ UPDATE: Search locations via backend
async function searchLocations(query) {
  const resultsContainer = document.getElementById('searchResults')
  resultsContainer.innerHTML = `<div class="search-loading">
    <i class="fas fa-spinner fa-spin"></i> Searching...
  </div>`

  try {
    const destination = recommendationsState.tripData?.destination || ''
    const searchQuery = destination ? `${query}, ${destination}` : query
    
    const baseURL = apiService.baseURL || 'http://localhost:5000/api'
    const response = await fetch(`${baseURL}/geocode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ location: searchQuery })
    })

    if (!response.ok) {
      throw new Error('Search failed')
    }

    const result = await response.json()
    
    if (!result.success || !result.data) {
      resultsContainer.innerHTML = `<div class="search-empty">No results found</div>`
      return
    }

    // Convert single result to array format
    tripCenterState.searchResults = [{
      name: result.data.city || result.data.formatted,
      address: result.data.formatted,
      lat: result.data.lat,
      lon: result.data.lon,
      type: 'geocoded'
    }]

    displaySearchResults()
  } catch (err) {
    console.error(err)
    resultsContainer.innerHTML = `<div class="search-error">Search failed</div>`
  }
}
