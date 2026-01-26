<<<<<<< HEAD
// =======================================================
// trip-overview.js
// -------------------------------------------------------
// Trip Overview Page Controller
//
// Responsibilities:
// - Auth check
// - Load trip data
// - Display banner, title, dates, stats
// - Instant banner preview + upload
// - Navigation between trip sections
// =======================================================

let currentTrip = null

// -------------------------------------------------------
// Page Initialization
// -------------------------------------------------------
const initTripOverview = async () => {
  try {
    // Ensure authHandler is available
    if (typeof authHandler === 'undefined') {
      console.error('authHandler not loaded')
      window.location.href = 'login.html'
      return
    }

    // Require authentication
    if (!authHandler.requireAuth()) return

    // Get trip ID from URL
    const params = new URLSearchParams(window.location.search)
    const tripId = params.get('id')

    if (!tripId) {
      showToast?.('Trip not found', 'error')
      setTimeout(() => window.location.href = 'trips.html', 2000)
      return
    }

    // Load core data & UI features
    await loadTripOverview(tripId)
    initLogout()
    initBannerUpload()

  } catch (err) {
    console.error('Initialization error:', err)
    showToast?.('Failed to initialize page', 'error')
  }
}

// -------------------------------------------------------
// Fetch & display trip overview
// -------------------------------------------------------
const loadTripOverview = async (tripId) => {
  try {
    const response = await apiService.trips.getById(tripId)

    if (!response?.success || !response.data) {
      throw new Error('Trip not found')
    }

    currentTrip = response.data
    displayTripOverview()
    await loadTripStats()

  } catch (err) {
    console.error('Error loading trip:', err)
    showToast?.(`Failed to load trip: ${err.message}`, 'error')
    setTimeout(() => window.location.href = 'trips.html', 2000)
  }
}

