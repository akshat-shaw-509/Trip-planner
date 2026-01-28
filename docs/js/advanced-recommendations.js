// Handles AI recommendations with map integration and compare features

// ====================== STATE ======================
let recommendationsState = {
    currentTripId: null,
    recommendations: [],
    dayPlans: [],
    userPreferences: null,
    isLoading: false
};

// ====================== INIT ======================
/**
 * Initialize recommendations module
 */
async function initRecommendations(tripId, tripData) {
    recommendationsState.currentTripId = tripId;
    
    // Load recommendations with trip data context
    await loadRecommendations();
    
    // Initialize advanced controls if available
    if (typeof initAdvancedRecommendations === 'function') {
        initAdvancedRecommendations();
    }
}

// ====================== LOAD RECOMMENDATIONS ======================
/**
 * Load recommendations from API with coordinate data
 */
async function loadRecommendations(options = {}) {
    try {
        recommendationsState.isLoading = true;
        showRecommendationsLoading();

        console.log('🔍 Loading recommendations for trip:', recommendationsState.currentTripId);

        const res = await apiService.recommendations.getForTrip(
            recommendationsState.currentTripId,
            options
        );

        const responseData = res.data || {};

        // Normalize backend response
        recommendationsState.recommendations = Array.isArray(responseData)
            ? responseData
            : responseData.places || [];

        console.log('✅ Loaded recommendations:', recommendationsState.recommendations.length);
        
        // Store in filterState for filtering/sorting
        if (typeof filterState !== 'undefined') {
            filterState.allRecommendations = [...recommendationsState.recommendations];
            filterState.filteredResults = [...recommendationsState.recommendations];
        }

        displayRecommendations();
        
        // ✅ Update map markers after recommendations load
        if (typeof updateMapWithRecommendations === 'function') {
            setTimeout(() => updateMapWithRecommendations(), 500);
        }

    } catch (err) {
        console.error('❌ Error loading recommendations:', err);
        showRecommendationsError();
    } finally {
        recommendationsState.isLoading = false;
    }
}

// ====================== DISPLAY RECOMMENDATIONS ======================
/**
 * Display recommendations with coordinate data for map
 */
function displayRecommendations() {
    const container = document.getElementById('recommendationsGrid');
    if (!container) return;

    const recs = recommendationsState.recommendations;

    if (recs.length === 0) {
        container.innerHTML = `
            <div class="recommendations-empty">
                <i class="fas fa-compass"></i>
                <h3>No recommendations yet</h3>
                <p>AI is generating personalized suggestions for your trip...</p>
            </div>
        `;
        return;
    }

    container.innerHTML = recs.map(rec => createRecommendationCard(rec)).join('');

    // Attach button listeners
    recs.forEach((rec, index) => {
        const card = container.children[index];
        if (!card) return;

        // Add to trip button
        const addBtn = card.querySelector('.btn-add-to-trip');
        if (addBtn) {
            addBtn.onclick = (e) => {
                e.stopPropagation();
                addRecommendationToTrip(rec);
            };
        }

        // View details button
        const detailsBtn = card.querySelector('.btn-view-details');
        if (detailsBtn) {
            detailsBtn.onclick = (e) => {
                e.stopPropagation();
                showRecommendationDetails(rec);
            };
        }

        // ✅ Compare checkbox handler
        const checkbox = card.querySelector('.rec-card-compare-checkbox');
        if (checkbox) {
            checkbox.onclick = (e) => {
                e.stopPropagation();
                toggleCompareSelection(rec, card);
            };
        }
    });

    console.log('📍 Recommendation cards rendered with coordinate data');
}

// ====================== RECOMMENDATION CARD WITH COORDINATES ======================
/**
 * Create recommendation card with data attributes for map
 */
