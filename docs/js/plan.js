let currentMap = null;
let currentMarker = null;

function getCurrentUser() {
    const token = sessionStorage.getItem('accessToken');
    
    if (!token) {
        return null;
    }
    try {
        // Decode JWT token to get user info
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.id || payload._id || payload.userId;
        if (userId) {
            return {
                ...payload,
                userId: userId 
            };
        } else {
            console.error('Invalid auth token');
            return null;
        }
    } catch (error) {
        console.error('Error decoding token:', error);
        return null;
    }
}

function checkAuthentication() {
    const user = getCurrentUser();
    if (!user || !user.userId) {
        console.warn('User not authenticated.');
        showToast('Please log in to create a trip', 'warning');
        setTimeout(() => {
            window.location.href = './login.html?redirect=planning.html';
        }, 1500);
        return false;
    }
    return true;
}

// Form Validation
function validateTripData(formData) {
    const errors = [];
    // Title validation
    if (!formData.title || formData.title.trim().length < 3) {
        errors.push('Title must be at least 3 characters long');
    }
    if (formData.title && formData.title.length > 100) {
        errors.push('Title must be less than 100 characters');
    }
    // Destination validation
    if (!formData.destination || formData.destination.trim().length < 2) {
        errors.push('Destination must be at least 2 characters long');
    }
    // Date validation
    if (!formData.startDate) {
        errors.push('Start date is required');
    }
    if (!formData.endDate) {
        errors.push('End date is required');
    }
    if (formData.startDate && formData.endDate) {
        const start = new Date(formData.startDate);
        const end = new Date(formData.endDate);   
        if (end < start) {
            errors.push('End date must be after start date');
        }
        // Check if dates are too far in the past
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (start < today) {
            errors.push('Start date cannot be in the past');
        }
    }
    
    // Budget validation
    if (formData.budget) {
        const budget = parseFloat(formData.budget);
        if (isNaN(budget)) {
            errors.push('Budget must be a valid number');
        } else if (budget < 0) {
            errors.push('Budget cannot be negative');
        }
    }
    
    // Travelers validation
    if (formData.travelers) {
        const travelers = parseInt(formData.travelers);
        if (isNaN(travelers)) {
            errors.push('Number of travelers must be a valid number');
        } else if (travelers < 1) {
            errors.push('Number of travelers must be at least 1');
        } else if (travelers > 50) {
            errors.push('Number of travelers cannot exceed 50');
        }
    }
    
    return errors;
}

//Form Submission
async function handleTripCreation(e) {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user || !user.userId) {
        console.error('Authentication failed - no user or userId');
        showToast('Please log in to create a trip', 'error');
        setTimeout(() => {
            window.location.href = './login.html?redirect=planning.html';
        }, 1500);
        return;
    }
    const submitBtn = document.getElementById('createTripBtn');
    const originalHTML = submitBtn.innerHTML;
    try {
        const formData = {
            title: document.getElementById('title').value.trim(),
            destination: document.getElementById('destination').value.trim(),
            startDate: document.getElementById('startDate').value,
            endDate: document.getElementById('endDate').value,
            budget: document.getElementById('budget').value ? parseFloat(document.getElementById('budget').value) : undefined,
            description: document.getElementById('description').value.trim(),
            travelers: parseInt(document.getElementById('travelers').value) || 1,
            tags: document.getElementById('tags').value.split(',').map(t => t.trim()).filter(t => t),
            isPublic: document.getElementById('isPublic').checked,
            status: 'planning',
            userId: user.userId,
        };
        
        const validationErrors = validateTripData(formData);
        if (validationErrors.length > 0) {
            showToast(validationErrors.join('\n'), 'error');
            return;
        }
        
        // Disable button and show loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Trip...';
        
        // Create trip
        const response = await apiService.trips.create(formData);
        if (response.success) {
            showToast('Trip created successfully!', 'success');
            setTimeout(() => {
                window.location.href = 'trips.html';
            }, 1000);
        } else {
            throw new Error(response.message || 'Failed to create trip');
        }
        
    } catch (error) {
        console.error('Trip creation error:', error);
        // Reset button
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHTML;
        // Show error message
        let errorMessage = 'Failed to create trip';
        if (error.backendErrors && Array.isArray(error.backendErrors)) {
            errorMessage = error.backendErrors
                .map(e => `• ${e.field || 'Field'}: ${e.message || e.msg}`)
                .join('\n');
        } else if (error.message) {
            errorMessage = error.message;
            if (errorMessage.includes('Validation Error') || errorMessage.includes('validation')) {
                errorMessage += '\n\nPlease check:\n• All required fields are filled\n• Dates are valid\n• Budget is reasonable';
            }
        }
        showToast(errorMessage, 'error');
    }
}

// Map Functions
function initializePlanningMap() {
    if (!window.tripMap) {
        return;
    }
    currentMap = window.tripMap;
    
    // Update map when destination changes
    const destinationInput = document.getElementById('destination');
    if (destinationInput) {
        destinationInput.addEventListener('blur', async function() {
            const destination = this.value.trim();
            if (destination) {
                await updateMapLocation(destination);
            }
        });
    }
}

async function updateMapLocation(destination) {
    if (!currentMap) {
        console.log('Map not available for location update');
        return;
    }
    try {
        const apiKey = window.CONFIG?.GEOAPIFY_API_KEY || '133144445c81412f85c94c986b2c1831';
        const response = await fetch(
            `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(destination)}&limit=1&apiKey=${apiKey}`
        );
        if (!response.ok) {
            throw new Error(`Geocoding failed: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.features && data.features.length > 0) {
            const location = data.features[0];
            const lat = location.properties.lat;
            const lon = location.properties.lon;   
            // Update map view
            currentMap.setView([lat, lon], 10);
            // Remove old marker if exists
            if (currentMarker) {
                currentMap.removeLayer(currentMarker);
            }
            
            // Add new marker
            currentMarker = L.marker([lat, lon]).addTo(currentMap);
            const placeName = location.properties.formatted || destination;
            currentMarker.bindPopup(`<b>${placeName}</b>`).openPopup();
        } else {
            console.log('No location found for:', destination);
        }
    }
}

// Budget Formatting
function formatBudget(value) {
    if (!value) return '-';
    const num = parseInt(value);
    return `₹${num.toLocaleString('en-IN')}`;
}

document.addEventListener('DOMContentLoaded', () => {
    const user = getCurrentUser();
    if (!user || !user.userId) {
        console.warn('User not authenticated - will redirect on form submission');
    }

    const form = document.getElementById('createTripForm');
    if (form) {
        form.addEventListener('submit', handleTripCreation);
    }

    const today = new Date().toISOString().split('T')[0];
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');

    if (startDateInput) {
        startDateInput.setAttribute('min', today);
        startDateInput.addEventListener('change', function () {
            if (endDateInput) {
                endDateInput.setAttribute('min', this.value);
                if (endDateInput.value && endDateInput.value < this.value) {
                    endDateInput.value = '';
                }
            }
        });
    }

    if (endDateInput) {
        endDateInput.setAttribute('min', today);
    }

    const budgetInput = document.getElementById('budget');
    if (budgetInput) {
        budgetInput.addEventListener('input', function () {
            let value = this.value.replace(/[^0-9.]/g, '');
            const parts = value.split('.');
            if (parts.length > 2) {
                value = parts[0] + '.' + parts.slice(1).join('');
            }
            this.value = value;
        });
    }

    if (window.tripMap) {
        currentMap = window.tripMap;
        initializePlanningMap();
    }
});


    
window.initializePlanningMap = initializePlanningMap;