// -------------------------------------------------------
// Generate default SVG banner
// -------------------------------------------------------
const getDefaultBanner = (destination) => {
  const text = destination || 'My Trip'
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1600' height='400'%3E
  %3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E
  %3Cstop offset='0%25' style='stop-color:%23667eea'/%3E
  %3Cstop offset='100%25' style='stop-color:%23764ba2'/%3E
  %3C/linearGradient%3E%3C/defs%3E
  %3Crect fill='url(%23g)' width='1600' height='400'/%3E
  %3Ctext fill='white' font-size='48' font-weight='bold' x='50%25' y='40%25'
  text-anchor='middle'%3E${encodeURIComponent(text)}%3C/text%3E
  %3Ctext fill='white' font-size='20' opacity='0.9' x='50%25' y='60%25'
  text-anchor='middle'%3EClick "Change Banner" to upload your photo%3C/text%3E
  %3C/svg%3E`
}

// -------------------------------------------------------
// Populate UI with trip data
// -------------------------------------------------------
const displayTripOverview = () => {
  if (!currentTrip) return
  const trip = currentTrip

  // ---------- Banner ----------
  const bannerImg = document.querySelector('.trip-banner img')
  if (bannerImg && bannerImg.dataset.locked !== 'true') {
    if (trip.coverImage) {
      const baseURL = apiService.baseURL.replace('/api', '')
      const imageUrl = trip.coverImage.startsWith('/uploads/')
        ? `${baseURL}${trip.coverImage}`
        : trip.coverImage

      bannerImg.src = imageUrl
      bannerImg.onerror = () => {
        bannerImg.src = getDefaultBanner(trip.destination)
      }
    } else {
      bannerImg.src = getDefaultBanner(trip.destination)
    }
  }

  // ---------- Title ----------
  const titleEl = document.querySelector('.trip-title')
  if (titleEl) titleEl.textContent = trip.title || 'Untitled Trip'

  // ---------- Dates ----------
  const datesEl = document.getElementById('tripDates')
  if (datesEl) datesEl.textContent = formatDateRange(trip)

  // ---------- Location ----------
  const locationText =
    `${trip.destination || 'Unknown'}${trip.country ? ', ' + trip.country : ''}`
  const locationEl = document.getElementById('tripLocation')
  if (locationEl) locationEl.textContent = locationText

  // ---------- Duration ----------
  const duration = getDuration(trip)
  const durationEl = document.querySelector('.schedule-card .stat-value')
  if (durationEl) {
    durationEl.textContent = `${duration} ${duration === 1 ? 'Day' : 'Days'}`
  }

  // ---------- Budget ----------
  if (trip.budget) {
    const budgetEl = document.querySelector('.budget-card .stat-value')
    if (budgetEl) {
      budgetEl.textContent = `₹${trip.budget.toLocaleString()}`
    }
  }
}

// -------------------------------------------------------
// Load additional trip statistics
// -------------------------------------------------------
const loadTripStats = async () => {
  try {
    const res = await apiService.places.getByTrip(currentTrip._id)
    const count = Array.isArray(res?.data) ? res.data.length :
                  Array.isArray(res) ? res.length : 0

    const valueEl = document.querySelector('.places-card .stat-value')
    const labelEl = document.querySelector('.places-card .stat-label')
    
    if (valueEl) valueEl.textContent = count
    if (labelEl) labelEl.textContent = count === 1 ? 'Place' : 'Places'

  } catch (err) {
    console.error('Error loading stats:', err)
  }
}

// -------------------------------------------------------
// Banner Upload Initialization
// -------------------------------------------------------
const initBannerUpload = () => {
  const container = document.querySelector('.trip-banner')
  if (!container) return

  // Upload button
  let uploadBtn = container.querySelector('.banner-upload-btn')
  if (!uploadBtn) {
    uploadBtn = document.createElement('button')
    uploadBtn.className = 'banner-upload-btn'
    uploadBtn.innerHTML = '<i class="fas fa-camera"></i><span>Change Banner</span>'
    container.appendChild(uploadBtn)
  }

  // Hidden file input
  let fileInput = document.getElementById('bannerFileInput')
  if (!fileInput) {
    fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = 'image/jpeg,image/png,image/webp'
    fileInput.id = 'bannerFileInput'
    fileInput.style.display = 'none'
    container.appendChild(fileInput)
  }

  uploadBtn.onclick = e => {
    e.stopPropagation()
    fileInput.click()
  }

  fileInput.onchange = async e => {
    const file = e.target.files[0]
    if (!file || !validateBannerImage(file)) return

    previewBanner(file)
    await uploadBanner(file)
  }
}

// -------------------------------------------------------
// Instant banner preview (UX polish)
// -------------------------------------------------------
const previewBanner = (file) => {
  const img = document.querySelector('.trip-banner img')
  if (!img) return

  const url = URL.createObjectURL(file)
  img.dataset.locked = 'true'
  img.src = url

  img.onload = () => URL.revokeObjectURL(url)
}

// -------------------------------------------------------
// Validate banner image
// -------------------------------------------------------
const validateBannerImage = (file) => {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp']
  const maxSize = 5 * 1024 * 1024

  if (!validTypes.includes(file.type)) {
    showToast?.('Invalid image format', 'error')
    return false
  }

  if (file.size > maxSize) {
    showToast?.('Image must be under 5MB', 'error')
    return false
  }

  return true
}

// -------------------------------------------------------
// Upload banner to backend
// -------------------------------------------------------
const uploadBanner = async (file) => {
  try {
    const btn = document.querySelector('.banner-upload-btn')
    btn.disabled = true
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...'

    const formData = new FormData()
    formData.append('image', file)

    const token = sessionStorage.getItem('accessToken')
    const res = await fetch(`${apiService.baseURL}/trips/${currentTrip._id}/banner`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    })

    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.message)

    currentTrip.coverImage = data.data.coverImage
    displayTripOverview()
    showToast?.('Banner saved!', 'success')

  } catch (err) {
    console.error(err)
    showToast?.('Failed to upload banner', 'error')
    displayTripOverview()
  } finally {
    const btn = document.querySelector('.banner-upload-btn')
    const input = document.getElementById('bannerFileInput')
    if (btn) btn.disabled = false
    if (input) input.value = ''
  }
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

// -------------------------------------------------------
// Navigation helpers
// -------------------------------------------------------
const navigateTo = (section) => {
  const routes = {
    budget: './budget.html',
    schedule: './schedule.html',
    places: './places.html'
  }
  window.location.href = `${routes[section] || 'trips.html'}?id=${currentTrip._id}`
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

// Expose navigation
window.navigateTo = navigateTo

// Boot
=======
// =======================================================
// trip-overview.js
// -------------------------------------------------------
// Trip Overview Page Controller
//
// Responsibilities:
// - Auth check
// - Load trip data
// - Display banner, title, dates, stats
// - Instant banner preview + upload
// - Navigation between trip sections
// =======================================================

let currentTrip = null

// -------------------------------------------------------
// Page Initialization
// -------------------------------------------------------
const initTripOverview = async () => {
  try {
    // Ensure authHandler is available
    if (typeof authHandler === 'undefined') {
      console.error('authHandler not loaded')
      window.location.href = 'login.html'
      return
    }

    // Require authentication
    if (!authHandler.requireAuth()) return

    // Get trip ID from URL
    const params = new URLSearchParams(window.location.search)
    const tripId = params.get('id')

    if (!tripId) {
      showToast?.('Trip not found', 'error')
      setTimeout(() => window.location.href = 'trips.html', 2000)
      return
    }

    // Load core data & UI features
    await loadTripOverview(tripId)
    initLogout()
    initBannerUpload()

  } catch (err) {
    console.error('Initialization error:', err)
    showToast?.('Failed to initialize page', 'error')
  }
}

// -------------------------------------------------------
// Fetch & display trip overview
// -------------------------------------------------------
const loadTripOverview = async (tripId) => {
  try {
    const response = await apiService.trips.getById(tripId)

    if (!response?.success || !response.data) {
      throw new Error('Trip not found')
    }

    currentTrip = response.data
    displayTripOverview()
    await loadTripStats()

  } catch (err) {
    console.error('Error loading trip:', err)
    showToast?.(`Failed to load trip: ${err.message}`, 'error')
    setTimeout(() => window.location.href = 'trips.html', 2000)
  }
}

// -------------------------------------------------------
// Generate default SVG banner
// -------------------------------------------------------
const getDefaultBanner = (destination) => {
  const text = destination || 'My Trip'
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1600' height='400'%3E
  %3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E
  %3Cstop offset='0%25' style='stop-color:%23667eea'/%3E
  %3Cstop offset='100%25' style='stop-color:%23764ba2'/%3E
  %3C/linearGradient%3E%3C/defs%3E
  %3Crect fill='url(%23g)' width='1600' height='400'/%3E
  %3Ctext fill='white' font-size='48' font-weight='bold' x='50%25' y='40%25'
  text-anchor='middle'%3E${encodeURIComponent(text)}%3C/text%3E
  %3Ctext fill='white' font-size='20' opacity='0.9' x='50%25' y='60%25'
  text-anchor='middle'%3EClick "Change Banner" to upload your photo%3C/text%3E
  %3C/svg%3E`
}

