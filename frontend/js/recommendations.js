// js/recommendations.js

let recommendationsState = {
    currentTripId: null,
    recommendations: [],
    dayPlans: [],
    userPreferences: null,
    isLoading: false
};

/**
 * Initialize recommendations module
 */
async function initRecommendations(tripId) {
    recommendationsState.currentTripId = tripId;
    await loadRecommendations();
    await loadDayPlans();
}

/**
 * Load recommendations from API
 */
async function loadRecommendations(options = {}) {
    try {
        recommendationsState.isLoading = true;
        showRecommendationsLoading();

        const res = await apiService.recommendations.getForTrip(
            recommendationsState.currentTripId,
            options
        );

        // ✅ FIX: backend returns { places, budgetAnalysis, message }
        const responseData = res.data || {};

        recommendationsState.recommendations = Array.isArray(responseData)
            ? responseData
            : responseData.places || [];

        console.log(
            'Loaded recommendations:',
            recommendationsState.recommendations
        );

        displayRecommendations();
    } catch (err) {
        console.error('Error loading recommendations:', err);
        showRecommendationsError();
    } finally {
        recommendationsState.isLoading = false;
    }
}

/**
 * Load day plans from API
 */
async function loadDayPlans() {
    try {
        const res = await apiService.recommendations.getDayPlans(recommendationsState.currentTripId);
        
        recommendationsState.dayPlans = res.data || [];
        displayDayPlans();
    } catch (err) {
        console.error('Error loading day plans:', err);
    }
}

/**
 * Load user preferences - FIXED
 */
async function loadUserPreferences() {
    try {
        const res = await apiService.preferences.get();
        recommendationsState.userPreferences = res.data;
        return res.data;
    } catch (err) {
        console.error('Error loading preferences:', err);
        showToast('Failed to load preferences', 'error');
        return null;
    }
}

/**
 * Display recommendations in UI
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
                <p>Add some places to your trip to get personalized recommendations</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = recs.map(rec => createRecommendationCard(rec)).join('');
    
    // Attach event listeners
    recs.forEach((rec, index) => {
        const card = container.children[index];
        const addBtn = card.querySelector('.btn-add-to-trip');
        const detailsBtn = card.querySelector('.btn-view-details');
        
        if (addBtn) {
            addBtn.onclick = () => addRecommendationToTrip(rec);
        }
        
        if (detailsBtn) {
            detailsBtn.onclick = () => showRecommendationDetails(rec);
        }
    });
}

/**
 * Create recommendation card HTML
 */
function createRecommendationCard(rec) {
    const categoryIcon = getCategoryIcon(rec.category);
    const reasonsHTML = rec.reasons.map(reason => `
        <span class="reason-tag">
            <i class="fas fa-check-circle"></i>
            ${escapeHtml(reason)}
        </span>
    `).join('');
    
    return `
        <div class="recommendation-card">
            <div class="rec-header">
                <div class="rec-title">
                    <h3>${escapeHtml(rec.name)}</h3>
                    <span class="rec-category">
                        <i class="fas fa-${categoryIcon}"></i>
                        ${escapeHtml(rec.category)}
                    </span>
                </div>
                <div class="rec-score">
                    <i class="fas fa-star"></i>
                    ${rec.recommendationScore.toFixed(1)}
                </div>
            </div>
            
            <div class="rec-meta">
                <div class="rec-rating">
                    <i class="fas fa-star"></i>
                    ${rec.rating.toFixed(1)}
                </div>
                <div class="rec-distance">
                    <i class="fas fa-map-marker-alt"></i>
                    ${rec.distanceFromCenter.toFixed(1)} km away
                </div>
            </div>
            
            ${rec.reasons.length > 0 ? `
                <div class="rec-reasons">
                    <div class="rec-reasons-title">Why we recommend this</div>
                    ${reasonsHTML}
                </div>
            ` : ''}
            
            ${rec.address ? `
                <div class="rec-address">
                    <i class="fas fa-map-pin"></i>
                    <span>${escapeHtml(rec.address)}</span>
                </div>
            ` : ''}
            
            <div class="rec-actions">
                <button class="btn-add-to-trip">
                    <i class="fas fa-plus"></i>
                    Add to Trip
                </button>
                <button class="btn-view-details" title="View details">
                    <i class="fas fa-info"></i>
                </button>
            </div>
        </div>
    `;
}

