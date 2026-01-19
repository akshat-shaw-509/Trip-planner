// activities.js - Frontend Activities Manager
(function() {
    'use strict';
    
    // Prevent double loading
    if (window.activitiesPageLoaded) {
        console.warn('Activities page already loaded, skipping...');
        return;
    }
    window.activitiesPageLoaded = true;

    let tripId = null;
    let activities = [];
    let currentActivityId = null;
    let currentFilter = 'all';

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('🚀 Activities page initializing...');
        
        // Check authentication
        const token = localStorage.getItem('accessToken');
        if (!token) {
            showToast('Please log in to continue', 'error');
            setTimeout(() => window.location.href = 'login.html', 1500);
            return;
        }

        // Get trip ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        tripId = urlParams.get('id');

        if (!tripId) {
            window.location.href = 'trips.html';
            return;
        }

        console.log('📍 Loading activities for trip:', tripId);

        try {
            await loadActivities();
            setupEventListeners();
            console.log('✅ Activities page loaded successfully');
        } catch (error) {
            console.error('❌ Initialization error:', error);
            showToast('Failed to initialize page: ' + error.message, 'error');
        }
    });

    // Setup event listeners
    function setupEventListeners() {
        // Add activity buttons
        const addActivityBtns = document.querySelectorAll('.btn-add-activity');
        addActivityBtns.forEach(btn => {
            btn.onclick = openAddActivityModal;
        });

        // Modal controls
        const closeModal = document.getElementById('closeModal');
        const cancelBtn = document.getElementById('cancelBtn');
        const activityForm = document.getElementById('activityForm');
        const activityModal = document.getElementById('activityModal');
        
        if (closeModal) closeModal.onclick = closeActivityModal;
        if (cancelBtn) cancelBtn.onclick = closeActivityModal;
        if (activityForm) activityForm.onsubmit = handleSubmitActivity;

        // Close modal on outside click
        if (activityModal) {
            activityModal.onclick = (e) => {
                if (e.target.id === 'activityModal') {
                    closeActivityModal();
                }
            };
        }

        // Filter buttons
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.onclick = () => handleFilterChange(btn.dataset.filter);
        });

        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.oninput = handleSearch;
        }
    }

    // Load activities from backend
    async function loadActivities() {
        try {
            console.log('📥 Fetching activities...');
            const response = await window.apiService.activities.getByTrip(tripId);
            
            console.log('📦 Activities response:', response);
            
            // Handle both response.data and direct array
            activities = response.data || response || [];
            
            console.log(`✅ Loaded ${activities.length} activities`);
            renderActivities();
            
        } catch (error) {
            console.error('⚠️ Error loading activities:', error);
            
            // Don't throw - just show empty state
            activities = [];
            renderActivities();
            
            if (error.statusCode !== 404) {
                showToast('Could not load activities', 'warning');
            }
        }
    }

    // Render activities grid
    function renderActivities() {
        const grid = document.getElementById('activitiesGrid');
        const emptyState = document.querySelector('.empty-state');
        
        if (!grid) {
            console.error('❌ Activities grid element not found');
            return;
        }

        // Filter activities
        let filteredActivities = activities.filter(activity => {
            if (currentFilter === 'all') return true;
            return activity.status === currentFilter;
        });

        console.log(`📊 Rendering ${filteredActivities.length} activities (filter: ${currentFilter})`);

        // Show empty state if no activities
        if (filteredActivities.length === 0) {
            grid.innerHTML = '';
            if (emptyState) emptyState.style.display = 'flex';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        // Render activity cards
        grid.innerHTML = filteredActivities.map(activity => createActivityCard(activity)).join('');

        // Add click handlers to cards
        filteredActivities.forEach(activity => {
            const card = document.querySelector(`[data-activity-id="${activity._id}"]`);
            if (card) {
                card.onclick = () => editActivity(activity);
            }

            // Add delete button handler
            const deleteBtn = card?.querySelector('.btn-delete-activity');
            if (deleteBtn) {
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    deleteActivity(activity._id);
                };
            }

            // Add status toggle handler
            const statusBtn = card?.querySelector('.btn-toggle-status');
            if (statusBtn) {
                statusBtn.onclick = (e) => {
                    e.stopPropagation();
                    toggleActivityStatus(activity);
                };
            }
        });
    }

    // Create activity card HTML
    function createActivityCard(activity) {
        const startDate = new Date(activity.startTime);
        const endDate = activity.endTime ? new Date(activity.endTime) : null;
        
        const typeIcons = {
            flight: 'plane',
            accommodation: 'bed',
            restaurant: 'utensils',
            attraction: 'landmark',
            transport: 'car',
            shopping: 'shopping-bag',
            entertainment: 'ticket',
            other: 'circle'
        };

        const statusColors = {
            planned: '#FFA726',
            in_progress: '#42A5F5',
            completed: '#66BB6A',
            cancelled: '#EF5350'
        };

        const statusLabels = {
            planned: 'Planned',
            in_progress: 'In Progress',
            completed: 'Completed',
            cancelled: 'Cancelled'
        };

        const icon = typeIcons[activity.type] || typeIcons.other;
        const statusColor = statusColors[activity.status] || statusColors.planned;
        const statusLabel = statusLabels[activity.status] || activity.status;

        return `
            <div class="activity-card" data-activity-id="${activity._id}">
                <div class="activity-card-header">
                    <div class="activity-icon" style="background: ${statusColor}20; color: ${statusColor};">
                        <i class="fas fa-${icon}"></i>
                    </div>
                    <div class="activity-actions">
                        <button class="btn-icon btn-toggle-status" title="Toggle Status">
                            <i class="fas fa-check-circle"></i>
                        </button>
                        <button class="btn-icon btn-delete-activity" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                
                <div class="activity-card-body">
                    <h3 class="activity-title">${escapeHtml(activity.title)}</h3>
                    ${activity.description ? `<p class="activity-description">${escapeHtml(activity.description)}</p>` : ''}
                    
                    <div class="activity-meta">
                        <div class="meta-item">
                            <i class="fas fa-calendar"></i>
                            ${formatDate(startDate)}
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-clock"></i>
                            ${formatTime(startDate)}${endDate ? ' - ' + formatTime(endDate) : ''}
                        </div>
                        ${activity.location ? `
                            <div class="meta-item">
                                <i class="fas fa-location-dot"></i>
                                ${escapeHtml(activity.location)}
                            </div>
                        ` : ''}
                        ${activity.cost > 0 ? `
                            <div class="meta-item">
                                <i class="fas fa-dollar-sign"></i>
                                ${activity.currency || 'USD'} ${activity.cost.toFixed(2)}
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="activity-card-footer">
                    <span class="activity-type">${capitalizeFirst(activity.type)}</span>
                    <span class="activity-status" style="background: ${statusColor}20; color: ${statusColor};">
                        ${statusLabel}
                    </span>
                </div>
            </div>
        `;
    }

    // Open add activity modal
    function openAddActivityModal() {
        currentActivityId = null;
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('activityForm');
        
        if (modalTitle) modalTitle.textContent = 'Add Activity';
        if (form) form.reset();
        
        // Set default date to today
        const today = new Date();
        const dateInput = document.getElementById('activityDate');
        if (dateInput) {
            dateInput.value = formatDateInput(today);
        }

        const modal = document.getElementById('activityModal');
        if (modal) modal.classList.add('active');
    }

    // Edit activity
    function editActivity(activity) {
        currentActivityId = activity._id;
        
        const modalTitle = document.getElementById('modalTitle');
        if (modalTitle) modalTitle.textContent = 'Edit Activity';

        // Fill form with activity data
        document.getElementById('activityTitle').value = activity.title;
        document.getElementById('activityDescription').value = activity.description || '';
        document.getElementById('activityType').value = activity.type || 'other';
        
        const startDate = new Date(activity.startTime);
        document.getElementById('activityDate').value = formatDateInput(startDate);
        document.getElementById('activityTime').value = formatTimeInput(startDate);
        
        document.getElementById('activityLocation').value = activity.location || '';
        document.getElementById('activityCost').value = activity.cost || '';
        document.getElementById('activityNotes').value = activity.notes || '';

        if (activity.endTime) {
            const endDate = new Date(activity.endTime);
            const duration = (endDate - startDate) / (1000 * 60 * 60); // hours
            document.getElementById('activityDuration').value = duration.toFixed(1);
        }

        const modal = document.getElementById('activityModal');
        if (modal) modal.classList.add('active');
    }

    // Close activity modal
    function closeActivityModal() {
        const modal = document.getElementById('activityModal');
        if (modal) modal.classList.remove('active');
        currentActivityId = null;
    }

    // Handle submit activity
    async function handleSubmitActivity(e) {
        e.preventDefault();

        const title = document.getElementById('activityTitle').value.trim();
        const description = document.getElementById('activityDescription').value.trim();
        const type = document.getElementById('activityType').value;
        const date = document.getElementById('activityDate').value;
        const time = document.getElementById('activityTime').value;
        const location = document.getElementById('activityLocation').value.trim();
        const cost = parseFloat(document.getElementById('activityCost').value) || 0;
        const notes = document.getElementById('activityNotes').value.trim();
        const duration = parseFloat(document.getElementById('activityDuration').value) || 1;

        if (!title || !type || !date) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        // Combine date and time
        const startTime = new Date(`${date}T${time || '09:00'}`);
        const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);

        const activityData = {
            title,
            description,
            type,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            location,
            cost,
            notes,
            status: 'planned'
        };

        try {
            if (currentActivityId) {
                await window.apiService.activities.update(currentActivityId, activityData);
                showToast('Activity updated successfully', 'success');
            } else {
                await window.apiService.activities.create(tripId, activityData);
                showToast('Activity created successfully', 'success');
            }

            closeActivityModal();
            await loadActivities();
        } catch (error) {
            console.error('❌ Error saving activity:', error);
            showToast(error.message || 'Failed to save activity', 'error');
        }
    }

    // Delete activity
    async function deleteActivity(activityId) {
        if (!confirm('Are you sure you want to delete this activity?')) {
            return;
        }

        try {
            await window.apiService.activities.delete(activityId);
            showToast('Activity deleted successfully', 'success');
            await loadActivities();
        } catch (error) {
            console.error('❌ Error deleting activity:', error);
            showToast(error.message || 'Failed to delete activity', 'error');
        }
    }

    // Toggle activity status
    function toggleActivityStatus(activity) {
        const statusCycle = {
            planned: 'in_progress',
            in_progress: 'completed',
            completed: 'planned'
        };

        const newStatus = statusCycle[activity.status] || 'planned';

        try {
            window.apiService.activities.updateStatus(activity._id, newStatus);
            showToast(`Status updated to ${newStatus}`, 'success');
            loadActivities();
        } catch (error) {
            console.error(' Error updating status:', error);
            showToast(error.message || 'Failed to update status', 'error');
        }
    }

    // Handle filter change
    function handleFilterChange(filter) {
        currentFilter = filter;

        // Update active button
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });

        renderActivities();
    }

    // Handle search
    function handleSearch(e) {
        const searchTerm = e.target.value.toLowerCase().trim();

        if (!searchTerm) {
            renderActivities();
            return;
        }

        const filteredActivities = activities.filter(activity => {
            return (
                activity.title.toLowerCase().includes(searchTerm) ||
                (activity.description && activity.description.toLowerCase().includes(searchTerm)) ||
                (activity.location && activity.location.toLowerCase().includes(searchTerm)) ||
                activity.type.toLowerCase().includes(searchTerm)
            );
        });

        const grid = document.getElementById('activitiesGrid');
        const emptyState = document.querySelector('.empty-state');

        if (filteredActivities.length === 0) {
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666;">No activities found</p>';
            if (emptyState) emptyState.style.display = 'none';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        grid.innerHTML = filteredActivities.map(activity => createActivityCard(activity)).join('');

        // Re-attach event listeners
        filteredActivities.forEach(activity => {
            const card = document.querySelector(`[data-activity-id="${activity._id}"]`);
            if (card) {
                card.onclick = () => editActivity(activity);
                const deleteBtn = card.querySelector('.btn-delete-activity');
                if (deleteBtn) {
                    deleteBtn.onclick = (e) => {
                        e.stopPropagation();
                        deleteActivity(activity._id);
                    };
                }
                const statusBtn = card.querySelector('.btn-toggle-status');
                if (statusBtn) {
                    statusBtn.onclick = (e) => {
                        e.stopPropagation();
                        toggleActivityStatus(activity);
                    };
                }
            }
        });
    }

    // Utility functions
    function formatDate(date) {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    function formatTime(date) {
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }

    function formatDateInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function formatTimeInput(date) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function showToast(message, type = 'info') {
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
            alert(message);
        }
    }

    console.log('✅ Activities module loaded');
})();