function createRecommendationCard(rec) {
    const icon = getCategoryIcon(rec.category);
    
    // ✅ Extract coordinates for map
    const lat = rec.location?.coordinates?.[1] || rec.lat || 0;
    const lon = rec.location?.coordinates?.[0] || rec.lon || 0;

    const reasonsHTML = (rec.reasons || []).map(reason => `
        <span class="reason-tag">
            <i class="fas fa-check-circle"></i>
            ${escapeHtml(reason)}
        </span>
    `).join('');

    // ✅ Add data attributes for map and comparison
    return `
        <div class="recommendation-card" 
             data-place-id="${rec._id || rec.externalId || rec.name}" 
             data-category="${rec.category}" 
             data-lat="${lat}" 
             data-lon="${lon}">
            
            <!-- ✅ Compare Checkbox -->
            <div class="rec-card-compare-checkbox" title="Compare places">
                <i class="fas fa-check" style="display: none;"></i>
            </div>

            <div class="rec-header">
                <div class="rec-title">
                    <h3 class="rec-name">${escapeHtml(rec.name)}</h3>
                    <span class="rec-category">
                        <i class="fas fa-${icon}"></i>
                        ${escapeHtml(rec.category)}
                    </span>
                </div>
                <div class="rec-score">
                    <i class="fas fa-star"></i>
                    <span class="rec-rating">${(rec.recommendationScore || rec.rating || 0).toFixed(1)}</span>
                </div>
            </div>

            <div class="rec-meta">
                <div class="rec-rating-display">
                    <i class="fas fa-star"></i>
                    ${(rec.rating || 0).toFixed(1)}
                </div>
                ${rec.distanceFromCenter ? `
                    <div class="rec-distance">
                        <i class="fas fa-map-marker-alt"></i>
                        ${rec.distanceFromCenter.toFixed(1)} km away
                    </div>
                ` : ''}
                ${rec.priceLevel ? `
                    <div class="rec-price">
                        <i class="fas fa-dollar-sign"></i>
                        ${'$'.repeat(rec.priceLevel)}
                    </div>
                ` : ''}
            </div>

            ${reasonsHTML ? `
                <div class="rec-reasons">
                    <div class="rec-reasons-title">Why we recommend this</div>
                    ${reasonsHTML}
                </div>
            ` : ''}

            ${rec.description ? `
                <div class="rec-description">
                    ${escapeHtml(rec.description.substring(0, 150))}${rec.description.length > 150 ? '...' : ''}
                </div>
            ` : ''}

            ${rec.address ? `
                <div class="rec-address">
                    <i class="fas fa-map-pin"></i>
                    ${escapeHtml(rec.address)}
                </div>
            ` : ''}

            <div class="rec-actions">
                <button class="btn-add-to-trip">
                    <i class="fas fa-plus"></i> Add to Trip
                </button>
                <button class="btn-view-details">
                    <i class="fas fa-info-circle"></i>
                </button>
            </div>
        </div>
    `;
}

// ====================== COMPARE PLACES FEATURE ======================
/**
 * Toggle place selection for comparison
 */
function toggleCompareSelection(rec, card) {
    const checkbox = card.querySelector('.rec-card-compare-checkbox');
    const checkIcon = checkbox?.querySelector('i');
    
    if (card.classList.contains('comparing')) {
        // Deselect
        card.classList.remove('comparing');
        if (checkIcon) checkIcon.style.display = 'none';
        
        // Remove from comparison state
        if (typeof advancedRecState !== 'undefined') {
            advancedRecState.selectedForBulk.delete(rec.name);
        }
    } else {
        // Select
        card.classList.add('comparing');
        if (checkIcon) checkIcon.style.display = 'block';
        
        // Add to comparison state
        if (typeof advancedRecState !== 'undefined') {
            advancedRecState.selectedForBulk.add(rec.name);
        }
    }
    
    // Update comparison panel if it exists
    if (typeof updateComparisonPanel === 'function') {
        updateComparisonPanel();
    }
    
    // Update bulk actions bar
    if (typeof updateBulkActionsBar === 'function') {
        updateBulkActionsBar();
    }
}

// ====================== ADD TO TRIP ======================
/**
 * Add recommendation to user's trip places
 */
async function addRecommendationToTrip(rec) {
    try {
        // Validate coordinates
        const lat = rec.location?.coordinates?.[1] || rec.lat;
        const lon = rec.location?.coordinates?.[0] || rec.lon;

        if (!lat || !lon) {
            showToast('Missing location data for this place', 'error');
            return;
        }

        const placeData = {
            name: rec.name,
            category: rec.category,
            address: rec.address || '',
            location: {
                type: 'Point',
                coordinates: [lon, lat] // [longitude, latitude]
            },
            rating: rec.rating || 0,
            priceLevel: rec.priceLevel || 0,
            description: rec.description || '',
            notes: `Added from AI recommendations. ${(rec.reasons || []).join('. ')}`
        };

        await apiService.places.create(
            recommendationsState.currentTripId,
            placeData
        );

        showToast('✅ Place added to your trip!', 'success');

        // Remove from recommendations
        recommendationsState.recommendations = 
            recommendationsState.recommendations.filter(r => r.name !== rec.name);

        // Update filter state
        if (typeof filterState !== 'undefined') {
            filterState.allRecommendations = [...recommendationsState.recommendations];
            filterState.filteredResults = [...recommendationsState.recommendations];
        }

        displayRecommendations();

        // Reload user places
        if (typeof loadPlaces === 'function') {
            await loadPlaces();
        }

        // Track preference
        await trackPlaceAdded(rec.category);

    } catch (err) {
        console.error('❌ Error adding place:', err);
        showToast('Failed to add place: ' + (err.message || 'Unknown error'), 'error');
    }
}