// -------------------------------------------------------
// Populate UI with trip data
// -------------------------------------------------------
const displayTripOverview = () => {
  if (!currentTrip) return
  const trip = currentTrip

  // ---------- Banner ----------
  const bannerImg = document.querySelector('.trip-banner img')
  if (bannerImg && bannerImg.dataset.locked !== 'true') {
    if (trip.coverImage) {
      const baseURL = apiService.baseURL.replace('/api', '')
      const imageUrl = trip.coverImage.startsWith('/uploads/')
        ? `${baseURL}${trip.coverImage}`
        : trip.coverImage

      bannerImg.src = imageUrl
      bannerImg.onerror = () => {
        bannerImg.src = getDefaultBanner(trip.destination)
      }
    } else {
      bannerImg.src = getDefaultBanner(trip.destination)
    }
  }

  // ---------- Title ----------
  const titleEl = document.querySelector('.trip-title')
  if (titleEl) titleEl.textContent = trip.title || 'Untitled Trip'

  // ---------- Dates ----------
  const datesEl = document.getElementById('tripDates')
  if (datesEl) datesEl.textContent = formatDateRange(trip)

  // ---------- Location ----------
  const locationText =
    `${trip.destination || 'Unknown'}${trip.country ? ', ' + trip.country : ''}`
  const locationEl = document.getElementById('tripLocation')
  if (locationEl) locationEl.textContent = locationText

  // ---------- Duration ----------
  const duration = getDuration(trip)
  const durationEl = document.querySelector('.schedule-card .stat-value')
  if (durationEl) {
    durationEl.textContent = `${duration} ${duration === 1 ? 'Day' : 'Days'}`
  }

  // ---------- Budget ----------
  if (trip.budget) {
    const budgetEl = document.querySelector('.budget-card .stat-value')
    if (budgetEl) {
      budgetEl.textContent = `₹${trip.budget.toLocaleString()}`
    }
  }
}

