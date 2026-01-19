// js/map-view.js - Enhanced Map View with Clustering

let mapViewState = {
  map: null,
  markers: [],
  markerClusterGroup: null,
  isMapActive: false,
  recommendations: [],
  tripCenter: null
};

/**
 * Initialize enhanced map view
 */
function initEnhancedMapView(recommendations, tripCenter) {
  mapViewState.recommendations = recommendations;
  mapViewState.tripCenter = tripCenter;
  
  renderMapViewUI();
  attachMapListeners();
}

/**
 * Render map view UI
 */
function renderMapViewUI() {
  const container = document.querySelector('.recommendations-section');
  if (!container) return;

  const mapHTML = `
    <div class="map-view-container">
      <div class="map-toggle-section">
        <button class="map-toggle-btn" id="mapViewToggleBtn">
          <i class="fas fa-map"></i>
          <span id="mapToggleText">Show Map View</span>
        </button>
        <div class="map-view-controls">
          <button class="map-legend-toggle" id="mapLegendToggle">
            <i class="fas fa-info-circle"></i>
            Legend
          </button>
        </div>
      </div>
      <div class="map-wrapper" id="mapWrapper">
        <div id="enhanced-map"></div>
        <div class="map-legend" id="mapLegend">
          <h4>
            Map Legend
            <button class="map-legend-close" onclick="toggleMapLegend()">&times;</button>
          </h4>
          <div class="map-legend-items">
            <div class="map-legend-item">
              <div class="map-legend-icon restaurant">
                <i class="fas fa-utensils"></i>
              </div>
              <span>Restaurants</span>
            </div>
            <div class="map-legend-item">
              <div class="map-legend-icon attraction">
                <i class="fas fa-landmark"></i>
              </div>
              <span>Attractions</span>
            </div>
            <div class="map-legend-item">
              <div class="map-legend-icon accommodation">
                <i class="fas fa-bed"></i>
              </div>
              <span>Hotels</span>
            </div>
            <div class="map-legend-item">
              <div class="map-legend-icon transport">
                <i class="fas fa-bus"></i>
              </div>
              <span>Transport</span>
            </div>
            <div class="map-legend-item">
              <div class="map-legend-icon center">
                <i class="fas fa-crosshairs"></i>
              </div>
              <span>Trip Center</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  container.insertAdjacentHTML('afterend', mapHTML);
}

/**
 * Attach map event listeners
 */
function attachMapListeners() {
  const toggleBtn = document.getElementById('mapViewToggleBtn');
  const legendToggle = document.getElementById('mapLegendToggle');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleMapView);
  }

  if (legendToggle) {
    legendToggle.addEventListener('click', toggleMapLegend);
  }
}

/**
 * Toggle map view
 */
async function toggleMapView() {
  const wrapper = document.getElementById('mapWrapper');
  const btn = document.getElementById('mapViewToggleBtn');
  const text = document.getElementById('mapToggleText');

  if (!wrapper || !btn) return;

  if (!mapViewState.isMapActive) {
    // Show map
    wrapper.classList.add('active');
    btn.classList.add('active');
    text.textContent = 'Hide Map View';
    
    if (!mapViewState.map) {
      await initializeMap();
    } else {
      mapViewState.map.invalidateSize();
    }
    
    mapViewState.isMapActive = true;
  } else {
    // Hide map
    wrapper.classList.remove('active');
    btn.classList.remove('active');
    text.textContent = 'Show Map View';
    mapViewState.isMapActive = false;
  }
}

/**
 * Initialize Leaflet map with clustering
 */
async function initializeMap() {
  const mapElement = document.getElementById('enhanced-map');
  if (!mapElement) return;

  // Show loading
  mapElement.innerHTML = `
    <div class="map-loading">
      <div class="map-loading-spinner"></div>
      <div class="map-loading-text">Loading map...</div>
    </div>
  `;

  // Wait for Leaflet to be ready
  if (typeof L === 'undefined') {
    console.error('Leaflet not loaded');
    return;
  }

  // Clear loading
  mapElement.innerHTML = '';

  // Create map
  const center = mapViewState.tripCenter || { lat: 20.5937, lon: 78.9629 };
  mapViewState.map = L.map('enhanced-map').setView([center.lat, center.lon], 13);

  // Add tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(mapViewState.map);

  // Initialize marker cluster group
  mapViewState.markerClusterGroup = L.markerClusterGroup({
    chunkedLoading: true,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    maxClusterRadius: 50,
    iconCreateFunction: function(cluster) {
      const count = cluster.getChildCount();
      let size = 'small';
      
      if (count > 10) size = 'large';
      else if (count > 5) size = 'medium';
      
      return L.divIcon({
        html: `<div class="marker-cluster marker-cluster-${size}">${count}</div>`,
        className: '',
        iconSize: L.point(40, 40)
      });
    }
  });

  // Add trip center marker
  if (mapViewState.tripCenter) {
    const centerIcon = L.divIcon({
      html: '<div class="map-legend-icon center"><i class="fas fa-crosshairs"></i></div>',
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    L.marker([center.lat, center.lon], { icon: centerIcon })
      .addTo(mapViewState.map)
      .bindPopup('<b>Trip Center</b><br>Your destination area');
  }

  // Add recommendation markers
  addRecommendationMarkers();

  // Add cluster group to map
  mapViewState.map.addLayer(mapViewState.markerClusterGroup);

  // Fit bounds to show all markers
  if (mapViewState.markers.length > 0) {
    const group = L.featureGroup(mapViewState.markers);
    mapViewState.map.fitBounds(group.getBounds().pad(0.1));
  }

  setTimeout(() => {
    mapViewState.map.invalidateSize();
  }, 300);
}

/**
 * Add recommendation markers to map
 */
function addRecommendationMarkers() {
  mapViewState.markers = [];
  
  mapViewState.recommendations.forEach(rec => {
    if (!rec.location || !rec.location.coordinates) return;
    
    const [lon, lat] = rec.location.coordinates;
    const category = rec.category?.toLowerCase() || 'other';
    const icon = getCategoryIcon(category);
    
    // Create custom marker icon
    const markerIcon = L.divIcon({
      html: `<div class="map-legend-icon ${category}"><i class="fas fa-${icon}"></i></div>`,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    });
    
    // Create marker
    const marker = L.marker([lat, lon], { icon: markerIcon });
    
    // Create popup content
    const popupContent = createMapPopup(rec);
    marker.bindPopup(popupContent, {
      className: 'custom-popup',
      maxWidth: 300,
      minWidth: 260
    });
    
    mapViewState.markers.push(marker);
    mapViewState.markerClusterGroup.addLayer(marker);
  });
}

/**
 * Create popup content for marker
 */
function createMapPopup(rec) {
  const category = rec.category?.toLowerCase() || 'other';
  const icon = getCategoryIcon(category);
  
  return `
    <div class="map-popup-content">
      <div class="map-popup-header">
        <div class="map-popup-icon ${category}">
          <i class="fas fa-${icon}"></i>
        </div>
        <div class="map-popup-details">
          <div class="map-popup-name">${escapeHtml(rec.name)}</div>
          <div class="map-popup-category">${escapeHtml(rec.category)}</div>
        </div>
      </div>
      <div class="map-popup-meta">
        <div class="map-popup-meta-item">
          <i class="fas fa-star"></i>
          <span class="map-popup-rating">${rec.rating.toFixed(1)}</span>
        </div>
        <div class="map-popup-meta-item">
          <i class="fas fa-map-marker-alt"></i>
          <span>${rec.distanceFromCenter.toFixed(1)} km away</span>
        </div>
        ${rec.priceLevel ? `
          <div class="map-popup-meta-item">
            <i class="fas fa-dollar-sign"></i>
            <span>${'$'.repeat(rec.priceLevel)}</span>
          </div>
        ` : ''}
      </div>
      <div class="map-popup-actions">
        <button class="map-popup-btn map-popup-btn-primary" onclick="addFromMapPopup('${escapeHtml(rec.name)}')">
          <i class="fas fa-plus"></i>
          Add to Trip
        </button>
        <button class="map-popup-btn map-popup-btn-secondary" onclick="showRecommendationDetails(${JSON.stringify(rec).replace(/"/g, '&quot;')})">
          <i class="fas fa-info"></i>
          Details
        </button>
      </div>
    </div>
  `;
}

/**
 * Add place from map popup
 */
window.addFromMapPopup = async function(placeName) {
  const rec = mapViewState.recommendations.find(r => r.name === placeName);
  if (!rec) return;

  try {
    await addRecommendationToTrip(rec);
    
    // Close popup
    mapViewState.map.closePopup();
    
    // Show success
    showToast('Place added to your trip!', 'success');
    
    // Reload recommendations
    if (typeof loadRecommendations === 'function') {
      await loadRecommendations();
    }
    if (typeof loadPlaces === 'function') {
      await loadPlaces();
    }
  } catch (err) {
    console.error('Error adding place from map:', err);
  }
};

/**
 * Toggle map legend
 */
function toggleMapLegend() {
  const legend = document.getElementById('mapLegend');
  if (!legend) return;

  legend.classList.toggle('hidden');
}

/**
 * Update map markers when recommendations change
 */
function updateMapMarkers(recommendations) {
  if (!mapViewState.map || !mapViewState.markerClusterGroup) return;

  mapViewState.recommendations = recommendations;
  
  // Clear existing markers
  mapViewState.markerClusterGroup.clearLayers();
  mapViewState.markers = [];
  
  // Add new markers
  addRecommendationMarkers();
  
  // Fit bounds
  if (mapViewState.markers.length > 0) {
    const group = L.featureGroup(mapViewState.markers);
    mapViewState.map.fitBounds(group.getBounds().pad(0.1));
  }
}

/**
 * Focus map on specific place
 */
function focusMapOnPlace(placeName) {
  if (!mapViewState.isMapActive) {
    toggleMapView();
  }

  const rec = mapViewState.recommendations.find(r => r.name === placeName);
  if (!rec || !rec.location) return;

  const [lon, lat] = rec.location.coordinates;
  
  setTimeout(() => {
    if (mapViewState.map) {
      mapViewState.map.setView([lat, lon], 16);
      
      // Find and open marker popup
      mapViewState.markerClusterGroup.eachLayer(layer => {
        const latlng = layer.getLatLng();
        if (Math.abs(latlng.lat - lat) < 0.0001 && Math.abs(latlng.lng - lon) < 0.0001) {
          layer.openPopup();
        }
      });
    }
  }, 500);
}