// ====================== DETAILS MODAL ======================
function showRecommendationDetails(rec) {
    const modal = document.createElement('div');
    modal.className = 'modal active';

    const lat = rec.location?.coordinates?.[1] || rec.lat || 0;
    const lon = rec.location?.coordinates?.[0] || rec.lon || 0;

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-info-circle"></i> ${escapeHtml(rec.name)}</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div style="display: grid; gap: 16px;">
                    <div>
                        <strong><i class="fas fa-tag"></i> Category:</strong> 
                        <span style="text-transform: capitalize;">${escapeHtml(rec.category)}</span>
                    </div>
                    
                    <div>
                        <strong><i class="fas fa-star"></i> Rating:</strong> 
                        ${(rec.rating || 0).toFixed(1)} / 5.0
                    </div>
                    
                    ${rec.distanceFromCenter ? `
                        <div>
                            <strong><i class="fas fa-map-marker-alt"></i> Distance:</strong> 
                            ${rec.distanceFromCenter.toFixed(2)} km from center
                        </div>
                    ` : ''}
                    
                    ${rec.priceLevel ? `
                        <div>
                            <strong><i class="fas fa-dollar-sign"></i> Price Level:</strong> 
                            ${'$'.repeat(rec.priceLevel)} (${rec.priceLevel}/4)
                        </div>
                    ` : ''}
                    
                    ${rec.address ? `
                        <div>
                            <strong><i class="fas fa-map-pin"></i> Address:</strong><br>
                            ${escapeHtml(rec.address)}
                        </div>
                    ` : ''}
                    
                    ${rec.description ? `
                        <div>
                            <strong><i class="fas fa-align-left"></i> Description:</strong><br>
                            ${escapeHtml(rec.description)}
                        </div>
                    ` : ''}
                    
                    ${rec.reasons && rec.reasons.length > 0 ? `
                        <div>
                            <strong><i class="fas fa-lightbulb"></i> Why we recommend:</strong><br>
                            <ul style="margin: 8px 0 0 20px;">
                                ${rec.reasons.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    <div>
                        <strong><i class="fas fa-map"></i> Coordinates:</strong> 
                        ${lat.toFixed(4)}, ${lon.toFixed(4)}
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="this.closest('.modal').remove()">
                    Close
                </button>
                <button class="btn-primary" onclick="addRecommendationToTripFromModal(${JSON.stringify(rec).replace(/"/g, '&quot;')})">
                    <i class="fas fa-plus"></i> Add to Trip
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on background click
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
}

// Modal wrapper
window.addRecommendationToTripFromModal = async function(rec) {
    await addRecommendationToTrip(rec);
    document.querySelector('.modal')?.remove();
};

// ====================== PREFERENCE TRACKING ======================
async function trackPlaceAdded(category) {
    try {
        await apiService.preferences.trackSearch({
            category,
            query: '',
            location: null
        });
    } catch (err) {
        console.warn('⚠️ Preference tracking failed:', err);
    }
}

// ====================== UI STATES ======================
function showRecommendationsLoading() {
    const container = document.getElementById('recommendationsGrid');
    if (!container) return;
    container.innerHTML = `
        <div class="recommendations-loading">
            <div class="loading-spinner"></div>
            <p>🤖 AI is finding personalized recommendations...</p>
        </div>
    `;
}

function showRecommendationsError() {
    const container = document.getElementById('recommendationsGrid');
    if (!container) return;
    container.innerHTML = `
        <div class="recommendations-empty">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Failed to load recommendations</h3>
            <button class="btn-primary" onclick="loadRecommendations()">
                <i class="fas fa-redo"></i> Retry
            </button>
        </div>
    `;
}

// ====================== HELPERS ======================
function getCategoryIcon(category) {
    const icons = {
        restaurant: 'utensils',
        attraction: 'landmark',
        accommodation: 'bed',
        transport: 'bus',
        shopping: 'shopping-bag',
        entertainment: 'film',
        other: 'map-marker-alt'
    };
    return icons[category?.toLowerCase()] || 'map-marker-alt';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ✅ Make functions globally available
window.loadRecommendations = loadRecommendations;
window.displayRecommendations = displayRecommendations;
window.addRecommendationToTrip = addRecommendationToTrip;
window.initRecommendations = initRecommendations;

console.log('✅ Advanced recommendations module loaded with map and compare support');
