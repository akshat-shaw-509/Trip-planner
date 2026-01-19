// trip-overview.js - Auto Preview Banner on Selection

let currentTrip = null;

// Main initialization function
let initTripOverview = async () => {
  try {
    if (typeof authHandler === 'undefined') {
      console.error('authHandler not loaded');
      window.location.href = 'login.html';
      return;
    }

    if (!authHandler.requireAuth()) {
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const tripId = urlParams.get('id');

    if (!tripId) {
      if (typeof showToast === 'function') {
        showToast('Trip not found', 'error');
      }
      setTimeout(() => window.location.href = 'trips.html', 2000);
      return;
    }

    await loadTripOverview(tripId);
    initLogout();
    initBannerUpload();

  } catch (error) {
    console.error('Initialization error:', error);
    if (typeof showToast === 'function') {
      showToast('Failed to initialize page', 'error');
    }
  }
};

// Load trip overview data
let loadTripOverview = async (tripId) => {
  try {
    const response = await apiService.trips.getById(tripId);

    if (response && response.success && response.data) {
      currentTrip = response.data;
      displayTripOverview();
      await loadTripStats();
    } else {
      throw new Error('Trip not found');
    }

  } catch (error) {
    console.error('Error loading trip:', error);
    
    if (typeof showToast === 'function') {
      showToast('Failed to load trip: ' + error.message, 'error');
    }
    
    setTimeout(() => window.location.href = 'trips.html', 2000);
  }
};

// Create a nice default banner (before user uploads)
let getDefaultBanner = (destination) => {
  const dest = destination || 'My Trip';
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1600' height='400'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23667eea'/%3E%3Cstop offset='100%25' style='stop-color:%23764ba2'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill='url(%23g)' width='1600' height='400'/%3E%3Ctext fill='white' font-family='Arial,sans-serif' font-size='48' font-weight='bold' x='50%25' y='40%25' text-anchor='middle' dominant-baseline='middle'%3E${encodeURIComponent(dest)}%3C/text%3E%3Ctext fill='white' font-family='Arial,sans-serif' font-size='20' opacity='0.9' x='50%25' y='60%25' text-anchor='middle' dominant-baseline='middle'%3EClick "Change Banner" to upload your photo%3C/text%3E%3C/svg%3E`;
};

// Display trip overview
let displayTripOverview = () => {
  if (!currentTrip) return;

  const trip = currentTrip;
  
  console.log('📋 displayTripOverview called, coverImage:', trip.coverImage);

  // Update banner image - ONLY show user uploaded images
  const banner = document.querySelector('.trip-banner img');
  if (banner) {
    // Don't update banner if preview is active OR if it's already showing the uploaded image
    if (banner.dataset.locked === 'true') {
      console.log('🔒 Banner locked for preview, skipping update');
      // Continue with other updates but skip banner
    } else {
      // Update banner normally
      if (trip.coverImage) {
        // Get base URL without /api for uploads
        const baseURL = apiService.baseURL.replace('/api', '');
        const imageUrl = trip.coverImage.startsWith('/uploads/')
          ? `${baseURL}${trip.coverImage}`
          : trip.coverImage;

        console.log('🖼️ Setting banner to:', imageUrl);
        banner.src = imageUrl;
        banner.onerror = () => {
          console.error('❌ Failed to load banner from:', imageUrl);
          banner.src = getDefaultBanner(trip.destination);
        };
      } else {
        console.log('⚠️ No coverImage, showing default');
        banner.src = getDefaultBanner(trip.destination);
      }
    }
  }

  // Update title
  const title = document.querySelector('.trip-title');
  if (title) {
    title.textContent = trip.title || 'Untitled Trip';
  }

  // Update dates
  const datesSpan = document.getElementById('tripDates');
  if (datesSpan) {
    datesSpan.textContent = formatDateRange(trip);
  }

  // Update location
  const locationSpan = document.getElementById('tripLocation');
  if (locationSpan) {
    const location = `${trip.destination || 'Unknown'}${trip.country ? ', ' + trip.country : ''}`;
    locationSpan.textContent = location;
  }

  // Update subtitle
  const subtitle = document.querySelector('.trip-subtitle');
  if (subtitle && (!datesSpan || !locationSpan)) {
    const dateRange = formatDateRange(trip);
    const location = `${trip.destination || 'Unknown'}${trip.country ? ', ' + trip.country : ''}`;
    
    subtitle.innerHTML = `
      <i class="far fa-calendar"></i> ${dateRange}
      <span class="divider">•</span>
      <i class="fas fa-map-marker-alt"></i> ${location}
    `;
  }

  // Update duration
  const durationEl = document.querySelector('.schedule-card .stat-value');
  if (durationEl) {
    const duration = getDuration(trip);
    durationEl.textContent = `${duration} ${duration === 1 ? 'Day' : 'Days'}`;
  }

  // Update budget
  const budgetEl = document.querySelector('.budget-card .stat-value');
  if (budgetEl && trip.budget) {
    budgetEl.textContent = `₹${trip.budget.toLocaleString()}`;
  }
};

// Load trip statistics
let loadTripStats = async () => {
  if (!currentTrip || !currentTrip._id) return;

  try {
    const placesRes = await apiService.places.getByTrip(currentTrip._id);

    let placesCount = 0;
    if (placesRes && placesRes.success && Array.isArray(placesRes.data)) {
      placesCount = placesRes.data.length;
    } else if (Array.isArray(placesRes)) {
      placesCount = placesRes.length;
    }

    const placesEl = document.querySelector('.places-card .stat-value');
    if (placesEl) {
      placesEl.textContent = `${placesCount}`;
    }

    const placesLabelEl = document.querySelector('.places-card .stat-label');
    if (placesLabelEl) {
      placesLabelEl.textContent = placesCount === 1 ? 'Place' : 'Places';
    }

  } catch (error) {
    console.error('Error loading trip stats:', error);
  }
};

// Initialize banner upload
let initBannerUpload = () => {
  const bannerContainer = document.querySelector('.trip-banner');
  if (!bannerContainer) return;

  let uploadBtn = document.querySelector('.banner-upload-btn');
  if (!uploadBtn) {
    uploadBtn = document.createElement('button');
    uploadBtn.className = 'banner-upload-btn';
    uploadBtn.innerHTML = '<i class="fas fa-camera"></i><span>Change Banner</span>';
    bannerContainer.appendChild(uploadBtn);
  }
  
  let fileInput = document.getElementById('bannerFileInput');
  if (!fileInput) {
    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/jpeg,image/jpg,image/png,image/webp';
    fileInput.style.display = 'none';
    fileInput.id = 'bannerFileInput';
    bannerContainer.appendChild(fileInput);
  }

  uploadBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  // IMMEDIATELY preview and upload when file is selected
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!validateBannerImage(file)) {
      return;
    }

    // INSTANTLY show preview of selected image
    previewBanner(file);

    // Then upload in background
    await uploadBanner(file);
  });
};

// Preview banner immediately (before upload completes)
let previewBanner = (file) => {
  const banner = document.querySelector('.trip-banner img');
  if (!banner) return;

  const previewUrl = URL.createObjectURL(file);

  // Lock banner to prevent overwriting during upload
  banner.dataset.locked = 'true';

  console.log('Showing instant preview...');
  banner.src = previewUrl;

  banner.onload = () => {
    URL.revokeObjectURL(previewUrl);
  };
};

// Validate banner image
let validateBannerImage = (file) => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024;

  if (!validTypes.includes(file.type)) {
    if (typeof showToast === 'function') {
      showToast('Please select a valid image (JPEG, PNG, or WebP)', 'error');
    }
    return false;
  }

  if (file.size > maxSize) {
    if (typeof showToast === 'function') {
      showToast('Image size must be less than 5MB', 'error');
    }
    return false;
  }

  return true;
};

// Upload banner
let uploadBanner = async (file) => {
  if (!currentTrip || !currentTrip._id) {
    if (typeof showToast === 'function') {
      showToast('No trip selected', 'error');
    }
    return;
  }

  console.log('API Base URL:', apiService.baseURL);

  try {
    const uploadBtn = document.querySelector('.banner-upload-btn');
    if (uploadBtn) {
      uploadBtn.disabled = true;
      uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Saving...</span>';
    }

    const formData = new FormData();
    formData.append('image', file);

    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${apiService.baseURL}/trips/${currentTrip._id}/banner`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const data = await response.json();

    console.log('Upload response:', data);
    console.log('Cover image from response:', data.data);

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to upload banner');
    }

    // Extract coverImage - handle both response formats
    let coverImageUrl = null;
    if (data.data && data.data.coverImage) {
      coverImageUrl = data.data.coverImage;
    } else if (data.data && typeof data.data === 'string') {
      coverImageUrl = data.data;
    } else if (data.coverImage) {
      coverImageUrl = data.coverImage;
    }

    console.log('Extracted cover image URL:', coverImageUrl);

    if (coverImageUrl) {
      // CRITICAL: Update currentTrip FIRST before updating DOM
      currentTrip.coverImage = coverImageUrl;
      
      console.log('✅ Updated currentTrip.coverImage to:', currentTrip.coverImage);

      // Update with server URL
      const bannerImg = document.querySelector('.trip-banner img');
      if (bannerImg) {
        // Get base URL without /api for uploads
        const baseURL = apiService.baseURL.replace('/api', '');
        const imageUrl = coverImageUrl.startsWith('/uploads/') 
          ? `${baseURL}${coverImageUrl}`
          : coverImageUrl;
        
        console.log('🎨 Setting banner to uploaded image:', imageUrl);
        
        // Set the image FIRST (while locked)
        bannerImg.src = imageUrl;
        
        // Wait for image to load, THEN unlock
        bannerImg.onload = () => {
          console.log('✅ Banner image loaded successfully! Unlocking...');
          bannerImg.dataset.locked = 'false';
        };
        
        bannerImg.onerror = () => {
          console.error('❌ Failed to load banner from server:', imageUrl);
          bannerImg.dataset.locked = 'false';
        };
      }

      if (typeof showToast === 'function') {
        showToast('Banner saved successfully!', 'success');
      }
    } else {
      console.error('No cover image URL in response');
      throw new Error('Server did not return a banner URL');
    }

  } catch (error) {
    console.error('Error uploading banner:', error);
    if (typeof showToast === 'function') {
      showToast('Failed to save banner: ' + error.message, 'error');
    }
    
    // ONLY reload on actual error, and unlock first
    const bannerImg = document.querySelector('.trip-banner img');
    if (bannerImg) {
      bannerImg.dataset.locked = 'false';
    }
    
    // Reload original banner only if there was an error
    setTimeout(() => {
      displayTripOverview();
    }, 100);
  } finally {
    const uploadBtn = document.querySelector('.banner-upload-btn');
    if (uploadBtn) {
      uploadBtn.disabled = false;
      uploadBtn.innerHTML = '<i class="fas fa-camera"></i><span>Change Banner</span>';
    }

    const fileInput = document.getElementById('bannerFileInput');
    if (fileInput) {
      fileInput.value = '';
    }
  }
};

// Format date range
let formatDateRange = (trip) => {
  if (!trip.startDate || !trip.endDate) return 'Dates not set';

  try {
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);

    const startStr = start.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    const endStr = end.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });

    return `${startStr} - ${endStr}`;
  } catch (error) {
    return 'Invalid dates';
  }
};

// Get trip duration
let getDuration = (trip) => {
  if (!trip.startDate || !trip.endDate) return 0;

  try {
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 1;
  } catch (error) {
    return 0;
  }
};

// Navigate to section
let navigateTo = (section) => {
  if (!currentTrip || !currentTrip._id) {
    console.error('No current trip');
    return;
  }

  const routes = {
    budget: 'budget.html',
    schedule: 'schedule.html',
    places: 'places.html'
  };

  const page = routes[section] || 'trips.html';
  const url = `${page}?id=${currentTrip._id}`;

  window.location.href = url;
};

// Initialize logout
let initLogout = () => {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (authHandler && typeof authHandler.handleLogout === 'function') {
        authHandler.handleLogout();
      }
    });
  }
};

// Make functions globally available
if (typeof window !== 'undefined') {
  window.navigateTo = navigateTo;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initTripOverview);