/**
 * Display day plans
 */
function displayDayPlans() {
    const container = document.getElementById('dayPlansContainer');
    if (!container) return;
    
    const plans = recommendationsState.dayPlans;
    
    if (plans.length === 0) {
        container.innerHTML = `
            <div class="recommendations-empty">
                <i class="fas fa-calendar-alt"></i>
                <h3>No day plans yet</h3>
                <p>Add more places to generate daily itineraries</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = plans.map(plan => createDayPlanCard(plan)).join('');
}

/**
 * Create day plan card HTML
 */
function createDayPlanCard(plan) {
    const placesHTML = plan.places.map((place, index) => {
        const icon = getCategoryIcon(place.category);
        return `
            <div class="day-place-item">
                <div class="place-order">${index + 1}</div>
                <div class="place-icon">
                    <i class="fas fa-${icon}"></i>
                </div>
                <div class="place-details">
                    <h4>${escapeHtml(place.name)}</h4>
                    <p>${escapeHtml(place.category)} • ${place.rating ? place.rating.toFixed(1) + ' stars' : 'No rating'}</p>
                </div>
            </div>
        `;
    }).join('');
    
    return `
        <div class="day-plan-card">
            <div class="day-plan-header">
                <div class="day-plan-title">
                    <h3>Day ${plan.day}</h3>
                    <p class="day-plan-date">${new Date(plan.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                </div>
                <div class="day-plan-stats">
                    <div class="day-stat">
                        <i class="fas fa-map-marker-alt"></i>
                        ${plan.totalPlaces} places
                    </div>
                    <div class="day-stat">
                        <i class="fas fa-clock"></i>
                        ~${plan.estimatedDuration}h
                    </div>
                </div>
            </div>
            <div class="day-places-list">
                ${placesHTML}
            </div>
        </div>
    `;
}

/**
 * Add recommendation to trip
 */
async function addRecommendationToTrip(rec) {
    try {
        const placeData = {
            name: rec.name,
            category: rec.category,
            address: rec.address || '',
            location: rec.location,
            rating: rec.rating || 0,
            priceLevel: rec.priceLevel || 0,
            description: rec.description || '',
            notes: `Added from recommendations. ${rec.reasons.join('. ')}`
        };
        
        await apiService.places.addAI(tripId, placeData);
        
        showToast('Place added to your trip!', 'success');
        
        // Track user preference
        await trackPlaceAdded(rec.category);
        
        // Reload recommendations and places
        await loadRecommendations();
        if (typeof loadPlaces === 'function') {
            await loadPlaces();
        }
    } catch (err) {
        console.error('Error adding place:', err);
        showToast('Failed to add place', 'error');
    }
}

/**
 * Show recommendation details modal
 */
function showRecommendationDetails(rec) {
    // Create and show modal with full details
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-info-circle"></i> ${escapeHtml(rec.name)}</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Category</label>
                    <p>${escapeHtml(rec.category)}</p>
                </div>
                <div class="form-group">
                    <label>Rating</label>
                    <p>${rec.rating.toFixed(1)} / 5.0</p>
                </div>
                <div class="form-group">
                    <label>Distance</label>
                    <p>${rec.distanceFromCenter.toFixed(2)} km from trip center</p>
                </div>
                <div class="form-group">
                    <label>Address</label>
                    <p>${escapeHtml(rec.address || 'Not available')}</p>
                </div>
                ${rec.description ? `
                    <div class="form-group">
                        <label>Description</label>
                        <p>${escapeHtml(rec.description)}</p>
                    </div>
                ` : ''}
                <div class="form-group">
                    <label>Why recommended</label>
                    <ul>
                        ${rec.reasons.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
                    </ul>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
                <button class="btn-primary" onclick="addRecommendationToTripFromModal(${JSON.stringify(rec).replace(/"/g, '&quot;')})">
                    <i class="fas fa-plus"></i> Add to Trip
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

/**
 * Add recommendation from modal
 */
window.addRecommendationToTripFromModal = async function(rec) {
    await addRecommendationToTrip(rec);
    document.querySelector('.modal')?.remove();
};

/**
 * Track place addition for preference learning
 */
async function trackPlaceAdded(category) {
    try {
        await apiService.preferences.trackSearch({
            category,
            query: '',
            location: null
        });
    } catch (err) {
        console.error('Error tracking preference:', err);
    }
}

/**
 * Show user preferences modal - FIXED
 */
async function showUserPreferences() {
    try {
        const prefs = await loadUserPreferences();
        if (!prefs) {
            return; // Error already shown
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        
        const topCats = prefs.topCategories.slice(0, 5);
        const maxScore = Math.max(...topCats.map(cat => prefs.categoryScores[cat] || 0), 1);
        
        const chartHTML = topCats.map(cat => {
            const score = prefs.categoryScores[cat] || 0;
            const heightPercent = (score / maxScore) * 100;
            
            return `
                <div class="category-bar">
                    <div class="category-bar-fill" style="height: ${heightPercent}%">
                        <div class="category-score">${score}</div>
                    </div>
                    <div class="category-bar-label">${cat}</div>
                </div>
            `;
        }).join('');
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-user-cog"></i> Your Preferences</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="preferences-summary">
                        <h4>Category Preferences</h4>
                        <p style="color: #666; font-size: 14px; margin-bottom: 16px;">
                            Based on ${prefs.stats.totalPlacesAdded} places added and ${prefs.stats.totalFavorites} favorites
                        </p>
                        <div class="pref-category-chart">
                            ${chartHTML}
                        </div>
                    </div>
                    
                    <div class="preferences-summary">
                        <h4>Price Preference</h4>
                        <p>Preferred price level: ${prefs.priceRange.preferred} / 5</p>
                    </div>
                    
                    <div class="preferences-summary">
                        <h4>Rating Threshold</h4>
                        <p>Minimum rating: ${prefs.ratingThreshold.toFixed(1)} / 5.0</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="resetUserPreferences()">Reset Preferences</button>
                    <button class="btn-primary" onclick="this.closest('.modal').remove()">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    } catch (err) {
        console.error('Error showing preferences:', err);
        showToast('Failed to load preferences', 'error');
    }
}

/**
 * Reset user preferences
 */
async function resetUserPreferences() {
    if (!confirm('Are you sure you want to reset all your preferences? This cannot be undone.')) {
        return;
    }
    
    try {
        await apiService.preferences.reset();
        showToast('Preferences reset successfully', 'success');
        document.querySelector('.modal')?.remove();
        await loadRecommendations();
    } catch (err) {
        console.error('Error resetting preferences:', err);
        showToast('Failed to reset preferences', 'error');
    }
}

/**
 * Show loading state
 */
function showRecommendationsLoading() {
    const container = document.getElementById('recommendationsGrid');
    if (!container) return;
    
    container.innerHTML = `
        <div class="recommendations-loading">
            <div class="loading-spinner"></div>
            <p class="loading-text">Finding personalized recommendations...</p>
        </div>
    `;
}

/**
 * Show error state
 */
function showRecommendationsError() {
    const container = document.getElementById('recommendationsGrid');
    if (!container) return;
    
    container.innerHTML = `
        <div class="recommendations-empty">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Failed to load recommendations</h3>
            <p>Please try again later</p>
            <button class="btn-primary" onclick="loadRecommendations()" style="margin-top: 16px;">
                <i class="fas fa-redo"></i> Retry
            </button>
        </div>
    `;
}

// Helper functions
function getCategoryIcon(category) {
    const icons = {
        restaurant: 'utensils',
        attraction: 'landmark',
        accommodation: 'bed',
        transport: 'bus',
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

