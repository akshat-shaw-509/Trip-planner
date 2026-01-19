// js/day-builder.js - Build My Day Itinerary Generator

let dayBuilderState = {
  tripId: null,
  tripData: null,
  dayPlans: [],
  selectedDay: null,
  currentTimeline: [],
  isLoading: false
};

/**
 * Initialize Day Builder
 */
function initDayBuilder(tripId, tripData) {
  dayBuilderState.tripId = tripId;
  dayBuilderState.tripData = tripData;
  
  renderDayBuilderCTA();
}

/**
 * Render CTA button in recommendations section
 */
function renderDayBuilderCTA() {
  const container = document.querySelector('.recommendations-section');
  if (!container) return;

  const ctaHTML = `
    <div class="day-builder-cta">
      <h2>
        <i class="fas fa-magic"></i>
        Ready to Plan Your Day?
      </h2>
      <p>Let us organize your places into a smart daily itinerary based on location and timing</p>
      <button onclick="openDayBuilder()">
        <i class="fas fa-calendar-day"></i>
        Build My Day
      </button>
    </div>
  `;

  container.insertAdjacentHTML('afterend', ctaHTML);
}

/**
 * Open Day Builder Modal
 */
async function openDayBuilder() {
  // Create modal if it doesn't exist
  if (!document.getElementById('dayBuilderModal')) {
    renderDayBuilderModal();
  }

  const modal = document.getElementById('dayBuilderModal');
  if (modal) {
    modal.classList.add('active');
    await loadDayPlans();
    renderDaySelector();
  }
}

/**
 * Render Day Builder Modal Structure
 */
function renderDayBuilderModal() {
  const html = `
    <div class="day-builder-modal" id="dayBuilderModal">
      <div class="day-builder-content">
        <div class="day-builder-header">
          <h3>
            <i class="fas fa-calendar-day"></i>
            Build Your Itinerary
          </h3>
          <button class="day-builder-close" onclick="closeDayBuilder()">&times;</button>
        </div>
        <div class="day-builder-body">
          <div class="day-selector" id="daySelector">
            <!-- Day tabs will be inserted here -->
          </div>
          <div class="timeline-container" id="timelineContainer">
            <!-- Timeline will be inserted here -->
          </div>
        </div>
        <div class="day-builder-footer">
          <div class="day-builder-info" id="dayBuilderInfo">
            Drag to reorder • Click × to remove
          </div>
          <div class="day-builder-actions">
            <button class="btn-cancel" onclick="closeDayBuilder()">Cancel</button>
            <button class="btn-save-itinerary" id="saveItineraryBtn" onclick="saveItinerary()">
              <i class="fas fa-save"></i>
              Save to Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);
}

/**
 * Load day plans from backend
 */
async function loadDayPlans() {
  dayBuilderState.isLoading = true;
  showTimelineLoading();

  try {
    const res = await apiService.recommendations.getDayPlans(dayBuilderState.tripId);
    dayBuilderState.dayPlans = res.data || [];
    
    console.log('Loaded day plans:', dayBuilderState.dayPlans);
  } catch (err) {
    console.error('Error loading day plans:', err);
    showTimelineError();
  } finally {
    dayBuilderState.isLoading = false;
  }
}

/**
 * Render day selector tabs
 */
function renderDaySelector() {
  const container = document.getElementById('daySelector');
  if (!container) return;

  const trip = dayBuilderState.tripData;
  if (!trip) return;

  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);
  const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

  let tabsHTML = '<label>Select a day to plan:</label><div class="day-tabs">';

  for (let i = 0; i < days; i++) {
    const dayDate = new Date(startDate);
    dayDate.setDate(dayDate.getDate() + i);
    
    const dateStr = dayDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });

    const isActive = i === 0 ? 'active' : '';
    
    tabsHTML += `
      <button class="day-tab ${isActive}" data-day="${i + 1}" onclick="selectDay(${i + 1})">
        <div>Day ${i + 1}</div>
        <span class="day-tab-date">${dateStr}</span>
      </button>
    `;
  }

  tabsHTML += '</div>';
  container.innerHTML = tabsHTML;

  // Auto-select first day
  if (!dayBuilderState.selectedDay) {
    selectDay(1);
  }
}

/**
 * Select a day and load its timeline
 */
function selectDay(dayNumber) {
  dayBuilderState.selectedDay = dayNumber;

  // Update active tab
  document.querySelectorAll('.day-tab').forEach(tab => {
    if (parseInt(tab.dataset.day) === dayNumber) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  loadTimelineForDay(dayNumber);
}

/**
 * Load timeline for selected day
 */
function loadTimelineForDay(dayNumber) {
  const dayPlan = dayBuilderState.dayPlans.find(p => p.day === dayNumber);

  if (!dayPlan || !dayPlan.places || dayPlan.places.length === 0) {
    showTimelineEmpty();
    return;
  }

  dayBuilderState.currentTimeline = dayPlan.places.map((place, index) => ({
    ...place,
    order: index,
    startTime: calculateStartTime(index, dayPlan.places)
  }));

  renderTimeline();
  enableDragAndDrop();
}

/**
 * Calculate start time for a place in timeline
 */
function calculateStartTime(index, places) {
  let startHour = 9; // Start at 9 AM
  let startMinute = 0;

  for (let i = 0; i < index; i++) {
    const duration = estimatePlaceDuration(places[i]);
    startHour += Math.floor(duration);
    startMinute += (duration % 1) * 60;
    
    if (startMinute >= 60) {
      startHour += 1;
      startMinute -= 60;
    }
  }

  return `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
}

