// frontend/js/config.js
const API_BASE_URL = window.location.hostname.includes('github.io')
  ? 'https://trip-planner-5uys.onrender.com/api'
  : 'http://localhost:5000/api'

const APP_NAME = 'Planora'

// ✅ ADD THIS
const GEOAPIFY_API_KEY = 133144445c81412f85c94c986b2c1831

// ✅ USE CAPITAL CONFIG (important)
window.CONFIG = {
  API_BASE_URL,
  APP_NAME,
  GEOAPIFY_API_KEY
}

console.log('Config loaded:', window.CONFIG)
