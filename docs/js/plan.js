// ============================================
// TRIP PLANNING PAGE - ENHANCED VERSION
// ============================================

let currentMap = null;
let currentMarker = null;

// ===================== Form Validation =====================
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

// ===================== Form Submission =====================
async function handleTripCreation(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('createTripBtn');
    const originalHTML = submitBtn.innerHTML;
    
    try {
        // Collect form data
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
            status: 'planning'
        };
        
        console.log('Creating trip:', formData);
        
        // Client-side validation
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
            
            // Redirect to trip details page
            setTimeout(() => {
                const tripId = response.data?.trip?.id || response.data?.id;
                if (tripId) {
                    window.location.href = `trip-details.html?id=${tripId}`;
                } else {
                    window.location.href = 'trips.html';
                }
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
            
            // Add helpful hints for common errors
            if (errorMessage.includes('Validation Error') || errorMessage.includes('validation')) {
                errorMessage += '\n\nPlease check:\n• All required fields are filled\n• Dates are valid\n• Budget is reasonable';
            }
        }
        
        showToast(errorMessage, 'error');
    }
}

// ===================== Map Functions =====================
function initializePlanningMap() {
    if (!currentMap) {
        console.error('Map not initialized yet');
        return;
    }
    
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
    try {
        // Use Nominatim API for geocoding
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination)}&limit=1`
        );
        const data = await response.json();
        
        if (data && data.length > 0) {
            const location = data[0];
            const lat = parseFloat(location.lat);
            const lon = parseFloat(location.lon);
            
            // Update map view
            currentMap.setView([lat, lon], 10);
            
            // Remove old marker if exists
            if (currentMarker) {
                currentMap.removeLayer(currentMarker);
            }
            
            // Add new marker
            currentMarker = L.marker([lat, lon]).addTo(currentMap);
            currentMarker.bindPopup(`<b>${destination}</b>`).openPopup();
            
            console.log(`Map updated to: ${destination}`);
        }
    } catch (error) {
        console.error('Error updating map location:', error);
    }
}

// ===================== Budget Formatting =====================
function formatBudget(value) {
    if (!value) return '-';
    const num = parseInt(value);
    return `₹${num.toLocaleString('en-IN')}`;
}

// ===================== Initialize on Page Load =====================
document.addEventListener('DOMContentLoaded', () => {
    // Attach form submission handler
    const form = document.getElementById('createTripForm');
    if (form) {
        form.addEventListener('submit', handleTripCreation);
        console.log('✅ Form submission handler attached');
    }
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    if (startDateInput) {
        startDateInput.setAttribute('min', today);
        
        // Update end date minimum when start date changes
        startDateInput.addEventListener('change', function() {
            if (endDateInput) {
                endDateInput.setAttribute('min', this.value);
                
                // If end date is before new start date, clear it
                if (endDateInput.value && endDateInput.value < this.value) {
                    endDateInput.value = '';
                }
            }
        });
    }
    
    if (endDateInput) {
        endDateInput.setAttribute('min', today);
    }
    
    // Add budget input validation (only non-negative)
    const budgetInput = document.getElementById('budget');
    if (budgetInput) {
        budgetInput.addEventListener('input', function() {
            // Remove non-numeric characters except decimal point
            let value = this.value.replace(/[^0-9.]/g, '');
            
            // Ensure only one decimal point
            const parts = value.split('.');
            if (parts.length > 2) {
                value = parts[0] + '.' + parts.slice(1).join('');
            }
            
            this.value = value;
        });
    }
    
    // Initialize map reference
    setTimeout(() => {
        if (window.tripMap) {
            currentMap = window.tripMap;
            initializePlanningMap();
        }
    }, 500);
});

// Make functions globally available for inline handlers
window.initializePlanningMap = initializePlanningMap;

console.log('✅ plan.js loaded (enhanced with validation)');
