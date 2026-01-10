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
  let tripData = {
    title: formData.get('title'),
    destination: formData.get('destination'),
    startDate: formData.get('startDate'),
    endDate: formData.get('endDate'),
    budget: formData.get('budget') ? parseFloat(formData.get('budget')) : undefined,
    description: formData.get('description'),
    isPublic: formData.get('isPublic') === 'on',
    status: 'draft',
  }

  let tagsInput = formData.get('tags')
  if (tagsInput) {
    tripData.tags = tagsInput.split(',').map(tag => tag.trim()).filter(Boolean)
  }
  let submitBtn = document.getElementById('createTripBtn')
  let originalText = submitBtn.innerHTML
  
  try {
    submitBtn.disabled = true
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...'
    let response = await apiService.trips.create(tripData)
    if (response.success) {
      showToast('Trip created successfully!', 'success')
      setTimeout(() => {
        window.location.href = `/link?id=${response.data._id}`
      }, 1000)
    } else {
      throw new Error(response.message || 'Failed to create trip')
    }
  } catch (error) {
    console.error('Error creating trip:', error)
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
    let response = await fetch(
      `https://nominatim.openstreetmap.org/search?` + 
      `q=${encodeURIComponent(destination)}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'Planora/1.0'
        }
      }
    )
    let data = await response.json()
    
    if (data.length > 0) {
      let { lat, lon, display_name } = data[0]
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
        .bindPopup(display_name)
        .openPopup()
    }
  } catch (error) {
    console.error('Geocoding failed:', error)
  }
}

function updateMapLocation() {
  let destination = document.getElementById('destination').value;
  // Implement geocoding to update map location
  // This would require integration with a geocoding service
}

// Initialize map if Leaflet is loaded
if (typeof L !== 'undefined') {
  setTimeout(initializeMap, 100)
}