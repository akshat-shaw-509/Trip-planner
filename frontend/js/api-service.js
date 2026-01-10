let API_BASE_URL = 'http://localhost:5000/api'

// Auth token helper
let getAuthToken = () => localStorage.getItem('accessToken')

// Request headers
let getHeaders = (includeAuth = true) => {
  const headers = { 'Content-Type': 'application/json' }
  if (includeAuth) {
    const token = getAuthToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }
  return headers
}

// Generic request
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
    if (!response.ok) throw new Error(data.message || 'Request failed')
    return data
  } catch (error) {
    console.error('API Error:', error)
    throw error
  }
}

// GET helper
let get = (endpoint) => request(endpoint)

// POST helper
let post = (endpoint, data) => request(endpoint, {
  method: 'POST',
  body: JSON.stringify(data)
})

// PUT helper
let put = (endpoint, data) => request(endpoint, {
  method: 'PUT',
  body: JSON.stringify(data)
})

// DELETE helper
let del = (endpoint) => request(endpoint, { method: 'DELETE' })

// PATCH helper
let patch = (endpoint, data) => request(endpoint, {
  method: 'PATCH',
  body: JSON.stringify(data)
})

// Auth endpoints (public endpoints use auth: false)
let auth = {
  register: (data) => post('/auth/register', data, { auth: false }),
  login: (data) => post('/auth/login', data, { auth: false }),
  logout: () => post('/auth/logout'),
  me: () => get('/auth/me'),
  refresh: (token) => post('/auth/refresh', { refreshToken: token }, { auth: false }),
  changePassword: (data) => post('/auth/change-password', data)
}

// Trip endpoints
let trips = {
  all: (filters = {}) => {
    const query = new URLSearchParams(filters).toString()
    return get(`/trips${query ? `?${query}` : ''}`)
  },
  get: (id) => get(`/trips/${id}`),
  create: (data) => post('/trips', data),
  update: (id, data) => put(`/trips/${id}`, data),
  delete: (id) => del(`/trips/${id}`),
  upcoming: () => get('/trips/upcoming'),
  ongoing: () => get('/trips/ongoing'),
  past: (limit = 10) => get(`/trips/past?limit=${limit}`),
  status: (id, status) => patch(`/trips/${id}/status`, { status })
}

// Place endpoints
let places = {
  byTrip: (tripId, filters = {}) => {
    const query = new URLSearchParams(filters).toString()
    return get(`/trips/${tripId}/places${query ? `?${query}` : ''}`)
  },
  get: (id) => get(`/places/${id}`),
  create: (tripId, data) => post(`/trips/${tripId}/places`, data),
  update: (id, data) => put(`/places/${id}`, data),
  delete: (id) => del(`/places/${id}`),
  favorite: (id) => patch(`/places/${id}/favorite`),
  visitStatus: (id, status) => patch(`/places/${id}/visit-status`, { status }),
  nearby: (tripId, lng, lat, distance = 5000) => 
    get(`/trips/${tripId}/places/nearby?longitude=${lng}&latitude=${lat}&maxDistance=${distance}`),
  byCategory: (tripId) => get(`/trips/${tripId}/places/by-category`)
}

// Activity endpoints
let activities = {
  byTrip: (tripId) => get(`/trips/${tripId}/activities`),
  get: (id) => get(`/activities/${id}`),
  create: (tripId, data) => post(`/trips/${tripId}/activities`, data),
  update: (id, data) => put(`/activities/${id}`, data),
  delete: (id) => del(`/activities/${id}`),
  byDate: (tripId, date) => get(`/trips/${tripId}/activities/by-date?date=${date}`),
  status: (id, status) => patch(`/activities/${id}/status`, { status })
}

// Expense endpoints
let expenses = {
  byTrip: (tripId, filters = {}) => {
    const query = new URLSearchParams(filters).toString()
    return get(`/trips/${tripId}/expenses${query ? `?${query}` : ''}`)
  },
  get: (id) => get(`/expenses/${id}`),
  create: (tripId, data) => post(`/trips/${tripId}/expenses`, data),
  update: (id, data) => put(`/expenses/${id}`, data),
  delete: (id) => del(`/expenses/${id}`),
  summary: (tripId) => get(`/trips/${tripId}/expenses/summary`),
  byCategory: (tripId) => get(`/trips/${tripId}/expenses/by-category`),
  receipt: (id, url) => patch(`/expenses/${id}/receipt`, { receiptUrl: url })
}

// Upload endpoints (multipart/form-data)
let upload = {
  image: (file, folder = 'images') => {
    const formData = new FormData()
    formData.append('file', file)
    return request(`/upload/image?folder=${folder}`, {
      method: 'POST',
      headers: {},  // Let FormData set Content-Type
      body: formData
    })
  },
  receipt: (tripId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return request(`/upload/receipt/${tripId}`, {
      method: 'POST',
      headers: {},
      body: formData
    })
  }
}

// Export
let apiService = {
  get, post, put, del, patch,
  auth, trips, places, activities, expenses, upload
}
if (typeof module !== 'undefined') {
  module.exports = apiService
}
