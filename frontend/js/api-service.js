// api-service.js - Browser Compatible (No Node.js require)

// Backend URL - IMPORTANT: Make sure this matches your backend port
const API_BASE_URL = 'http://localhost:5000/api'

// Get auth token from localStorage
const getAuthToken = () => localStorage.getItem('accessToken')

// Build request headers
const getHeaders = (includeAuth = true, isFormData=false) => {
  const headers = {}
  if(!isFormData){
     headers['Content-Type'] = 'application/json'
  }
  if (includeAuth) {
    const token = getAuthToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  }
  return headers
}

// Generic request handler with automatic token refresh
const request = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`
  const config = {
    ...options,
    headers: {
      ...getHeaders(options.auth !== false),
      ...options.headers,
    },
  }

  try {
    const response = await fetch(url, config)
    const data = await response.json()
    
    // Handle 401 - token expired, try to refresh
    if (response.status === 401 && window.authHandler) {
      console.log('Token expired, attempting refresh...')
      const refreshed = await window.authHandler.refreshToken()
      if (refreshed) {
        // Retry request with new token
        config.headers.Authorization = `Bearer ${getAuthToken()}`
        const retryResponse = await fetch(url, config)
        return await retryResponse.json()
      }
    }
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`)
    }
    
    return data
  } catch (error) {
    console.error('API Error:', error)
    
    // Make error messages more user-friendly
    if (error.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Make sure backend is running on port 5000')
    }
    
    throw error
  }
}

// HTTP method helpers
const get = (endpoint) => request(endpoint)
const post = (endpoint, data) => request(endpoint, { method: 'POST', body: JSON.stringify(data) })
const put = (endpoint, data) => request(endpoint, { method: 'PUT', body: JSON.stringify(data) })
const del = (endpoint) => request(endpoint, { method: 'DELETE' })
const patch = (endpoint, data) => request(endpoint, { method: 'PATCH', body: JSON.stringify(data) })

// Auth endpoints
const auth = {
  register: (data) => request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
    auth: false
  }),
  
  login: (data) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
    auth: false
  }),
  
  logout: () => post('/auth/logout', {}),
  
  me: () => get('/auth/me'),
  
  refreshToken: (token) => request('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: token }),
    auth: false
  }),
  
  changePassword: (data) => post('/auth/change-password', data),
  
  forgotPassword: (email) => post('/auth/forgot-password', { email }),
  
  resetPassword: (token, password) => post(`/auth/reset-password/${token}`, { password })
}

// Trip endpoints
const trips = {
  getAll: (filters = {}) => {
    const query = new URLSearchParams(filters).toString()
    return get(`/trips${query ? `?${query}` : ''}`)
  },
  
  getById: (id) => get(`/trips/${id}`),
  
  create: (data) => post('/trips', data),
  
  update: (id, data) => put(`/trips/${id}`, data),
  
  delete: (id) => del(`/trips/${id}`),
  
  upcoming: () => get('/trips/upcoming'),
  
  ongoing: () => get('/trips/ongoing'),
  
  past: (limit = 10) => get(`/trips/past?limit=${limit}`),
  
  updateStatus: (id, status) => patch(`/trips/${id}/status`, { status }),
  
  addCollaborator: (id, data) => post(`/trips/${id}/collaborators`, data),
  
  removeCollaborator: (id, collaboratorId) => del(`/trips/${id}/collaborators/${collaboratorId}`)
}

// Place endpoints
const places = {
  getByTrip: (tripId, filters = {}) => {
    const query = new URLSearchParams(filters).toString()
    return get(`/trips/${tripId}/places${query ? `?${query}` : ''}`)
  },
  
  getById: (id) => get(`/places/${id}`),
  
  create: (tripId, data) => post(`/trips/${tripId}/places`, data),
  
  update: (id, data) => put(`/places/${id}`, data),
  
  delete: (id) => del(`/places/${id}`),
  
  toggleFavorite: (id) => patch(`/places/${id}/favorite`, {}),
  
  updateVisitStatus: (id, status) => patch(`/places/${id}/visit-status`, { visitStatus: status }),
  
  searchNearby: (tripId, lng, lat, distance = 5000) => 
    get(`/trips/${tripId}/places/nearby?longitude=${lng}&latitude=${lat}&maxDistance=${distance}`),
  
  getByCategory: (tripId) => get(`/trips/${tripId}/places/by-category`)
}

// Activity endpoints - FIXED routes
const activities = {
  getByTrip: (tripId) => get(`/activities/trips/${tripId}/activities`),
  
  getById: (id) => get(`/activities/${id}`),
  
  create: (tripId, data) => post(`/activities/trips/${tripId}/activities`, data),
  
  update: (id, data) => put(`/activities/${id}`, data),
  
  delete: (id) => del(`/activities/${id}`),
  
  getByDate: (tripId, date) => get(`/activities/trips/${tripId}/activities/by-date?date=${date}`),
  
  updateStatus: (id, status) => patch(`/activities/${id}/status`, { status })
}

// Expense endpoints - FIXED routes
const expenses = {
  getByTrip: (tripId, filters = {}) => {
    const query = new URLSearchParams(filters).toString()
    return get(`/expenses/trips/${tripId}/expenses${query ? `?${query}` : ''}`)
  },
  
  getById: (id) => get(`/expenses/${id}`),
  
  create: (tripId, data) => post(`/expenses/trips/${tripId}/expenses`, data),
  
  update: (id, data) => put(`/expenses/${id}`, data),
  
  delete: (id) => del(`/expenses/${id}`),
  
  getSummary: (tripId) => get(`/expenses/trips/${tripId}/expenses/summary`),
  
  getByCategory: (tripId) => get(`/expenses/trips/${tripId}/expenses/by-category`),
  
  attachReceipt: (id, receiptUrl) => patch(`/expenses/${id}/receipt`, { receiptUrl })
}

// Upload endpoints
const upload = {
  image: async (file, folder = 'images') => {
    const formData = new FormData()
    formData.append('file', file)
    return request(`/uploads/image?folder=${folder}`, {
      method: 'POST',
      headers:getHeaders(true, true),
      body: formData
    })
  },
  
  document: async (file, folder = 'documents') => {
    const formData = new FormData()
    formData.append('file', file)
    return request(`/uploads/document?folder=${folder}`, {
      method: 'POST',
      headers:getHeaders(true, true),
      body: formData
    })
  },
  
  receipt: async (tripId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return request(`/uploads/receipt/${tripId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getAuthToken()}` },
      body: formData
    })
  },
  
  multiple: async (files, folder = 'uploads') => {
    const formData = new FormData()
    files.forEach(file => formData.append('files', file))
    return request(`/uploads/multiple?folder=${folder}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getAuthToken()}` },
      body: formData
    })
  },
  
  deleteFile: (filePath) => request('/uploads/file', {
    method: 'DELETE',
    body: JSON.stringify({ filePath })
  })
}

// Export as global object for browser
const apiService = {
  get,
  post,
  put,
  del,
  patch,
  auth,
  trips,
  places,
  activities,
  expenses,
  upload
}

// Make available globally
window.apiService = apiService

console.log('✅ API Service loaded')