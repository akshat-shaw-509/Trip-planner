// frontend/js/config.js
const API_BASE_URL = window.location.hostname.includes('github.io')
  ? 'https://trip-planner-vwar.onrender.com/api'
  : 'http://localhost:5000/api'
const APP_NAME = 'Planora'

window.config = {
    API_BASE_URL,
    APP_NAME
}
