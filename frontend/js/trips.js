// trips.js - Enhanced with Delete Feature & Auto Status Detection

let allTrips = [];
let currentFilter = 'all';
let currentSort = 'date-desc';

// Main initialization function
let initTripsPage = async () => {
  try {
    // Check authentication
    if (typeof authHandler === 'undefined') {
      console.error('authHandler not loaded');
      window.location.href = 'login.html';
      return;
    }

    if (!authHandler.requireAuth()) {
      return;
    }

    // Show loading
    showLoading(true);

    // Load trips
    await loadTrips();

    // Initialize features
    initSearch();
    initFilters();
    initSort();
    initLogout();

    // Hide loading
    showLoading(false);

  } catch (error) {
    console.error('Initialization error:', error);
    showLoading(false);
  }
};

// Show/hide loading state
let showLoading = (show) => {
  const loading = document.getElementById('loadingState');

  if (loading) {
    loading.style.display = show ? 'block' : 'none';
  }
};

// Load trips from API
let loadTrips = async () => {
  try {
    const response = await apiService.trips.getAll();

    // Handle response
    if (response && response.success && Array.isArray(response.data)) {
      allTrips = response.data;
    } else if (Array.isArray(response)) {
      allTrips = response;
    } else if (response && response.trips && Array.isArray(response.trips)) {
      allTrips = response.trips;
    } else {
      allTrips = [];
    }

    // Update UI
    updateStats(allTrips);
    displayTrips(allTrips);

  } catch (error) {
    console.error('Error loading trips:', error);
    
    // Show appropriate error message
    if (typeof showToast === 'function') {
      if (error.message.includes('Failed to fetch')) {
        showToast('Cannot connect to server. Please check if backend is running.', 'error');
      } else if (error.message.includes('Unauthorized')) {
        showToast('Session expired. Please login again.', 'error');
        setTimeout(() => window.location.href = 'login.html', 2000);
      } else {
        showToast('Failed to load trips: ' + error.message, 'error');
      }
    }

    allTrips = [];
    showEmptyState();
  }
};

// Determine trip status automatically based on dates
let getAutoStatus = (trip) => {
  const now = new Date();
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);

  // If manually marked as cancelled or completed, respect that
  if (trip.status === 'cancelled' || trip.status === 'completed') {
    return trip.status;
  }

  // Auto-detect based on dates
  if (end < now) {
    return 'completed';
  } else if (start <= now && end >= now) {
    return 'ongoing';
  } else if (start > now) {
    return 'upcoming';
  }
  
  return trip.status || 'planning';
};

// Update statistics with auto-detected statuses
let updateStats = (trips) => {
  const stats = {
    planning: 0,
    upcoming: 0,
    ongoing: 0,
    completed: 0,
    cancelled: 0,
    countries: new Set()
  };

  trips.forEach(trip => {
    const autoStatus = getAutoStatus(trip);
    
    // Count by auto-detected status
    if (stats.hasOwnProperty(autoStatus)) {
      stats[autoStatus]++;
    }

    // Only count countries for completed or ongoing trips (actually visited)
    if (autoStatus === 'completed' || autoStatus === 'ongoing') {
      const country = extractCountry(trip);
      if (country) {
        stats.countries.add(country.toLowerCase());
      }
    }
  });

  // Update UI elements
  updateStatElement('upcomingCount', stats.planning + stats.upcoming);
  updateStatElement('ongoingCount', stats.ongoing);
  updateStatElement('completedCount', stats.completed);
  updateStatElement('countriesCount', stats.countries.size);
};

// Extract country from trip data
let extractCountry = (trip) => {
  // Priority 1: Use country field if available
  if (trip.country && trip.country.trim()) {
    return trip.country.trim();
  }
  
  // Priority 2: Extract from destination (format: "City, Country" or "Place, City, Country")
  if (trip.destination && trip.destination.includes(',')) {
    const parts = trip.destination.split(',').map(p => p.trim());
    // Take the last part as it's most likely the country
    const lastPart = parts[parts.length - 1];
    if (lastPart && lastPart.length > 1) {
      return lastPart;
    }
  }
  
  // Priority 3: If destination is just a single word/name, use it as country
  if (trip.destination && trip.destination.trim()) {
    return trip.destination.trim();
  }
  
  return null;
};

// Helper to update stat element
let updateStatElement = (id, value) => {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
};

// Display trips
let displayTrips = (trips) => {
  const grid = document.getElementById('tripsGrid');
  const empty = document.querySelector('.empty-state');

  if (!grid) return;

  if (!trips || trips.length === 0) {
    showEmptyState(grid, empty);
    return;
  }

  grid.style.display = 'grid';
  if (empty) empty.style.display = 'none';

  grid.innerHTML = trips.map(createTripCard).join('');
  attachTripListeners();
};

