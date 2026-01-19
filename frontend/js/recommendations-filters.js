// ============================================================================
// FILE: recommendations-filters.js (UPDATED with Loading State Management)
// ============================================================================

let recFiltersState = {
  selectedCategory: 'all',
  allRecommendations: [],
  filteredRecommendations: [],
  isLoading: false,
  loadingSteps: []
};

/**
 * Initialize - AUTO-LOAD all categories via AI
 */
function initRecommendationFilters(recommendations) {
  console.log('🤖 AI Recommendations System Initialized');
  
  recFiltersState.allRecommendations = [...recommendations];
  recFiltersState.filteredRecommendations = [...recommendations];
  
  if (!document.querySelector('.recommendations-filters')) {
    renderFilterUI();
    attachFilterListeners();
  }
  
  updateDisplay();
}

/**
 * Render filter UI
 */
function renderFilterUI() {
  const section = document.querySelector('.recommendations-section');
  if (!section) return;

  const filtersHTML = `
    <div class="recommendations-filters">
      <div class="filters-header">
        <h4>
          <i class="fas fa-brain"></i>
          AI-Powered Recommendations
        </h4>
        <div class="ai-status-badge" id="aiStatusBadge">
          <span class="ai-pulse"></span>
          AI Ready
        </div>
      </div>

      <!-- Category Pills - Each triggers AI -->
      <div class="category-pills" id="categoryPills">
        <button class="category-pill all active" data-category="all">
          <i class="fas fa-globe"></i>
          <span>Show All</span>
        </button>
        <button class="category-pill restaurant" data-category="restaurant">
          <i class="fas fa-utensils"></i>
          <span>Famous Restaurants</span>
          <div class="ai-indicator">🤖</div>
        </button>
        <button class="category-pill attraction" data-category="attraction">
          <i class="fas fa-landmark"></i>
          <span>Tourist Attractions</span>
          <div class="ai-indicator">🤖</div>
        </button>
        <button class="category-pill accommodation" data-category="accommodation">
          <i class="fas fa-hotel"></i>
          <span>Famous Hotels</span>
          <div class="ai-indicator">🤖</div>
        </button>
      </div>

      <!-- Summary -->
      <div class="filter-summary" id="recFilterSummary">
        <i class="fas fa-info-circle"></i>
        Showing <strong id="recFilterCount">${recFiltersState.allRecommendations.length}</strong> AI recommendations
      </div>
    </div>
  `;

  const grid = document.getElementById('recommendationsGrid');
  if (grid) {
    grid.insertAdjacentHTML('beforebegin', filtersHTML);
  }
}

/**
 * Attach event listeners
 */
function attachFilterListeners() {
  document.querySelectorAll('.category-pill').forEach(pill => {
    pill.addEventListener('click', () => handleCategoryClick(pill));
  });
}

/**
 * Handle category click - AUTOMATICALLY FETCH AI
 * NOW WITH LOADING STATE PREVENTION
 */
async function handleCategoryClick(pill) {
  // PREVENT CLICKS DURING LOADING
  if (recFiltersState.isLoading || recommendationsState.isLoading) {
    showToast('Please wait, AI is still working...', 'info');
    return;
  }

  const category = pill.dataset.category;
  
  // Update active state
  document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
  pill.classList.add('active');
  
  recFiltersState.selectedCategory = category;
  recommendationsState.lastCategory = category; // Save for retry

  if (category === 'all') {
    // Show all existing recommendations
    updateDisplay();
  } else {
    // AUTOMATICALLY FETCH AI RECOMMENDATIONS
    await fetchAIRecommendations(category);
  }
}

/**
 * Fetch AI recommendations with loading state management
 */
async function fetchAIRecommendations(category) {
  try {
    // SET LOADING STATE
    recFiltersState.isLoading = true;
    
    // DISABLE ALL FILTER BUTTONS
    disableFilterButtons();
    
    // UPDATE STATUS BADGE
    updateStatusBadge('loading', 'AI Processing...');
    
    console.log(`🤖 AI is analyzing ${category}...`);
    
    // CALL THE MAIN LOADING FUNCTION
    // This will show the full loading UI with steps
    await loadRecommendations({
      category: category,
      limit: 50
    });
    
    // SUCCESS - Update status
    updateStatusBadge('success', 'AI Ready');
    
  } catch (err) {
    console.error('❌ AI fetch failed:', err);
    
    // ERROR STATE
    updateStatusBadge('error', 'AI Error');
    showToast('AI recommendations failed to load. Please try again.', 'error');
    
  } finally {
    // ALWAYS RE-ENABLE BUTTONS
    recFiltersState.isLoading = false;
    enableFilterButtons();
  }
}

/**
 * Disable all filter buttons during loading
 */
function disableFilterButtons() {
  document.querySelectorAll('.category-pill').forEach(pill => {
    pill.classList.add('disabled');
    pill.style.cursor = 'not-allowed';
    pill.style.opacity = '0.5';
  });
  
  // Also disable any other filter controls if they exist
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.add('disabled');
    btn.disabled = true;
  });
}

