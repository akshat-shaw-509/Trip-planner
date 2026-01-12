let initTripsPage = async () => {
  if (!authHandler.requireAuth()) return
  await loadTrips()
  initSearch()
}

let loadTrips = async () => {
  try {
    const response = await apiService.trips.getAll()
    displayTrips(response.data || [])
  } catch (error) {
    showToast('Failed to load trips', 'error')
    showEmptyState()
  }
}

let displayTrips = (trips) => {
  let grid = document.getElementById('tripsGrid')
  let empty = document.querySelector('.empty-state')
  if (!trips.length) {
    showEmptyState(grid, empty)
    return
  }
  grid.style.display = 'grid'
  empty.style.display = 'none'
  grid.innerHTML = trips.map(createTripCard).join('')
  attachTripListeners(grid)
}

let showEmptyState = (grid, empty) => {
  grid.style.display = 'none'
  empty.style.display = 'block'
}
const createTripCard = (trip) => {
  return `
    <div class="trip-card" data-trip-id="${trip._id}">
      <div class="trip-image">
        <img src="${trip.coverImage || '../Svg/default-destination.jpg'}" alt="${trip.destination}">
        <span class="trip-status ${trip.status === 'ongoing' ? 'status-active' : ''}">
          ${capitalize(trip.status)}
        </span>
      </div>
      <div class="trip-content">
        <h3>${trip.title}</h3>
        <div class="trip-meta">
          <div class="trip-dates">
            <i class="far fa-calendar"></i> ${formatDateRange(trip)}
          </div>
          <div class="trip-location">
            <i class="fas fa-map-marker-alt"></i> ${trip.destination}${trip.country ? ', ' + trip.country : ''}
          </div>
        </div>
        <div class="trip-stats">
          <span><i class="far fa-clock"></i> ${getDuration(trip)} ${getDuration(trip) === 1 ? 'Day' : 'Days'}</span>
          ${trip.budget ? `<span><i class="fas fa-wallet"></i> ₹${trip.budget.toLocaleString()}</span>` : ''}
        </div>
      </div>
    </div>
  `
}

let formatDateRange = (trip) => {
  let start = new Date(trip.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  let end = new Date(trip.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${start} - ${end}`
}

let getDuration = (trip) => {
  return Math.ceil((new Date(trip.endDate) - new Date(trip.startDate)) / (1000 * 60 * 60 * 24))
}

let capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1)

let attachTripListeners = (grid) => {
  grid.querySelectorAll('.trip-card').forEach(card => {
    card.addEventListener('click', () => {
      window.location.href = `trip-overview.html?id=${card.dataset.tripId}`
    })
  })
}

let initSearch = () => {
  let searchInput = document.getElementById('searchInput')
  if (!searchInput) return
  let timeout
  searchInput.addEventListener('input', (e) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => searchTrips(e.target.value), 300)
  })
}

let searchTrips = async (query) => {
  if (!query.trim()) {
    await loadTrips()
    return
  }
  try {
    const response = await apiService.trips.getAll({ search: query })
    displayTrips(response.data || [])
  } catch (error) {
    showToast('Search failed', 'error')
    showEmptyState()
  }
}

document.addEventListener('DOMContentLoaded', initTripsPage)