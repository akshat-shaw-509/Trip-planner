let allTrips = []
let currentFilter = 'all'
let currentSort = 'date-desc'

// -------------------------------------------------------
// Page Initialization
// -------------------------------------------------------
const initTripsPage = async () => {
  try {
    // Ensure authHandler exists
    if (typeof authHandler === 'undefined') {
      console.error('authHandler not loaded')
      window.location.href = './login.html'
      return
    }

    // Require authentication
    if (!authHandler.requireAuth()) return

    showLoading(true)

    // Load trips from backend
    await loadTrips()

    // Initialize UI controls
    initSearch()
    initFilters()
    initSort()
    initLogout()

    showLoading(false)

  } catch (error) {
    console.error('Initialization error:', error)
    showLoading(false)
  }
}

// -------------------------------------------------------
// Loading state
// -------------------------------------------------------
const showLoading = (show) => {
  const loading = document.getElementById('loadingState')
  if (loading) loading.style.display = show ? 'block' : 'none'
}

// -------------------------------------------------------
// Fetch trips from API
// -------------------------------------------------------
const loadTrips = async () => {
  try {
    const response = await apiService.trips.getAll()

    // Support multiple backend response formats
    if (response?.success && Array.isArray(response.data)) {
      allTrips = response.data
    } else if (Array.isArray(response)) {
      allTrips = response
    } else if (response?.trips && Array.isArray(response.trips)) {
      allTrips = response.trips
    } else {
      allTrips = []
    }

    updateStats(allTrips)
    displayTrips(allTrips)

  } catch (error) {
    console.error('Error loading trips:', error)

    if (typeof showToast === 'function') {
      if (error.message.includes('Failed to fetch')) {
        showToast('Cannot connect to server. Please check backend.', 'error')
      } else if (error.message.includes('Unauthorized')) {
        showToast('Session expired. Please login again.', 'error')
        setTimeout(() => window.location.href = './login.html', 2000)
      } else {
        showToast('Failed to load trips', 'error')
      }
    }

    allTrips = []
    showEmptyState()
  }
}

// -------------------------------------------------------
// Auto-detect trip status based on dates
// -------------------------------------------------------
const getAutoStatus = (trip) => {
  const now = new Date()
  const start = new Date(trip.startDate)
  const end = new Date(trip.endDate)

  // Respect explicit terminal states
  if (trip.status === 'cancelled' || trip.status === 'completed') {
    return trip.status
  }

  if (end < now) return 'completed'
  if (start <= now && end >= now) return 'ongoing'
  if (start > now) return 'upcoming'

  return trip.status || 'planning'
}

// -------------------------------------------------------
// Update dashboard statistics
// -------------------------------------------------------
const updateStats = (trips) => {
  const stats = {
    planning: 0,
    upcoming: 0,
    ongoing: 0,
    completed: 0,
    cancelled: 0,
    countries: new Set()
  }

  trips.forEach(trip => {
    const status = getAutoStatus(trip)
    if (stats.hasOwnProperty(status)) stats[status]++

    // Count visited countries
    if (status === 'completed' || status === 'ongoing') {
      const country = extractCountry(trip)
      if (country) stats.countries.add(country.toLowerCase())
    }
  })

  updateStatElement('upcomingCount', stats.planning + stats.upcoming)
  updateStatElement('ongoingCount', stats.ongoing)
  updateStatElement('completedCount', stats.completed)
  updateStatElement('countriesCount', stats.countries.size)
}

// -------------------------------------------------------
// Extract country from trip data
// -------------------------------------------------------
const extractCountry = (trip) => {
  if (trip.country?.trim()) return trip.country.trim()

  if (trip.destination?.includes(',')) {
    const parts = trip.destination.split(',').map(p => p.trim())
    return parts[parts.length - 1]
  }

  return trip.destination?.trim() || null
}

const updateStatElement = (id, value) => {
  const element = document.getElementById(id)
  if (element) element.textContent = value
}

// -------------------------------------------------------
// Render trips
// -------------------------------------------------------
const displayTrips = (trips) => {
  const grid = document.getElementById('tripsGrid')
  const empty = document.querySelector('.empty-state')
  if (!grid) return

  if (!trips || trips.length === 0) {
    showEmptyState(grid, empty)
    return
  }

  grid.style.display = 'grid'
  if (empty) empty.style.display = 'none'

  grid.innerHTML = trips.map(createTripCard).join('')
  attachTripListeners()
}

const showEmptyState = (grid, empty) => {
  grid = grid || document.getElementById('tripsGrid')
  empty = empty || document.querySelector('.empty-state')

  if (grid) grid.style.display = 'none'
  if (empty) empty.style.display = 'block'
}

