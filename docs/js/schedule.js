(function() {
    'use strict'
    
    let tripId = null
    let tripData = null
    let selectedDate = new Date()
    let activities = []
    let currentActivityId = null
    let calendar = null

    document.addEventListener('DOMContentLoaded', async () => {
       if (!window.apiService) {
          showAlert('App failed to initialize. Please refresh.', 'error');
           return;
       }
        if (typeof window.apiService === 'undefined' && typeof apiService !== 'undefined') {
            window.apiService = apiService
        }
        // Check authentication
        let token = sessionStorage.getItem('accessToken')
        if (!token) {
            showAlert('Please log in to continue', 'error')
            setTimeout(() => window.location.href = '/Trip-planner/index.html', 1500)
            return
        }
        // Get trip ID from URL
        let urlParams = new URLSearchParams(window.location.search)
        tripId = urlParams.get('id')
        if (!tripId) {
            showAlert('Trip not found. Please select a trip first.', 'error')
            setTimeout(() => window.location.href = 'trips.html', 1500)
            return
        }
        try {
            await loadTripData()
            await loadActivities()
            initializeCalendar()
            generateTimeGrid()
            updateStats()
            setupEventListeners()

            // Set user name
            let user = JSON.parse(sessionStorage.getItem('user') || '{}')
            let userName = document.getElementById('userName')
            if (userName) {
                userName.textContent = user.name || 'User'
            }
        } catch (error) {
            console.error('Initialization error:', error)
            showAlert('Failed to initialize page: ' + error.message, 'error')
        }
    })

    // Setup all event listeners
    function setupEventListeners() {
        // Add activity buttons
        let addActivityBtn = document.getElementById('addActivityBtn')
        let addActivityEmptyBtn = document.getElementById('addActivityEmptyBtn')
        if (addActivityBtn) addActivityBtn.onclick = openAddActivityModal
        if (addActivityEmptyBtn) addActivityEmptyBtn.onclick = openAddActivityModal
        // Modal buttons
        let closeModalBtn = document.getElementById('closeModalBtn')
        let cancelBtn = document.getElementById('cancelBtn')
        let saveActivityBtn = document.getElementById('saveActivityBtn')
        if (closeModalBtn) closeModalBtn.onclick = closeActivityModal
        if (cancelBtn) cancelBtn.onclick = closeActivityModal
        if (saveActivityBtn) saveActivityBtn.onclick = saveActivity
        let todayBtn = document.getElementById('todayBtn')
        let logoutBtn = document.getElementById('logoutBtn')
        if (todayBtn) todayBtn.onclick = goToToday
        if (logoutBtn) {
            logoutBtn.onclick = () => {
                sessionStorage.removeItem('accessToken')
                sessionStorage.removeItem('user')
                window.location.href = '/Trip-planner/index.html'
            }
        }

        // Close modal on outside click
        let activityModal = document.getElementById('activityModal')
        if (activityModal) {
            activityModal.onclick = (e) => {
                if (e.target.id === 'activityModal') {
                    closeActivityModal()
                }
            }
        }
    }

    // Load trip data
    async function loadTripData() {
        try {
            // Use whichever apiService is available
            const api = window.apiService || apiService
            const response = await api.trips.getById(tripId)
            if (!response || !response.data) {
                throw new Error('Invalid response from server')
            }
            tripData = response.data
            let tripTitle = document.getElementById('tripTitle')
            let tripBreadcrumb = document.getElementById('tripBreadcrumb')
            let tripDates = document.getElementById('tripDates')
            if (tripTitle) tripTitle.textContent = tripData.title + ' Schedule'
            if (tripBreadcrumb) tripBreadcrumb.textContent = tripData.title
            let startDate = new Date(tripData.startDate).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
            })
            let endDate = new Date(tripData.endDate).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
            })
            if (tripDates) tripDates.textContent = `${startDate} - ${endDate}`
        } catch (error) {
            console.error('Error loading trip:', error)
            throw new Error('Failed to load trip data: ' + (error.message || 'Unknown error'))
        }
    }

    // Load activities
    async function loadActivities() {
        try {
            // Use whichever apiService is available
            const api = window.apiService || apiService
            const response = await api.activities.getByTrip(tripId)
            // Handle both response.data and direct array
            activities = response.data || response || []
            renderActivities()
        } catch (error) {
            console.error('Error loading activities:', error)
            activities = []
            renderActivities()
            if (error.statusCode !== 404) {
                showAlert('Could not load activities', 'warning')
            }
        }
    }

    // Flatpickr Calendar
    function initializeCalendar() {
        if (!tripData) {
            console.error('Cannot initialize calendar: trip data not loaded')
            return
        }
        let calendarEl = document.getElementById('calendar')
        if (!calendarEl) {
            console.error('Calendar element not found')
            return
        }
        try {
            calendar = flatpickr("#calendar", {
                inline: true,
                minDate: new Date(tripData.startDate),
                maxDate: new Date(tripData.endDate),
                defaultDate: selectedDate,
                onChange: function(selectedDates) {
                    if (selectedDates.length > 0) {
                        selectedDate = selectedDates[0]
                        updateSelectedDate()
                        renderActivities()
                    }
                },
                onDayCreate: function(daysElem, dObj, fp, dayElem) {
                    // Flatpickr passes dayElem.dateObj which is already a Date object
                    let date = dayElem.dateObj
                    // Validate the date
                    if (!date || isNaN(date.getTime())) {
                        return
                    }
                    let dateStr = formatDate(date)
                    let dayActivities = activities
                        .map(a => splitActivityByDay(a)).flat()
                        .filter(a => formatDate(a.startTime) === dateStr)
                    if (dayActivities.length > 0) {
                        let indicator = document.createElement('span')
                        indicator.className = 'event-indicator'
                        indicator.style.cssText = 'background: #4CAF50; width: 6px; height: 6px; border-radius: 50%; position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%);'
                        dayElem.appendChild(indicator)
                    }
                }
            })
            updateSelectedDate()
        } catch (error) {
            console.error('Calendar initialization error:', error)
            showAlert('Calendar failed to load', 'warning')
        }
    }

    function generateTimeGrid() {
        let timeGrid = document.querySelector('.time-grid')
        if (!timeGrid) return
        timeGrid.innerHTML = ''
        for (let hour = 0; hour < 24; hour++) {
            let timeSlot = document.createElement('div')
            timeSlot.className = 'time-slot'
            let timeLabel = document.createElement('div')
            timeLabel.className = 'time-label'
            timeLabel.textContent = formatHour(hour)
            timeSlot.appendChild(timeLabel)
            timeGrid.appendChild(timeSlot)
        }
    }

    // Render activities on timeline
    function renderActivities() {
        let timeline = document.getElementById('activitiesTimeline')
        let emptyState = document.getElementById('emptyTimeline')
        if (!timeline || !emptyState) return
        let dateStr = formatDate(selectedDate)
        let dayActivities = activities
            .map(a => splitActivityByDay(a)).flat()
            .filter(a => formatDate(a.startTime) === dateStr)
            .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
    
        if (dayActivities.length === 0) {
            timeline.innerHTML = ''
            emptyState.style.display = 'flex'
            return
        }

        emptyState.style.display = 'none'
        timeline.innerHTML = ''
        dayActivities.forEach(a => timeline.appendChild(createActivityBlock(a)))
    }

    // Create activity block element
    function createActivityBlock(activity) {
        let block = document.createElement('div')
        block.className = 'activity-block'
        let startTime = new Date(activity.startTime)
        let endTime = activity.endTime
            ? new Date(activity.endTime)
            : new Date(startTime.getTime() + 60 * 60 * 1000)
        let midnight = new Date(startTime)
        midnight.setHours(24, 0, 0, 0)
        let effectiveEnd = endTime > midnight ? midnight : endTime
        let startMinutes = startTime.getHours() * 60 + startTime.getMinutes()
        let endMinutes = effectiveEnd.getHours() * 60 + effectiveEnd.getMinutes()
        let duration = Math.max(endMinutes - startMinutes, 15)
        let PX_PER_MIN = 80 / 60     
        let MAX_HEIGHT = 320         
        let height = Math.min(duration * PX_PER_MIN, MAX_HEIGHT)
        block.style.top = `${startMinutes * PX_PER_MIN}px`
        block.style.height = `${height}px`

        let colors = {
            flight: '#2196F3',
            accommodation: '#9C27B0',
            restaurant: '#FF9800',
            attraction: '#4CAF50',
            transport: '#607D8B',
            shopping: '#E91E63',
            entertainment: '#00BCD4',
            other: '#795548'
        }

        block.style.borderLeftColor = colors[activity.type] || colors.other

        block.innerHTML = `
    <div class="activity-title">
      <i class="fas fa-${getActivityIcon(activity.type)}"></i>
      ${activity.title}${activity._segmentOf ? ' (continued)' : ''}
    </div>
    <div class="activity-description">${activity.description || ''}</div>
    <div class="activity-time">
      <i class="fas fa-clock"></i>
      ${formatTime(startTime)} - ${formatTime(effectiveEnd)}
    </div>
  `

        block.onclick = () => editActivity(activity)
        return block
    }

    // Get icon for activity type
    function getActivityIcon(type) {
        let icons = {
            flight: 'plane',
            accommodation: 'bed',
            restaurant: 'utensils',
            attraction: 'landmark',
            transport: 'car',
            shopping: 'shopping-bag',
            entertainment: 'ticket',
            other: 'circle'
        }

        return icons[type] || icons.other
    }

    // Update selected date display
    function updateSelectedDate() {
        if (!tripData) return

        let dateStr = selectedDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        })

        let selectedDateEl = document.getElementById('selectedDate')
        let dayInfoEl = document.getElementById('dayInfo')

        if (selectedDateEl) selectedDateEl.textContent = dateStr

        let tripStart = new Date(tripData.startDate)
        let tripStartMidnight = new Date(tripStart.toDateString())
        let selectedMidnight = new Date(selectedDate.toDateString())

        let dayNumber = Math.floor(
            (selectedMidnight - tripStartMidnight) / (1000 * 60 * 60 * 24)
        ) + 1

        if (dayInfoEl) dayInfoEl.textContent = `Day ${dayNumber} of your trip`
    }

    // Update statistics
    function updateStats() {
        let total = activities.length
        let completed = activities.filter(a => a.status === 'completed').length
        let pending = activities.filter(a => a.status === 'planned').length
        let totalEl = document.getElementById('totalActivities')
        let completedEl = document.getElementById('completedActivities')
        let pendingEl = document.getElementById('pendingActivities')
        if (totalEl) totalEl.textContent = total
        if (completedEl) completedEl.textContent = completed
        if (pendingEl) pendingEl.textContent = pending
    }

    // Open add activity modal
    function openAddActivityModal() {
        currentActivityId = null
        let modalTitle = document.getElementById('modalTitle')
        let form = document.getElementById('activityForm')
        if (modalTitle) modalTitle.textContent = 'Add Activity'
        if (form) form.reset()

        // Set default date and time
        let dateTime = new Date(selectedDate)
        dateTime.setHours(9, 0, 0, 0)
        let startTimeInput = document.getElementById('activityStartTime')
        if (startTimeInput) {
            startTimeInput.value = formatDateTime(dateTime)
        }
        let modal = document.getElementById('activityModal')
        if (modal) modal.classList.add('active')
    }

    // Close activity modal
    function closeActivityModal() {
        let modal = document.getElementById('activityModal')
        if (modal) modal.classList.remove('active')
        currentActivityId = null
    }

    // Edit activity
    function editActivity(activity) {
        currentActivityId = activity._id
        let modalTitle = document.getElementById('modalTitle')
        if (modalTitle) modalTitle.textContent = 'Edit Activity'
        document.getElementById('activityTitle').value = activity.title
        document.getElementById('activityDescription').value = activity.description || ''
        document.getElementById('activityStartTime').value = formatDateTime(new Date(activity.startTime))
        document.getElementById('activityEndTime').value = activity.endTime ? formatDateTime(new Date(activity.endTime)) : ''
        document.getElementById('activityType').value = activity.type
        document.getElementById('activityCost').value = activity.cost || ''
        document.getElementById('activityLocation').value = activity.location || ''
        document.getElementById('activityNotes').value = activity.notes || ''
        let modal = document.getElementById('activityModal')
        if (modal) modal.classList.add('active')
    }

    function formatDateTime(date) {
        let d = new Date(date)
        let year = d.getFullYear()
        let month = String(d.getMonth() + 1).padStart(2, '0')
        let day = String(d.getDate()).padStart(2, '0')
        let hours = String(d.getHours()).padStart(2, '0')
        let minutes = String(d.getMinutes()).padStart(2, '0')
        return `${year}-${month}-${day}T${hours}:${minutes}`
    }

    // Save activity
    async function saveActivity() {
        console.log('Sending activity data:', activityData);
        let title = document.getElementById('activityTitle').value.trim()
        let description = document.getElementById('activityDescription').value.trim()
        let startTime = document.getElementById('activityStartTime').value
        let endTime = document.getElementById('activityEndTime').value
        let type = document.getElementById('activityType').value
        let cost = parseFloat(document.getElementById('activityCost').value) || 0
        let location = document.getElementById('activityLocation').value.trim()
        let notes = document.getElementById('activityNotes').value.trim()

        if (!title || !startTime || !type) {
            showAlert('Please fill in all required fields', 'error')
            return
        }

        let activityData = {
            title,
            type,
            startTime: new Date(startTime).toISOString(),
            endTime: endTime ? new Date(endTime).toISOString() : null,
            visitStatus: 'planned',
            notes: notes || ''
        }
        try {
            const api = window.apiService || apiService
            if (currentActivityId) {
                await api.activities.update(currentActivityId, activityData)
                showAlert('Activity updated successfully', 'success')
            } else {
                await api.activities.create(tripId, activityData)
                showAlert('Activity created successfully', 'success')
            }

            closeActivityModal()
            await loadActivities()
            updateStats()

            if (calendar) {
                calendar.redraw()
            }
        } catch (error) {
            console.error('Error saving activity:', error)
            showAlert(error.message || 'Failed to save activity', 'error')
        }
    }

    // Go to today
    function goToToday() {
        if (!tripData) return
        let today = new Date()
        let tripStart = new Date(tripData.startDate)
        let tripEnd = new Date(tripData.endDate)
        if (today >= tripStart && today <= tripEnd) {
            selectedDate = today
            if (calendar) {
                calendar.setDate(today)
            }
            updateSelectedDate()
            renderActivities()
        } else {
            showAlert('Today is outside the trip dates', 'info')
        }
    }

    // Utility functions
    function formatTime(date) {
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    }

    function formatHour(hour) {
        let period = hour >= 12 ? 'PM' : 'AM'
        let displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
        return `${displayHour}:00 ${period}`
    }

    function formatDate(input) {
        let d = input instanceof Date ? input : new Date(input)
        
        if (isNaN(d.getTime())) {
            console.error('Invalid date:', input)
            return '1970-01-01'
        }
        
        let year = d.getFullYear()
        let month = String(d.getMonth() + 1).padStart(2, '0')
        let day = String(d.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }

    function showAlert(message, type = 'info') {
        let toast = document.createElement('div')
        toast.className = `toast toast-${type}`
        toast.textContent = message
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 24px;
            background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4CAF50' : type === 'warning' ? '#FF9800' : '#2196F3'};
            color: white;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            animation: slideIn 0.3s ease;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        `
        document.body.appendChild(toast)
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease'
            setTimeout(() => toast.remove(), 300)
        }, 3000)
    }

    function splitActivityByDay(activity) {
        let segments = []
        let start = new Date(activity.startTime)
        let end = activity.endTime
            ? new Date(activity.endTime)
            : new Date(start.getTime() + 60 * 60 * 1000)

        let current = new Date(start)
        let isFirst = true

        while (current < end) {
            let segmentStart = new Date(current)
            let nextMidnight = new Date(current)
            nextMidnight.setHours(24, 0, 0, 0)
            let segmentEnd = end < nextMidnight ? end : nextMidnight

            segments.push({
                _id: activity._id,
                title: activity.title,
                description: activity.description,
                type: activity.type,
                status: activity.status,
                startTime: segmentStart.toISOString(),
                endTime: segmentEnd.toISOString(),
                _segmentOf: isFirst ? null : activity._id
            })

            isFirst = false
            current = nextMidnight
        }

        return segments
    }

    // Add CSS for toast animations
    let style = document.createElement('style')
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
    `
    document.head.appendChild(style)
})()