/**
 * Estimate duration for a place based on category
 */
function estimatePlaceDuration(place) {
  const durations = {
    restaurant: 1.5,
    attraction: 2,
    accommodation: 0.5,
    transport: 0.5,
    other: 1
  };
  return durations[place.category?.toLowerCase()] || 1;
}

/**
 * Render timeline
 */
function renderTimeline() {
  const container = document.getElementById('timelineContainer');
  if (!container) return;

  const timeline = dayBuilderState.currentTimeline;

  const headerHTML = `
    <div class="timeline-header">
      <h4>Your Itinerary for Day ${dayBuilderState.selectedDay}</h4>
      <div class="timeline-stats">
        <div class="timeline-stat">
          <i class="fas fa-map-marker-alt"></i>
          ${timeline.length} places
        </div>
        <div class="timeline-stat">
          <i class="fas fa-clock"></i>
          ~${timeline.reduce((sum, p) => sum + estimatePlaceDuration(p), 0).toFixed(1)}h
        </div>
      </div>
    </div>
  `;

  const itemsHTML = timeline.map((place, index) => {
    const duration = estimatePlaceDuration(place);
    const icon = getCategoryIcon(place.category);

    return `
      <div class="timeline-item" data-index="${index}" draggable="true">
        <div class="timeline-time">
          <div class="timeline-time-value">${place.startTime}</div>
          <div class="timeline-time-duration">${duration}h</div>
        </div>
        <div class="timeline-content">
          <div class="timeline-icon ${place.category?.toLowerCase()}">
            <i class="fas fa-${icon}"></i>
          </div>
          <div class="timeline-details">
            <div class="timeline-place-name">${escapeHtml(place.name)}</div>
            <div class="timeline-place-meta">
              <span>
                <i class="fas fa-star"></i>
                ${(place.rating || 0).toFixed(1)}
              </span>
              <span>
                <i class="fas fa-tag"></i>
                ${escapeHtml(place.category)}
              </span>
            </div>
          </div>
        </div>
        <div class="timeline-actions">
          <div class="timeline-drag-handle">
            <i class="fas fa-grip-vertical"></i>
          </div>
          <button class="timeline-remove-btn" onclick="removeFromTimeline(${index})">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = headerHTML + '<div class="timeline-list">' + itemsHTML + '</div>';
}

/**
 * Enable drag and drop for timeline reordering
 */
function enableDragAndDrop() {
  const items = document.querySelectorAll('.timeline-item');
  let draggedItem = null;
  let draggedIndex = null;

  items.forEach(item => {
    item.addEventListener('dragstart', (e) => {
      draggedItem = item;
      draggedIndex = parseInt(item.dataset.index);
      item.classList.add('dragging');
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      draggedItem = null;
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      const afterElement = getDragAfterElement(e.clientY);
      const container = item.parentElement;
      
      if (afterElement == null) {
        container.appendChild(draggedItem);
      } else {
        container.insertBefore(draggedItem, afterElement);
      }
    });

    item.addEventListener('drop', (e) => {
      e.preventDefault();
      const dropIndex = parseInt(item.dataset.index);
      
      if (draggedIndex !== null && draggedIndex !== dropIndex) {
        reorderTimeline(draggedIndex, dropIndex);
      }
    });
  });
}

/**
 * Get element after drag position
 */
function getDragAfterElement(y) {
  const items = [...document.querySelectorAll('.timeline-item:not(.dragging)')];
  
  return items.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

/**
 * Reorder timeline after drag
 */
function reorderTimeline(fromIndex, toIndex) {
  const item = dayBuilderState.currentTimeline.splice(fromIndex, 1)[0];
  dayBuilderState.currentTimeline.splice(toIndex, 0, item);
  
  // Recalculate times
  dayBuilderState.currentTimeline = dayBuilderState.currentTimeline.map((place, index) => ({
    ...place,
    order: index,
    startTime: calculateStartTime(index, dayBuilderState.currentTimeline)
  }));
  
  renderTimeline();
  enableDragAndDrop();
}

/**
 * Remove place from timeline
 */
function removeFromTimeline(index) {
  dayBuilderState.currentTimeline.splice(index, 1);
  
  if (dayBuilderState.currentTimeline.length === 0) {
    showTimelineEmpty();
  } else {
    // Recalculate times
    dayBuilderState.currentTimeline = dayBuilderState.currentTimeline.map((place, i) => ({
      ...place,
      order: i,
      startTime: calculateStartTime(i, dayBuilderState.currentTimeline)
    }));
    
    renderTimeline();
    enableDragAndDrop();
  }
}

/**
 * Save itinerary to trip
 */
async function saveItinerary() {
  const btn = document.getElementById('saveItineraryBtn');
  if (!btn) return;

  if (dayBuilderState.currentTimeline.length === 0) {
    showToast('Please add some places to your itinerary', 'warning');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

  try {
    const trip = dayBuilderState.tripData;
    const startDate = new Date(trip.startDate);
    const selectedDate = new Date(startDate);
    selectedDate.setDate(selectedDate.getDate() + (dayBuilderState.selectedDay - 1));

    let addedCount = 0;

    for (const place of dayBuilderState.currentTimeline) {
      const placeData = {
        name: place.name,
        category: place.category,
        address: place.address || '',
        location: place.location,
        rating: place.rating || 0,
        priceLevel: place.priceLevel || 0,
        description: place.description || '',
        visitDate: selectedDate.toISOString(),
        notes: `Day ${dayBuilderState.selectedDay} itinerary - ${place.startTime}`
      };

      try {
        await apiService.places.create(dayBuilderState.tripId, placeData);
        addedCount++;
      } catch (err) {
        console.error('Error adding place:', err);
      }
    }

    if (addedCount > 0) {
      showToast(`Added ${addedCount} place(s) to Day ${dayBuilderState.selectedDay}!`, 'success');
      closeDayBuilder();
      
      // Reload places and recommendations
      if (typeof loadPlaces === 'function') {
        await loadPlaces();
      }
      if (typeof loadRecommendations === 'function') {
        await loadRecommendations();
      }
    }
  } catch (err) {
    console.error('Error saving itinerary:', err);
    showToast('Failed to save itinerary', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Save to Schedule';
  }
}

/**
 * Close Day Builder Modal
 */
function closeDayBuilder() {
  const modal = document.getElementById('dayBuilderModal');
  if (modal) {
    modal.classList.remove('active');
  }
}

/**
 * Show timeline loading state
 */
function showTimelineLoading() {
  const container = document.getElementById('timelineContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="timeline-loading">
      <div class="timeline-spinner"></div>
      <div class="timeline-loading-text">Generating your itinerary...</div>
    </div>
  `;
}

/**
 * Show timeline empty state
 */
function showTimelineEmpty() {
  const container = document.getElementById('timelineContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="timeline-empty">
      <i class="fas fa-calendar-times"></i>
      <h4>No places planned for this day yet</h4>
      <p>Add some places to your trip to see them here</p>
    </div>
  `;
}

/**
 * Show timeline error state
 */
function showTimelineError() {
  const container = document.getElementById('timelineContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="timeline-empty">
      <i class="fas fa-exclamation-triangle"></i>
      <h4>Failed to load day plans</h4>
      <p>Please try again later</p>
    </div>
  `;
}