// js/map-view.js
// Enhanced map view with clustering for recommendations

let mapViewState = {
  map: null,
  markers: [],
  markerClusterGroup: null,
  isMapActive: false,
  recommendations: [],
  tripCenter: null
};

// ===================== Initialization =====================
function initEnhancedMapView(recommendations, tripCenter) {
  mapViewState.recommendations = recommendations;
  mapViewState.tripCenter = tripCenter;

  renderMapViewUI();
  attachMapListeners();
}

// ===================== UI Rendering =====================
function renderMapViewUI() {
  const container = document.querySelector('.recommendations-section');
  if (!container) return;

  const html = `
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

        <div class="map-legend hidden" id="mapLegend">
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

  container.insertAdjacentHTML('afterend', html);
}

// ===================== Event Listeners =====================
function attachMapListeners() {
  document
    .getElementById('mapViewToggleBtn')
    ?.addEventListener('click', toggleMapView);

  document
    .getElementById('mapLegendToggle')
    ?.addEventListener('click', toggleMapLegend);
}

// ===================== Map Toggle =====================
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

// ===================== Map Initialization =====================
async function initializeMap() {
  const mapElement = document.getElementById('enhanced-map');
  if (!mapElement) return;

  // Loading placeholder
  mapElement.innerHTML = `
    <div class="map-loading">
      <div class="map-loading-spinner"></div>
      <div class="map-loading-text">Loading map...</div>
    </div>
  `;

  if (typeof L === 'undefined') {
    console.error('Leaflet not loaded');
    return;
  }

  mapElement.innerHTML = '';

  const center = mapViewState.tripCenter || { lat: 20.5937, lon: 78.9629 };

  mapViewState.map = L.map('enhanced-map')
    .setView([center.lat, center.lon], 13);

  // Base map tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(mapViewState.map);

  // Cluster group for better performance
  mapViewState.markerClusterGroup = L.markerClusterGroup({
    chunkedLoading: true,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    maxClusterRadius: 50,
    iconCreateFunction(cluster) {
      const count = cluster.getChildCount();
      let size = 'small';

      if (count > 10) size = 'large';
      else if (count > 5) size = 'medium';

      return L.divIcon({
        html: `<div class="marker-cluster marker-cluster-${size}">${count}</div>`,
        className: '',
        iconSize: [40, 40]
      });
    }
  });

  // Trip center marker
  if (mapViewState.tripCenter) {
    const centerIcon = L.divIcon({
      html: '<div class="map-legend-icon center"><i class="fas fa-crosshairs"></i></div>',
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    L.marker([center.lat, center.lon], { icon: centerIcon })
      .addTo(mapViewState.map)
      .bindPopup('<b>Trip Center</b>');
  }

  addRecommendationMarkers();
  mapViewState.map.addLayer(mapViewState.markerClusterGroup);

  // Fit map to markers
  if (mapViewState.markers.length) {
    const group = L.featureGroup(mapViewState.markers);
    mapViewState.map.fitBounds(group.getBounds().pad(0.1));
  }

  setTimeout(() => mapViewState.map.invalidateSize(), 300);
}

// ===================== Markers =====================
function addRecommendationMarkers() {
  mapViewState.markers = [];

  mapViewState.recommendations.forEach(rec => {
    if (!rec.location?.coordinates) return;

    const [lon, lat] = rec.location.coordinates;
    const category = rec.category?.toLowerCase() || 'other';
    const icon = getCategoryIcon(category);

    const markerIcon = L.divIcon({
      html: `<div class="map-legend-icon ${category}">
              <i class="fas fa-${icon}"></i>
            </div>`,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const marker = L.marker([lat, lon], { icon: markerIcon });
    marker.bindPopup(createMapPopup(rec), {
      className: 'custom-popup',
      maxWidth: 300
    });

    mapViewState.markers.push(marker);
    mapViewState.markerClusterGroup.addLayer(marker);
  });
}

// ===================== Popup =====================
function createMapPopup(rec) {
  const category = rec.category?.toLowerCase() || 'other';
  const icon = getCategoryIcon(category);

  return `
    <div class="map-popup-content">
      <div class="map-popup-header">
        <div class="map-popup-icon ${category}">
          <i class="fas fa-${icon}"></i>
        </div>
        <div>
          <div class="map-popup-name">${escapeHtml(rec.name)}</div>
          <div class="map-popup-category">${escapeHtml(rec.category)}</div>
        </div>
      </div>

      <div class="map-popup-meta">
        <div><i class="fas fa-star"></i> ${rec.rating.toFixed(1)}</div>
        <div><i class="fas fa-map-marker-alt"></i> ${rec.distanceFromCenter.toFixed(1)} km</div>
        ${rec.priceLevel ? `<div>${'$'.repeat(rec.priceLevel)}</div>` : ''}
      </div>

      <div class="map-popup-actions">
        <button onclick="addFromMapPopup('${escapeHtml(rec.name)}')">
          <i class="fas fa-plus"></i> Add to Trip
        </button>
        <button onclick='showRecommendationDetails(${JSON.stringify(rec).replace(/"/g, '&quot;')})'>
          <i class="fas fa-info"></i> Details
        </button>
      </div>
    </div>
  `;
}

// ===================== Actions =====================
window.addFromMapPopup = async function (placeName) {
  const rec = mapViewState.recommendations.find(r => r.name === placeName);
  if (!rec) return;

  await addRecommendationToTrip(rec);
  mapViewState.map.closePopup();
  showToast('Place added to your trip!', 'success');

  if (typeof loadRecommendations === 'function') await loadRecommendations();
  if (typeof loadPlaces === 'function') await loadPlaces();
};

// ===================== Utilities =====================
function toggleMapLegend() {
  document.getElementById('mapLegend')?.classList.toggle('hidden');
}

function updateMapMarkers(recommendations) {
  if (!mapViewState.map || !mapViewState.markerClusterGroup) return;

  mapViewState.recommendations = recommendations;
  mapViewState.markerClusterGroup.clearLayers();
  mapViewState.markers = [];

  addRecommendationMarkers();

  if (mapViewState.markers.length) {
    const group = L.featureGroup(mapViewState.markers);
    mapViewState.map.fitBounds(group.getBounds().pad(0.1));
  }
}

function focusMapOnPlace(placeName) {
  const rec = mapViewState.recommendations.find(r => r.name === placeName);
  if (!rec?.location) return;

  if (!mapViewState.isMapActive) toggleMapView();

  const [lon, lat] = rec.location.coordinates;

  setTimeout(() => {
    mapViewState.map.setView([lat, lon], 16);
    mapViewState.markerClusterGroup.eachLayer(layer => {
      const p = layer.getLatLng();
      if (Math.abs(p.lat - lat) < 0.0001 && Math.abs(p.lng - lon) < 0.0001) {
        layer.openPopup();
      }
    });
  }, 400);
}