// -------------------------------------------------------
// Load additional trip statistics
// -------------------------------------------------------
const loadTripStats = async () => {
  try {
    const res = await apiService.places.getByTrip(currentTrip._id)
    const count = Array.isArray(res?.data) ? res.data.length :
                  Array.isArray(res) ? res.length : 0

    const valueEl = document.querySelector('.places-card .stat-value')
    const labelEl = document.querySelector('.places-card .stat-label')
    
    if (valueEl) valueEl.textContent = count
    if (labelEl) labelEl.textContent = count === 1 ? 'Place' : 'Places'

  } catch (err) {
    console.error('Error loading stats:', err)
  }
}

// -------------------------------------------------------
// Banner Upload Initialization
// -------------------------------------------------------
const initBannerUpload = () => {
  const container = document.querySelector('.trip-banner')
  if (!container) return

  // Upload button
  let uploadBtn = container.querySelector('.banner-upload-btn')
  if (!uploadBtn) {
    uploadBtn = document.createElement('button')
    uploadBtn.className = 'banner-upload-btn'
    uploadBtn.innerHTML = '<i class="fas fa-camera"></i><span>Change Banner</span>'
    container.appendChild(uploadBtn)
  }

  // Hidden file input
  let fileInput = document.getElementById('bannerFileInput')
  if (!fileInput) {
    fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = 'image/jpeg,image/png,image/webp'
    fileInput.id = 'bannerFileInput'
    fileInput.style.display = 'none'
    container.appendChild(fileInput)
  }

  uploadBtn.onclick = e => {
    e.stopPropagation()
    fileInput.click()
  }

  fileInput.onchange = async e => {
    const file = e.target.files[0]
    if (!file || !validateBannerImage(file)) return

    previewBanner(file)
    await uploadBanner(file)
  }
}

// -------------------------------------------------------
// Instant banner preview (UX polish)
// -------------------------------------------------------
const previewBanner = (file) => {
  const img = document.querySelector('.trip-banner img')
  if (!img) return

  const url = URL.createObjectURL(file)
  img.dataset.locked = 'true'
  img.src = url

  img.onload = () => URL.revokeObjectURL(url)
}

// -------------------------------------------------------
// Validate banner image
// -------------------------------------------------------
const validateBannerImage = (file) => {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp']
  const maxSize = 5 * 1024 * 1024

  if (!validTypes.includes(file.type)) {
    showToast?.('Invalid image format', 'error')
    return false
  }

  if (file.size > maxSize) {
    showToast?.('Image must be under 5MB', 'error')
    return false
  }

  return true
}

// -------------------------------------------------------
// Upload banner to backend
// -------------------------------------------------------
const uploadBanner = async (file) => {
  try {
    const btn = document.querySelector('.banner-upload-btn')
    btn.disabled = true
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...'

    const formData = new FormData()
    formData.append('image', file)

    const token = sessionStorage.getItem('accessToken')
    const res = await fetch(`${apiService.baseURL}/trips/${currentTrip._id}/banner`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    })

    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.message)

    currentTrip.coverImage = data.data.coverImage
    displayTripOverview()
    showToast?.('Banner saved!', 'success')

  } catch (err) {
    console.error(err)
    showToast?.('Failed to upload banner', 'error')
    displayTripOverview()
  } finally {
    const btn = document.querySelector('.banner-upload-btn')
    const input = document.getElementById('bannerFileInput')
    if (btn) btn.disabled = false
    if (input) input.value = ''
  }
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

// -------------------------------------------------------
// Navigation helpers
// -------------------------------------------------------
const navigateTo = (section) => {
  const routes = {
    budget: './budget.html',
    schedule: './schedule.html',
    places: './places.html'
  }
  window.location.href = `${routes[section] || 'trips.html'}?id=${currentTrip._id}`
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

// Expose navigation
window.navigateTo = navigateTo

// Boot
>>>>>>> 0007615a5a7317e8689fc9727726ee86c5585786
document.addEventListener('DOMContentLoaded', initTripOverview)