// frontend/js/config.js
// Detect environment and set API URL accordingly
const API_BASE_URL = window.location.hostname.includes('github.io')
  ? 'https://trip-planner-5uys.onrender.com/api'
  : 'http://localhost:5000/api'

const APP_NAME = 'Planora'

// Make config globally available
window.config = {
    API_BASE_URL,
    APP_NAME
}

// Log for debugging
console.log('Config loaded:', window.config)
