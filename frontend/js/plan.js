// Handles trip creation, validation, authentication guard, and destination map preview

// ===================== Page Initialization =====================
document.addEventListener('DOMContentLoaded', () => {
  // Ensure user is authenticated before allowing trip creation
  if (!authHandler.requireAuth()) {
    return;
  }

  initializePlanningForm();

  // Pre-fill destination if coming from another page (e.g. recommendations)
  const prefilledDestination = sessionStorage.getItem('prefilledDestination');
  if (prefilledDestination) {
    document.getElementById('destination').value = prefilledDestination;
    sessionStorage.removeItem('prefilledDestination');
  }
});

// ===================== Form Setup =====================
function initializePlanningForm() {
  const form = document.getElementById('createTripForm');
  if (!form) return;

  // Prevent selecting past dates
  const today = new Date().toISOString().split('T')[0];
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');

  startDateInput.min = today;
  endDateInput.min = today;

  // Ensure end date is never before start date
  startDateInput.addEventListener('change', (e) => {
    const startDate = e.target.value;
    endDateInput.min = startDate;

    if (endDateInput.value && endDateInput.value < startDate) {
      endDateInput.value = '';
    }
  });

  // Handle form submission
  form.addEventListener('submit', handleTripCreation);
}

// ===================== Trip Creation =====================
async function handleTripCreation(e) {
  e.preventDefault();

  const formData = new FormData(e.target);

  // Parse comma-separated tags into an array
  const tagsInput = formData.get('tags');
  const tagsArray = tagsInput
    ? tagsInput.split(',').map(tag => tag.trim()).filter(Boolean)
    : [];

  // Construct payload for API
  const tripData = {
    title: formData.get('title'),
    destination: formData.get('destination'),
    startDate: formData.get('startDate'),
    endDate: formData.get('endDate'),
    budget: formData.get('budget')
      ? parseFloat(formData.get('budget'))
      : null,
    description: formData.get('description'),
    travelers: parseInt(formData.get('travelers')) || 1,
    tags: tagsArray,
    isPublic: formData.get('isPublic') === 'on',
    status: 'planning'
  };

  console.log('Creating trip:', tripData);

  const submitBtn = document.getElementById('createTripBtn');
  const originalText = submitBtn.innerHTML;

  try {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';

    const response = await apiService.trips.create(tripData);

    if (!response?.success) {
      throw new Error(response?.message || 'Trip creation failed');
    }

    showToast('Trip created successfully!', 'success');

    // Redirect to trip overview after short delay
    setTimeout(() => {
      window.location.href = `trip-overview.html?id=${response.data._id}`;
    }, 1000);

  } catch (error) {
    console.error('Trip creation error:', error);
    showToast(error.message || 'Failed to create trip', 'error');

    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
}

// ===================== Map Preview =====================
let map = null;

/**
 * Initialize Leaflet map for destination preview
 */
function initializeMap() {
  if (typeof L === 'undefined') return;

  map = L.map('map').setView([20.5937, 78.9629], 5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  // Update map when destination changes
  const destinationInput = document.getElementById('destination');
  if (destinationInput) {
    destinationInput.addEventListener('change', updateMapLocation);
  }
}

/**
 * Fetch coordinates for destination and update map
 */
async function updateMapLocation() {
  const destination = document.getElementById('destination').value;
  if (!destination || !map) return;

  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        destination
      )}&count=1&language=en&format=json`
    );

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      console.warn('Destination not found');
      return;
    }

    const { latitude, longitude, name, country } = data.results[0];

    map.setView([latitude, longitude], 10);

    // Remove existing markers
    map.eachLayer(layer => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Add marker for destination
    L.marker([latitude, longitude])
      .addTo(map)
      .bindPopup(`${name}, ${country}`)
      .openPopup();

  } catch (error) {
    console.error('Failed to update map location:', error);
  }
}

// Initialize map after Leaflet loads
if (typeof L !== 'undefined') {
  setTimeout(initializeMap, 100);
}
