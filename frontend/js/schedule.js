const { listen } = require("../../backend/app")

let currentTripId = null
let currentDate = null
let activities = []
let calendar = null

// Init everything
let initSchedule = async () => {
  if (!authHandler.requireAuth()) return
  currentTripId = new URLSearchParams(window.location.search).get('id')
  if (!currentTripId) {
    showToast('Select a trip first', 'error')
    setTimeout(() => window.location.href = '/trips', 2000)
    return
  }

  await Promise.all([
    loadTripDetails(),
    initCalendar(),
    initTimeGrid(),
    initModal()
  ])
  
  selectDate(new Date())
}

// Load trip data
let loadTripDetails = async () => {
  try {
    let response = await apiService.trips.getById(currentTripId)
    window.currentTrip = response.data
  } catch (error) {
    console.error('Load trip failed:', error)
  }
}

// Calendar setup
let initCalendar = () => {
  let el = document.getElementById('calendar')
  if (!flatpickr || !el) return

  let trip = window.currentTrip;
  calendar = flatpickr(el, {
    inline: true,
    minDate: trip?.startDate,
    maxDate: trip?.endDate,
    defaultDate: new Date(),
    onChange: ([date]) => date && selectDate(date)
  })
}

// 24h time grid
let initTimeGrid = () => {
  let grid = document.getElementById('time-grid')
  if (!grid) return
  grid.innerHTML = Array.from({ length: 24 }, (_, i) => 
    `<div class="time-slot"><span class="time-label">${formatHour(i)}</span></div>`
  ).join('')
}

let formatHour = (hour) => {
  let period = hour >= 12 ? 'PM' : 'AM'
  let display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${display}:00 ${period}`
}

// Main date selector
let selectDate = async (date) => {
  currentDate = date
  updateDateDisplay(date)
  await loadActivities(date)
}

let updateDateDisplay = (date) => {
  const display = document.getElementById('selected-date-display')
  if (display) {
    display.textContent = date.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })
  }
}

// Load + display activities
let loadActivities = async (date) => {
  try {
    let dateStr = date.toISOString().split('T')[0]
    let response = await apiService.activities.getByDate(currentTripId, dateStr)
    activities = response.data || []
    displayActivities()
  } catch (error) {
    console.error('Load activities failed:', error)
    displayActivities([])
  }
}

let displayActivities = () => {
  let timeline = document.getElementById('activities-timeline')
  if (!timeline) return

  timeline.innerHTML = activities.length 
    ? activities.map(createActivityBlock).join('')
    : '<div class="empty-timeline"><p>No activities</p></div>'
}

let createActivityBlock = (activity) => {
  let { top, height } = calculatePosition(activity)
  return `
    <div class="activity-block" 
         style="top: ${top}px; height: ${height}px; --bg-color: ${activity.color || '#ff99cc'};"
         data-activity-id="${activity._id}"
         onclick="editActivity('${activity._id}')">
      <div class="activity-title">${activity.title}</div>
      ${activity.description ? `<div class="activity-description">${activity.description}</div>` : ''}
      <div class="activity-time">${formatTimeRange(activity)}</div>
    </div>
  `
}

let calculatePosition = (activity) => {
  let start = new Date(activity.startTime)
  let end = activity.endTime ? new Date(activity.endTime) : null
  let top = (start.getHours() * 80) + (start.getMinutes() / 60 * 80)
  let height = end ? ((end - start) / (1000 * 60 * 60)) * 80 : 80
  return { top, height }
}

let formatTimeRange = (activity) => {
  let start = new Date(activity.startTime);
  let end = activity.endTime ? new Date(activity.endTime) : null;
  return `${start.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit', hour12: true})}${
    end ? ' - ' + end.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit', hour12: true}) : ''
  }`
}

// Modal handlers
let initModal = () => {
  let modal = document.getElementById('activity-modal')
  if (!modal) return

  document.getElementById('add-place-btn')?.addEventListener('click', openActivityModal)
  document.querySelector('#modal-close, #cancel-btn')?.addEventListener('click', closeActivityModal)
  document.getElementById('save-activity-btn')?.addEventListener('click', saveActivity)
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeActivityModal()
  })
}

let openActivityModal = (activity = null) => {
  let modal = document.getElementById('activity-modal')
  let title = document.getElementById('modal-title')
  
  if (activity) {
    title.textContent = 'Edit Activity'
    populateForm(activity)
    modal.dataset.activityId = activity._id
  } else {
    title.textContent = 'Add Activity'
    resetActivityForm()
    delete modal.dataset.activityId
  }
  modal.classList.add('active')
}

let closeActivityModal = () => {
  let modal = document.getElementById('activity-modal')
  modal?.classList.remove('active')
  resetActivityForm()
}

let resetActivityForm = () => {
  ['activity-title', 'activity-description', 'start-time', 'end-time'].forEach(id => {
    document.getElementById(id).value = ''
  })
}

let populateForm = (activity) => {
  document.getElementById('activity-title').value = activity.title
  document.getElementById('activity-description').value = activity.description || ''
  document.getElementById('start-time').value = new Date(activity.startTime).toTimeString().slice(0, 5)
  if (activity.endTime) {
    document.getElementById('end-time').value = new Date(activity.endTime).toTimeString().slice(0, 5)
  }
}

let saveActivity = async () => {
  let formData = getFormData()
  if (!formData.title || !formData.startTime) {
    showToast('Fill required fields', 'error')
    return
  }

  try {
    let modal = document.getElementById('activity-modal')
    let activityId = modal.dataset.activityId
    let response = activityId 
      ? await apiService.activities.update(activityId, formData)
      : await apiService.activities.create(currentTripId, formData)

    if (response.success) {
      showToast('Activity saved!', 'success')
      closeActivityModal()
      await loadActivities(currentDate)
    }
  } catch (error) {
    showToast('Save failed', 'error')
  }
}

let getFormData = () => {
  let color = document.querySelector('.color-option.active')?.dataset.color || '#ff99cc'
  return {
    title: document.getElementById('activity-title').value,
    description: document.getElementById('activity-description').value,
    type: 'other',
    startTime: combineDateAndTime(currentDate, document.getElementById('start-time').value),
    endTime: document.getElementById('end-time').value ? combineDateAndTime(currentDate, document.getElementById('end-time').value) : null,
    color,
  }
}

let combineDateAndTime = (date, timeStr) => {
  let [hours, minutes] = timeStr.split(':')
  let combined = new Date(date)
  combined.setHours(parseInt(hours), parseInt(minutes), 0, 0)
  return combined.toISOString()
}

let editActivity = (id) => {
  let activity = activities.find(a => a._id === id)
  if (activity) openActivityModal(activity)
}

// Start everything
document.addEventListener('DOMContentLoaded', initSchedule)

if (typeof window !== 'undefined') {
  window.editActivity = editActivity
}