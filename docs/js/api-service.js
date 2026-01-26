// ===================== API Service =====================
const apiService = {
  baseURL: window.location.hostname.includes('github.io')
  ? 'https://trip-planner-backend.onrender.com/api'
  : 'http://localhost:5000/api',

  // ===================== Auth =====================
  auth: {
    login: (data) => apiService.post('/auth/login', data),
    register: (data) => apiService.post('/auth/register', data),
    logout: () => apiService.post('/auth/logout'),
    refreshToken: (refreshToken) =>
      apiService.post('/auth/refresh', { refreshToken }),
    google: (idToken) =>
      apiService.post('/auth/google', { idToken })
  },

  // ===================== Core Request =====================
  async request(endpoint, options = {}) {
    const token = sessionStorage.getItem('accessToken')

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const config = {
      ...options,
      headers
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config)
      const data = await response.json()

      if (!response.ok) {
        const error = new Error(data.message || 'Request failed')
        error.response = { status: response.status, data }
        error.validationErrors = data.errors
        throw error
      }

      return data
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error)
      throw error
    }
  },

  // ===================== HTTP Helpers =====================
  get(endpoint) {
    return this.request(endpoint, { method: 'GET' })
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    })
  },

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    })
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' })
  },

  // ===================== Trips =====================
  trips: {
    getAll: () => apiService.get('/trips'),
    getById: (id) => apiService.get(`/trips/${id}`),
    create: (data) => apiService.post('/trips', data),
    update: (id, data) => apiService.put(`/trips/${id}`, data),
    delete: (id) => apiService.delete(`/trips/${id}`)
  },

  // ===================== Places =====================
  places: {
    getByTrip: (tripId, filters = {}) => {
      const params = new URLSearchParams(filters).toString()
      const query = params ? `?${params}` : ''
      return apiService.get(`/trips/${tripId}/places${query}`)
    },
    getById: (placeId) => apiService.get(`/places/${placeId}`),
    create: (tripId, data) =>
      apiService.post(`/trips/${tripId}/places`, data),
    update: (placeId, data) =>
      apiService.put(`/places/${placeId}`, data),
    delete: (placeId) =>
      apiService.delete(`/places/${placeId}`),
    toggleFavorite: (placeId) =>
      apiService.request(`/places/${placeId}/favorite`, {
        method: 'PATCH'
      })
  },

  // ===================== Activities =====================
  activities: {
    getByTrip: (tripId) =>
      apiService.get(`/activities/trips/${tripId}/activities`),
    getById: (id) =>
      apiService.get(`/activities/${id}`),
    create: (tripId, data) =>
      apiService.post(`/activities/trips/${tripId}/activities`, data),
    update: (id, data) =>
      apiService.put(`/activities/${id}`, data),
    delete: (id) =>
      apiService.delete(`/activities/${id}`)
  },

  // ===================== Recommendations =====================
  recommendations: {
    getForTrip: (tripId, options = {}) => {
      const params = new URLSearchParams()

      if (options.limit) params.append('limit', options.limit)
      if (options.radius) params.append('radius', options.radius)
      if (options.category) params.append('category', options.category)
      if (options.useAI) params.append('useAI', 'true')

      const query = params.toString()
      const endpoint =
        `/trips/${tripId}/recommendations${query ? `?${query}` : ''}`

      return apiService.get(endpoint)
    },

    getDayPlans: (tripId) =>
      apiService.get(`/trips/${tripId}/day-plans`)
  },

  // ===================== Expenses =====================
  expenses: {
    getByTrip: (tripId) =>
      apiService.get(`/expenses/trips/${tripId}/expenses`),
    create: (tripId, data) =>
      apiService.post(`/expenses/trips/${tripId}/expenses`, data),
    getById: (id) =>
      apiService.get(`/expenses/${id}`),
    update: (id, data) =>
      apiService.put(`/expenses/${id}`, data),
    delete: (id) =>
      apiService.delete(`/expenses/${id}`)
  },

  // ===================== Preferences =====================
  preferences: {
    get: () =>
      apiService.get('/preferences'),
    trackSearch: (data) =>
      apiService.post('/preferences/track-search', data),
    updateRatingThreshold: (threshold) =>
      apiService.put('/preferences/rating-threshold', { threshold }),
    reset: () =>
      apiService.delete('/preferences')
  }
}