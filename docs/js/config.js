const API_BASE_URL = window.location.hostname.includes('github.io')
  ? 'https://trip-planner-5uys.onrender.com/api'
  : 'http://localhost:5000/api';
const APP_NAME = 'Planora';
const GEOAPIFY_API_KEY = 'GEOAPIFY_API_KEY';
window.CONFIG = {
  API_BASE_URL,
  APP_NAME,
  GEOAPIFY_API_KEY
};