// Show empty state
let showEmptyState = (grid, empty) => {
  if (!grid) grid = document.getElementById('tripsGrid');
  if (!empty) empty = document.querySelector('.empty-state');

  if (grid) grid.style.display = 'none';
  if (empty) empty.style.display = 'block';
};

// Create trip card HTML with delete button
const createTripCard = (trip) => {
  const autoStatus = getAutoStatus(trip);
  const statusClass = autoStatus === 'ongoing' ? 'status-active' : '';
  
  // Use coverImage if available, otherwise use Unsplash
  const coverImage = trip.coverImage 
    ? (trip.coverImage.startsWith('http') 
        ? trip.coverImage 
        : `http://localhost:5000${trip.coverImage}`)
    : `https://source.unsplash.com/800x600/?${encodeURIComponent(trip.destination || 'travel')}`;

  return `
    <div class="trip-card" data-trip-id="${trip._id}">
      <div class="trip-image">
        <img src="${coverImage}" 
             alt="${escapeHtml(trip.destination || 'Trip')}" 
             onerror="this.src='https://source.unsplash.com/800x600/?travel'">
        <span class="trip-status ${statusClass}">
          ${capitalize(autoStatus)}
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
            ${escapeHtml(trip.destination || 'Unknown')}${trip.country ? ', ' + escapeHtml(trip.country) : ''}
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
  `;
};

// Format date range
let formatDateRange = (trip) => {
  if (!trip.startDate || !trip.endDate) return 'Dates not set';

  try {
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);

    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

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

// Capitalize string
let capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Escape HTML
let escapeHtml = (text) => {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// Delete trip function
let deleteTrip = async (tripId) => {
  if (!confirm('Are you sure you want to delete this trip? This action cannot be undone.')) {
    return;
  }

  try {
    await apiService.trips.delete(tripId);
    
    if (typeof showToast === 'function') {
      showToast('Trip deleted successfully', 'success');
    }

    // Remove from allTrips array
    allTrips = allTrips.filter(trip => trip._id !== tripId);
    
    // Update UI
    updateStats(allTrips);
    filterAndDisplayTrips();

  } catch (error) {
    console.error('Error deleting trip:', error);
    if (typeof showToast === 'function') {
      showToast('Failed to delete trip: ' + error.message, 'error');
    }
  }
};

// Attach click listeners to trip cards and delete buttons
let attachTripListeners = () => {
  // Delete button listeners
  document.querySelectorAll('.delete-trip-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent card click
      const tripId = btn.dataset.tripId;
      if (tripId) {
        deleteTrip(tripId);
      }
    });
  });

  // Card click listeners (navigate to trip details)
  document.querySelectorAll('.trip-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // Don't navigate if clicking delete button
      if (e.target.closest('.delete-trip-btn')) return;
      
      const tripId = card.dataset.tripId;
      if (tripId) {
        window.location.href = `trip-overview.html?id=${tripId}`;
      }
    });
  });
};

// Initialize search
let initSearch = () => {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;

  let timeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      const query = e.target.value.toLowerCase().trim();
      filterAndDisplayTrips(query);
    }, 300);
  });
};

// Initialize filters
let initFilters = () => {
  const filterTabs = document.querySelectorAll('.filter-tab');
  
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      currentFilter = tab.dataset.filter;
      filterAndDisplayTrips();
    });
  });
};

// Initialize sort
let initSort = () => {
  const sortSelect = document.getElementById('sortSelect');
  if (!sortSelect) return;

  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    filterAndDisplayTrips();
  });
};

// Initialize logout button
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

// Filter and display trips with auto-status detection
let filterAndDisplayTrips = (searchQuery = '') => {
  let filtered = [...allTrips];

  // Apply search
  if (searchQuery) {
    filtered = filtered.filter(trip => {
      const title = (trip.title || '').toLowerCase();
      const destination = (trip.destination || '').toLowerCase();
      const country = (trip.country || '').toLowerCase();
      return title.includes(searchQuery) || 
             destination.includes(searchQuery) || 
             country.includes(searchQuery);
    });
  }

  // Apply status filter with auto-detection
  if (currentFilter !== 'all') {
    filtered = filtered.filter(trip => {
      const autoStatus = getAutoStatus(trip);
      return autoStatus === currentFilter;
    });
  }

  // Apply sorting
  filtered = sortTrips(filtered, currentSort);

  displayTrips(filtered);
};

// Sort trips
let sortTrips = (trips, sortBy) => {
  const sorted = [...trips];

  switch (sortBy) {
    case 'date-desc':
      return sorted.sort((a, b) => new Date(b.startDate || 0) - new Date(a.startDate || 0));
    case 'date-asc':
      return sorted.sort((a, b) => new Date(a.startDate || 0) - new Date(b.startDate || 0));
    case 'name-asc':
      return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    case 'name-desc':
      return sorted.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
    default:
      return sorted;
  }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', initTripsPage);