let currentTrip = null;

let initTripOverview = async () => {
  if (!authHandler.requireAuth()) return
  let tripId = new URLSearchParams(window.location.search).get('id')
  if (!tripId) {
    showToast('Trip not found', 'error')
    setTimeout(() => window.location.href = '/trips', 2000)
    return
  }
  await loadTripOverview(tripId)
}

let loadTripOverview = async (tripId) => {
  try {
    let response = await apiService.trips.getById(tripId)
    if (response.success) {
      currentTrip = response.data
      displayTripOverview()
      await loadTripStats()
    } else {
      throw new Error('Trip not found')
    }
  } catch (error) {
    showToast('Failed to load trip', 'error')
    setTimeout(() => window.location.href = '/trips', 2000)
  }
}

let displayTripOverview = () => {
  let trip = currentTrip
  let banner = document.querySelector('.trip-banner img')
  if (banner && trip.coverImage) banner.src = trip.coverImage
  
  let title = document.querySelector('.trip-title')
  if (title) title.textContent = trip.title
  
  let subtitle = document.querySelector('.trip-subtitle')
  if (subtitle) {
    subtitle.innerHTML = `
      <i class="far fa-calendar"></i> ${formatDateRange(trip)}
      <span class="divider">•</span>
      <i class="fas fa-map-marker-alt"></i> ${trip.destination}${trip.country ? ', ' + trip.country : ''}
    `
  }
  
  let durationEl = document.querySelector('.feature-card:nth-child(2) .stat-value')
  if (durationEl) {
    durationEl.textContent = `${getDuration(trip)} ${getDuration(trip) === 1 ? 'Day' : 'Days'}`
  }
  
  let statusEl = document.querySelector('.info-value.status-upcoming')
  if (statusEl) {
    statusEl.textContent = capitalize(trip.status)
    statusEl.className = `info-value status-${trip.status}`
  }
  
  let descEl = document.querySelector('.trip-description p')
  if (descEl) descEl.textContent = trip.description || 'No description'
}

let formatDateRange = (trip) => {
  const start = new Date(trip.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const end = new Date(trip.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${start} - ${end}`
}

let getDuration = (trip) => {
  return Math.ceil((new Date(trip.endDate) - new Date(trip.startDate)) / (1000 * 60 * 60 * 24))
}

let capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1)

let loadTripStats = async () => {
  try {
    let placesRes = await apiService.places.getByTrip(currentTrip._id)
    let placesCount = placesRes.success ? placesRes.data.length : 0
    let placesEl = document.querySelector('.feature-card:nth-child(3) .stat-value')
    if (placesEl) placesEl.textContent = `${placesCount} ${placesCount === 1 ? 'Place' : 'Places'}`
    
    let budgetEl = document.querySelector('.feature-card:nth-child(1) .stat-value')
    if (budgetEl && currentTrip.budget) {
      budgetEl.textContent = `₹${currentTrip.budget.toLocaleString()}`
    }
  } catch (error) {
    console.error('Stats failed:', error)
  }
}

let navigateTo = (section) => {
  let routes = {
    budget: '/budget',
    schedule: '/schedule', 
    places: '/places'
  }
  let url = `${routes[section] || '/trips'}?id=${currentTrip._id}`
  window.location.href = url
}

document.addEventListener('DOMContentLoaded', initTripOverview)

if (typeof window !== 'undefined') {
  window.navigateTo = navigateTo
}
