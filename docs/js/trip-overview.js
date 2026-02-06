let currentTrip = null

const initTripOverview = async () => {
  try {
    // Ensure authHandler is available
    if (typeof authHandler === 'undefined') {
      console.error('authHandler not loaded')
      window.location.href = 'login.html'
      return
    }
    if (!authHandler.requireAuth()) return
    
    // Get trip ID from URL
    const params = new URLSearchParams(window.location.search)
    const tripId = params.get('id')

    if (!tripId) {
      showToast?.('Trip not found', 'error')
      setTimeout(() => window.location.href = 'trips.html', 2000)
      return
    }
    
    await loadTripOverview(tripId)
    initLogout()
    initBannerUpload()
  } catch (err) {
    showToast?.('Failed to initialize page', 'error')
  }
}

// Fetch & display trip overview
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

// Default SVG banner
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
  
  // Title
  const titleEl = document.querySelector('.trip-title')
  if (titleEl) titleEl.textContent = trip.title || 'Untitled Trip'
  
  // Dates
  const datesEl = document.getElementById('tripDates')
  if (datesEl) datesEl.textContent = formatDateRange(trip)
  
  // Location
  const locationText = `${trip.destination || 'Unknown'}${trip.country ? ', ' + trip.country : ''}`
  const locationEl = document.getElementById('tripLocation')
  if (locationEl) locationEl.textContent = locationText
  
  // Duration
  const duration = getDuration(trip)
  const durationEl = document.querySelector('.schedule-card .stat-value')
  if (durationEl) {
    durationEl.textContent = `${duration} ${duration === 1 ? 'Day' : 'Days'}`
  }
  
  // Budget
  if (trip.budget) {
    const budgetEl = document.querySelector('.budget-card .stat-value')
    if (budgetEl) {
      budgetEl.textContent = `₹${trip.budget.toLocaleString()}`
    }
  }
}

// Load additional trip statistics
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

// ========== BANNER UPLOAD - SINGLE DECLARATION ==========
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

  // Remove button
  let removeBtn = container.querySelector('.banner-remove-btn')
  if (!removeBtn) {
    removeBtn = document.createElement('button')
    removeBtn.className = 'banner-remove-btn'
    removeBtn.innerHTML = '<i class="fas fa-trash"></i><span>Remove</span>'
    removeBtn.style.cssText = `
      position: absolute;
      top: 20px;
      right: 200px;
      background: rgba(239, 68, 68, 0.9);
      backdrop-filter: blur(10px);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.2);
      padding: 12px 24px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.3s ease;
      z-index: 10;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    `
    container.appendChild(removeBtn)
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
  
  // Event listeners
  uploadBtn.onclick = e => {
    e.stopPropagation()
    fileInput.click()
  }
  
  // Remove button click
  removeBtn.onclick = e => {
    e.stopPropagation()
    removeBanner()
  }
  
  fileInput.onchange = async e => {
    const file = e.target.files[0]
    if (!file || !validateBannerImage(file)) return
    previewBanner(file)
    await uploadBanner(file)
  }
}

// Instant banner preview (UX polish)
const previewBanner = (file) => {
  const img = document.querySelector('.trip-banner img')
  if (!img) return
  
  const url = URL.createObjectURL(file)
  img.dataset.locked = 'true'
  img.src = url
  img.onload = () => URL.revokeObjectURL(url)
}

// Validate banner image
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

// Upload banner to backend
const uploadBanner = async (file) => {
  try {
    const btn = document.querySelector('.banner-upload-btn')
    btn.disabled = true
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...'
    
    const formData = new FormData()
    formData.append('file', file) 
    
    const token = sessionStorage.getItem('accessToken')
    const res = await fetch(`${apiService.baseURL}/uploads/image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    })

    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.message)
    
    currentTrip.coverImage = data.data.url
    displayTripOverview()
    showToast?.('Banner saved!', 'success')
  } catch (err) {
    console.error(err)
    showToast?.('Failed to upload banner', 'error')
    displayTripOverview()
  } finally {
    const btn = document.querySelector('.banner-upload-btn')
    const input = document.getElementById('bannerFileInput')
    if (btn) {
      btn.disabled = false
      btn.innerHTML = '<i class="fas fa-camera"></i><span>Change Banner</span>'
    }
    if (input) input.value = ''
  }
}

// Remove trip banner
const removeBanner = async () => {
  if (!confirm('Are you sure you want to remove the banner? It will revert to the default.')) {
    return
  }
  
  try {
    const btn = document.querySelector('.banner-upload-btn')
    const removeBannerBtn = document.querySelector('.banner-remove-btn') 
    
    if (btn) {
      btn.disabled = true
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Removing...'
    }
    if (removeBannerBtn) {
      removeBannerBtn.disabled = true
    }
    
    await apiService.trips.removeBanner(currentTrip._id)
    
    currentTrip.coverImage = null
    const bannerImg = document.querySelector('.trip-banner img')
    if (bannerImg) {
      bannerImg.dataset.locked = 'true'
      bannerImg.src = getDefaultBanner(currentTrip.destination)
    }
    
    showToast?.('Banner removed successfully!', 'success')
  } catch (err) {
    console.error('Remove banner error:', err)
    showToast?.('Failed to remove banner', 'error')
  } finally {
    const btn = document.querySelector('.banner-upload-btn')
    const removeBannerBtn = document.querySelector('.banner-remove-btn')
    
    if (btn) {
      btn.disabled = false
      btn.innerHTML = '<i class="fas fa-camera"></i><span>Change Banner</span>'
    }
    if (removeBannerBtn) {
      removeBannerBtn.disabled = false
    }
  }
}

// Add CSS for remove button hover
const style = document.createElement('style')
style.textContent = `
  .banner-remove-btn:hover {
    background: rgba(239, 68, 68, 1) !important;
    border-color: rgba(255, 255, 255, 0.4);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
  }
  .banner-remove-btn:active {
    transform: translateY(0);
  }
  @media (max-width: 768px) {
    .banner-remove-btn {
      top: 60px !important;
      right: 12px !important;
      padding: 10px 16px !important;
      font-size: 13px !important;
    }
    .banner-remove-btn span {
      display: none;
    }
  }
`
document.head.appendChild(style)

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

const navigateTo = (section) => {
  const routes = {
    budget: './budget.html',
    schedule: './schedule.html',
    places: './places.html'
  }
  window.location.href = `${routes[section] || 'trips.html'}?id=${currentTrip._id}`
}

const initLogout = () => {
  const logoutBtn = document.getElementById('logoutBtn')
  if (logoutBtn) {
    logoutBtn.addEventListener('click', e => {
      e.preventDefault()
      authHandler?.handleLogout()
    })
  }
}

window.navigateTo = navigateTo
document.addEventListener('DOMContentLoaded', initTripOverview)