// -------------------------------------------------------
// Create trip card HTML
// -------------------------------------------------------
const createTripCard = (trip) => {
  const status = getAutoStatus(trip)
  const statusClass = status === 'ongoing' ? 'status-active' : ''

  const coverImage = trip.coverImage
    ? (trip.coverImage.startsWith('http')
        ? trip.coverImage
        : `https://trip-planner-5uys.onrender.com${trip.coverImage}`)
    : `https://source.unsplash.com/800x600/?${encodeURIComponent(trip.destination || 'travel')}`

  return `
    <div class="trip-card" data-trip-id="${trip._id}">
      <div class="trip-image">
        <img src="${coverImage}"
             alt="${escapeHtml(trip.destination || 'Trip')}"
             onerror="this.src='https://source.unsplash.com/800x600/?travel'">
        <span class="trip-status ${statusClass}">
          ${capitalize(status)}
        </span>
        <button class="delete-trip-btn" data-trip-id="${trip._id}" title="Delete Trip">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>

      <div class="trip-content">
        <h3>${escapeHtml(trip.title || 'Untitled Trip')}</h3>

        <div class="trip-meta">
          <div class="trip-dates">
            <i class="far fa-calendar"></i> ${formatDateRange(trip)}
          </div>
          <div class="trip-location">
            <i class="fas fa-map-marker-alt"></i>
            ${escapeHtml(trip.destination || 'Unknown')}
            ${trip.country ? ', ' + escapeHtml(trip.country) : ''}
          </div>
        </div>

        <div class="trip-stats">
          <span>
            <i class="far fa-clock"></i>
            ${getDuration(trip)} ${getDuration(trip) === 1 ? 'Day' : 'Days'}
          </span>
          ${trip.budget ? `<span><i class="fas fa-wallet"></i> ₹${trip.budget.toLocaleString()}</span>` : ''}
        </div>
      </div>
    </div>
  `
}

// -------------------------------------------------------
// Utilities
// -------------------------------------------------------
const formatDateRange = (trip) => {
  if (!trip.startDate || !trip.endDate) return 'Dates not set'
  const s = new Date(trip.startDate)
  const e = new Date(trip.endDate)
  return `${s.toLocaleDateString('en-US', { month:'short', day:'numeric' })} - 
          ${e.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}`
}

const getDuration = (trip) => {
  const days = Math.ceil((new Date(trip.endDate) - new Date(trip.startDate)) / 86400000)
  return Math.max(days, 1)
}

const capitalize = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : ''

const escapeHtml = (text) => {
  if (!text) return ''
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// -------------------------------------------------------
// Delete trip
// -------------------------------------------------------
const deleteTrip = async (tripId) => {
  if (!confirm('Are you sure you want to delete this trip?')) return

  try {
    await apiService.trips.delete(tripId)
    showToast?.('Trip deleted successfully', 'success')

    allTrips = allTrips.filter(t => t._id !== tripId)
    updateStats(allTrips)
    filterAndDisplayTrips()

  } catch (error) {
    console.error('Delete error:', error)
    showToast?.('Failed to delete trip', 'error')
  }
}

// -------------------------------------------------------
// Event listeners
// -------------------------------------------------------
const attachTripListeners = () => {
  document.querySelectorAll('.delete-trip-btn').forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation()
      deleteTrip(btn.dataset.tripId)
    }
  })

  document.querySelectorAll('.trip-card').forEach(card => {
    card.onclick = e => {
      if (e.target.closest('.delete-trip-btn')) return
      window.location.href = `./trip-overview.html?id=${card.dataset.tripId}`
    }
  })
}

// -------------------------------------------------------
// Search / Filter / Sort
// -------------------------------------------------------
const initSearch = () => {
  const input = document.getElementById('searchInput')
  if (!input) return

  let timeout
  input.oninput = e => {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      filterAndDisplayTrips(e.target.value.toLowerCase().trim())
    }, 300)
  }
}

const initFilters = () => {
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'))
      tab.classList.add('active')
      currentFilter = tab.dataset.filter
      filterAndDisplayTrips()
    }
  })
}

const initSort = () => {
  const sortSelect = document.getElementById('sortSelect')
  if (sortSelect) {
    sortSelect.addEventListener('change', e => {
      currentSort = e.target.value
      filterAndDisplayTrips()
    })
  }
}

const filterAndDisplayTrips = (query = '') => {
  let filtered = [...allTrips]

  if (query) {
    filtered = filtered.filter(t =>
      (t.title || '').toLowerCase().includes(query) ||
      (t.destination || '').toLowerCase().includes(query) ||
      (t.country || '').toLowerCase().includes(query)
    )
  }

  if (currentFilter !== 'all') {
    filtered = filtered.filter(t => getAutoStatus(t) === currentFilter)
  }

  displayTrips(sortTrips(filtered, currentSort))
}

const sortTrips = (trips, sortBy) => {
  const sorted = [...trips]
  switch (sortBy) {
    case 'date-desc': return sorted.sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
    case 'date-asc': return sorted.sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    case 'name-asc': return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
    case 'name-desc': return sorted.sort((a, b) => (b.title || '').localeCompare(a.title || ''))
    default: return sorted
  }
}

// -------------------------------------------------------
// Logout
// -------------------------------------------------------
const initLogout = () => {
  const logoutBtn = document.getElementById('logoutBtn')
  if (logoutBtn) {
    logoutBtn.addEventListener('click', e => {
      e.preventDefault()
      authHandler?.handleLogout()
    })
  }
}

// -------------------------------------------------------
// ✅ CRITICAL: Initialize on page load
// -------------------------------------------------------
document.addEventListener('DOMContentLoaded', initTripsPage)
