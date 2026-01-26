// Activity management functionality
document.addEventListener('DOMContentLoaded', function() {
    let addPlaceBtn = document.getElementById('add-place-btn');
    let modal = document.getElementById('activity-modal');
    let modalClose = document.getElementById('modal-close');
    let cancelBtn = document.getElementById('cancel-btn');
    let saveBtn = document.getElementById('save-activity-btn');
    let timeGrid = document.getElementById('time-grid');
    let activitiesTimeline = document.getElementById('activities-timeline');
    
    // Form inputs
    let titleInput = document.getElementById('activity-title');
    let descriptionInput = document.getElementById('activity-description');
    let startTimeInput = document.getElementById('start-time');
    let endTimeInput = document.getElementById('end-time');
    let colorOptions = document.querySelectorAll('.color-option');
    
    let activities = [];
    let editingActivityId = null;
    let selectedColor = '#ff99cc';
    let currentDate = new Date();
    
    // Initialize timeline with time slots
    initializeTimeGrid();
    
    // Load sample activities
    loadSampleActivities();
    
    // Event listeners
    addPlaceBtn.addEventListener('click', openModal);
    modalClose.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    saveBtn.addEventListener('click', saveActivity);
    
    // Color picker
    colorOptions.forEach(option => {
        option.addEventListener('click', function() {
            colorOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            selectedColor = this.dataset.color;
        });
    });
    
    // Close modal on outside click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Listen for date changes from calendar
    window.addEventListener('dateSelected', function(e) {
        currentDate = e.detail.date;
        renderActivities();
    });
    
    function initializeTimeGrid() {
        let hours = [];
        for (let i = 0; i < 24; i++) {
            let hour = i === 0 ? 12 : i > 12 ? i - 12 : i;
            let period = i < 12 ? 'AM' : 'PM';
            hours.push({
                value: i,
                label: `${hour} ${period}`
            });
        }
        
        timeGrid.innerHTML = hours.map(hour => `
            <div class="time-slot" data-hour="${hour.value}">
                <span class="time-label">${hour.label}</span>
            </div>
        `).join('');
    }
    
    function openModal(activityId = null) {
        if (activityId) {
            const activity = activities.find(a => a.id === activityId);
            if (activity) {
                editingActivityId = activityId;
                titleInput.value = activity.title;
                descriptionInput.value = activity.description;
                startTimeInput.value = activity.startTime;
                endTimeInput.value = activity.endTime;
                selectedColor = activity.color;
                
                colorOptions.forEach(opt => {
                    opt.classList.toggle('active', opt.dataset.color === selectedColor);
                });
                
                document.getElementById('modal-title').textContent = 'Edit Activity';
            }
        } else {
            editingActivityId = null;
            titleInput.value = '';
            descriptionInput.value = '';
            startTimeInput.value = '';
            endTimeInput.value = '';
            document.getElementById('modal-title').textContent = 'Add Activity';
        }
        
        modal.classList.add('active');
    }
    
    function closeModal() {
        modal.classList.remove('active');
        editingActivityId = null;
    }
    
    function saveActivity() {
        let title = titleInput.value.trim();
        let description = descriptionInput.value.trim();
        let startTime = startTimeInput.value;
        let endTime = endTimeInput.value;
        
        if (!title || !startTime || !endTime) {
            alert('Please fill in all required fields');
            return;
        }
        
        if (startTime >= endTime) {
            alert('End time must be after start time');
            return;
        }
        
        let activity = {
            id: editingActivityId || Date.now(),
            date: formatDate(currentDate),
            title,
            description,
            startTime,
            endTime,
            color: selectedColor
        };
        
        if (editingActivityId) {
            let index = activities.findIndex(a => a.id === editingActivityId);
            activities[index] = activity;
        } else {
            activities.push(activity);
        }
        
        renderActivities();
        closeModal();
    }
    
    function deleteActivity(id) {
        if (confirm('Are you sure you want to delete this activity?')) {
            activities = activities.filter(a => a.id !== id);
            renderActivities();
        }
    }
    
    function renderActivities() {
        let dateStr = formatDate(currentDate);
        let dayActivities = activities.filter(a => a.date === dateStr);
        
        if (dayActivities.length === 0) {
            activitiesTimeline.innerHTML = `
                <div class="empty-timeline">
                    <p>No activities planned for this day</p>
                </div>
            `;
            return;
        }
        
        activitiesTimeline.innerHTML = dayActivities.map(activity => {
            let startHour = parseFloat(activity.startTime.replace(':', '.'));
            let endHour = parseFloat(activity.endTime.replace(':', '.'));
            let duration = endHour - startHour;
            let top = startHour * 80; // 80px per hour
            let height = duration * 80;
            
            return `
                <div class="activity-block" 
                     style="top: ${top}px; height: ${height}px; background: ${activity.color};"
                     onclick="editActivityById(${activity.id})"
                     title="Click to edit">
                    <div class="activity-title">${escapeHtml(activity.title)}</div>
                    ${activity.description ? `<div class="activity-description">${escapeHtml(activity.description)}</div>` : ''}
                    <div class="activity-time-badge">${formatTimeRange(activity.startTime, activity.endTime)}</div>
                </div>
            `;
        }).join('');
    }
    
    function loadSampleActivities() {
        let today = formatDate(new Date());
        activities = [
            {
                id: 1,
                date: today,
                title: 'Visit Doi Suthep Temple',
                description: 'Marvel at the golden pagoda and enjoy stunning city views',
                startTime: '10:00',
                endTime: '11:30',
                color: '#ff9999'
            },
            {
                id: 2,
                date: today,
                title: 'Explore Chiang Mai Old City',
                description: 'Wander through ancient streets and visit historic temples like Wat Chedi Luang and Wat Phra Singh',
                startTime: '13:00',
                endTime: '15:30',
                color: '#ffcccc'
            },
            {
                id: 3,
                date: today,
                title: 'Take a Thai Cooking Class',
                description: 'Learn to cook authentic Thai dishes with local ingredients',
                startTime: '16:00',
                endTime: '18:00',
                color: '#ccffcc'
            },
            {
                id: 4,
                date: today,
                title: 'Visit an Elephant Sanctuary',
                description: 'Interact ethically with elephants in a natural setting',
                startTime: '18:30',
                endTime: '19:30',
                color: '#ffffcc'
            },
            {
                id: 5,
                date: today,
                title: 'Shop at Chiang Mai Night Bazaar',
                description: 'Discover unique handicrafts, souvenirs, and delicious street food',
                startTime: '20:00',
                endTime: '22:00',
                color: '#e6ccff'
            }
        ];
        renderActivities();
    }
    
    function formatDate(date) {
        let year = date.getFullYear();
        let month = String(date.getMonth() + 1).padStart(2, '0');
        let day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    function formatTimeRange(start, end) {
        return `${formatTime(start)} - ${formatTime(end)}`;
    }
    
    function formatTime(time) {
        let [hours, minutes] = time.split(':');
        let hour = parseInt(hours);
        let period = hour >= 12 ? 'PM' : 'AM';
        let displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${displayHour}:${minutes} ${period}`;
    }
    
    function escapeHtml(text) {
        let div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Make functions globally accessible
    window.editActivityById = function(id) {
        openModal(id);
    };
    
    window.deleteActivityById = function(id) {
        deleteActivity(id);
    };
});