/**
 * Enable all filter buttons after loading
 */
function enableFilterButtons() {
  document.querySelectorAll('.category-pill').forEach(pill => {
    pill.classList.remove('disabled');
    pill.style.cursor = 'pointer';
    pill.style.opacity = '1';
  });
  
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('disabled');
    btn.disabled = false;
  });
}

/**
 * Update status badge
 */
function updateStatusBadge(state, text) {
  const badge = document.getElementById('aiStatusBadge');
  if (!badge) return;
  
  // Remove all state classes
  badge.classList.remove('loading', 'success', 'error');
  
  // Add new state class
  badge.classList.add(state);
  
  // Update content
  let icon = '';
  switch (state) {
    case 'loading':
      icon = '<i class="fas fa-spinner fa-spin"></i>';
      break;
    case 'success':
      icon = '<span class="ai-pulse"></span>';
      break;
    case 'error':
      icon = '<i class="fas fa-exclamation-circle"></i>';
      break;
  }
  
  badge.innerHTML = `${icon} ${text}`;
}

/**
 * Display filtered recommendations with stagger animation
 */
function displayFilteredRecommendations() {
  const container = document.getElementById('recommendationsGrid');
  if (!container) return;

  const recs = recFiltersState.filteredRecommendations;

  if (recs.length === 0) {
    container.innerHTML = `
      <div class="recommendations-empty">
        <i class="fas fa-robot"></i>
        <h3>No AI recommendations found</h3>
        <p>Try selecting a different category</p>
      </div>
    `;
    return;
  }

  // Fade transition
  container.style.opacity = '0';
  
  setTimeout(() => {
    // Create cards with stagger delay for animation
    container.innerHTML = recs.map((rec, index) => {
      const card = createRecommendationCard(rec);
      return `<div class="rec-card-wrapper" style="animation-delay: ${index * 0.05}s">${card}</div>`;
    }).join('');
    
    container.style.opacity = '1';

    // Reattach listeners after slight delay
    setTimeout(() => {
      if (typeof attachRecommendationListeners === 'function') {
        attachRecommendationListeners(recs);
      }
      
      if (typeof updateMapMarkers === 'function') {
        updateMapMarkers(recs);
      }
      
      addAIBadges();
    }, 100);
  }, 200);
}

/**
 * Add AI badges to cards
 */
function addAIBadges() {
  setTimeout(() => {
    const cards = document.querySelectorAll('.recommendation-card');
    
    cards.forEach((card, index) => {
      const rec = recFiltersState.filteredRecommendations[index];
      
      if (rec && rec.source === 'groq_ai') {
        const badge = document.createElement('div');
        badge.className = 'ai-badge-card';
        badge.innerHTML = '<i class="fas fa-brain"></i> AI';
        card.insertBefore(badge, card.firstChild);
        card.classList.add('ai-powered-card');
      }
    });
  }, 100);
}

/**
 * Update display (for "Show All")
 */
function updateDisplay() {
  let filtered = [...recFiltersState.allRecommendations];
  
  if (recFiltersState.selectedCategory !== 'all') {
    filtered = filtered.filter(rec => 
      rec.category.toLowerCase() === recFiltersState.selectedCategory.toLowerCase()
    );
  }
  
  recFiltersState.filteredRecommendations = filtered;
  
  displayFilteredRecommendations();
  updateSummary();
}

/**
 * Update summary
 */
function updateSummary() {
  const count = document.getElementById('recFilterCount');
  if (!count) return;

  const total = recFiltersState.filteredRecommendations.length;
  count.textContent = total;
  
  const summary = document.getElementById('recFilterSummary');
  if (summary) {
    const categoryText = recFiltersState.selectedCategory === 'all' 
      ? 'AI recommendations' 
      : `${getCategoryName(recFiltersState.selectedCategory)}`;
    
    summary.innerHTML = `
      <i class="fas fa-robot"></i>
      Showing <strong>${total}</strong> ${categoryText}
      <span class="ai-badge-inline">🤖 AI</span>
    `;
  }
}

/**
 * Get category display name
 */
function getCategoryName(category) {
  const names = {
    restaurant: 'restaurants',
    attraction: 'tourist attractions',
    accommodation: 'hotels',
    all: 'places'
  };
  return names[category] || 'places';
}

/**
 * Get filtered recommendations
 */
function getFilteredRecommendations() {
  return recFiltersState.filteredRecommendations;
}

/**
 * Reset filters
 */
function resetAllFilters() {
  // Don't allow reset during loading
  if (recFiltersState.isLoading || recommendationsState.isLoading) {
    showToast('Please wait until loading is complete', 'info');
    return;
  }
  
  recFiltersState.selectedCategory = 'all';
  document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
  document.querySelector('.category-pill[data-category="all"]')?.classList.add('active');
  updateDisplay();
}