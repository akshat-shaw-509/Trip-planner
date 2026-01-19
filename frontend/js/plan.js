document.addEventListener('DOMContentLoaded', () => {
  if (!authHandler.requireAuth()) {
    return
  }
  initializePlanningForm()
  
  let prefilledDestination = sessionStorage.getItem('prefilledDestination')
  if (prefilledDestination) {
    document.getElementById('destination').value = prefilledDestination
    sessionStorage.removeItem('prefilledDestination')
  }
})

function initializePlanningForm() {
  let form = document.getElementById('createTripForm')
  if (!form) return
  
  let today = new Date().toISOString().split('T')[0]
  document.getElementById('startDate').min = today
  document.getElementById('endDate').min = today
  document.getElementById('startDate').addEventListener('change', (e) => {
    let startDate = e.target.value
    document.getElementById('endDate').min = startDate
    
    let endDate = document.getElementById('endDate').value
    if (endDate && endDate < startDate) {
      document.getElementById('endDate').value = ''
    }
  })
  
  form.addEventListener('submit', handleTripCreation)
}

async function handleTripCreation(e) {
  e.preventDefault()
  let formData = new FormData(e.target)
  
  // Parse tags properly
  let tagsInput = formData.get('tags')
  let tagsArray = []
  if (tagsInput) {
    tagsArray = tagsInput.split(',').map(tag => tag.trim()).filter(Boolean)
  }

  let tripData = {
    title: formData.get('title'),
    destination: formData.get('destination'),
    startDate: formData.get('startDate'),
    endDate: formData.get('endDate'),
    budget: formData.get('budget') ? parseFloat(formData.get('budget')) : null, // Use null instead of undefined if empty
    description: formData.get('description'),
    travelers: parseInt(formData.get('travelers')) || 1, // <--- ADD THIS LINE (Reads travelers from form)
    tags: tagsArray, // <--- ADD THIS LINE (Pass the array)
    isPublic: formData.get('isPublic') === 'on',
    status: 'planning',
  }

  // DEBUGGING: Log what we are sending
  console.log('Sending Trip Data:', tripData)

  let submitBtn = document.getElementById('createTripBtn')
  let originalText = submitBtn.innerHTML
  
  try {
    submitBtn.disabled = true
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...'
    
    let response = await apiService.trips.create(tripData)
    
    if (response.success) {
      showToast('Trip created successfully!', 'success')
      setTimeout(() => {
        window.location.href = `trip-overview.html?id=${response.data._id}`
      }, 1000)
    } else {
      throw new Error(response.message || 'Failed to create trip')
    }
  } catch (error) {
    console.error('Error creating trip:', error)
    console.error('Full error object:', error) // Check console for more details
    showToast(error.message || 'Failed to create trip', 'error')
    submitBtn.disabled = false
    submitBtn.innerHTML = originalText
  }
}

let map
function initializeMap() {
  if (typeof L !== 'undefined') {
    map = L.map('map').setView([20.5937, 78.9629], 5)
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map)
    
    let destinationInput = document.getElementById('destination')
    if (destinationInput) {
      destinationInput.addEventListener('change', updateMapLocation)
    }
  }
}

async function updateMapLocation() {
  let destination = document.getElementById('destination').value
  if (!destination || !map) return

  try {
    // CHANGED: Use Open-Meteo instead of Nominatim (No API key needed, No CORS issues)
    let response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1&language=en&format=json`
    )
    let data = await response.json()

    // Open-Meteo returns { results: [...] } instead of just [...]
    if (data.results && data.results.length > 0) {
      // Open-Meteo uses 'latitude' and 'longitude'
      let { latitude, latitude: lat, longitude, longitude: lon, name, country } = data.results[0]
      
      // Destructure safely
      lat = latitude
      lon = longitude

      map.setView([lat, lon], 10)

      // Remove existing markers
      map.eachLayer(layer => {
        if (layer instanceof L.Marker) {
          map.removeLayer(layer)
        }
      })

      // Add new marker
      L.marker([lat, lon])
        .addTo(map)
        .bindPopup(`${name}, ${country}`)
        .openPopup()
    } else {
      console.log('Location not found')
    }
  } catch (error) {
    console.error('Geocoding failed:', error)
  }
}
// Initialize map if Leaflet is loaded
if (typeof L !== 'undefined') {
  setTimeout(initializeMap, 100)
}