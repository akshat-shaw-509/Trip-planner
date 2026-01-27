// ============================================================
// ENHANCED API SERVICE WITH TOKEN REFRESH - FIXED EXPENSE ROUTES
// ============================================================

const apiService = {
  baseURL: window.CONFIG?.API_BASE_URL || 'http://localhost:5000/api',
  isRefreshing: false,
  refreshSubscribers: [],

  // Subscribe to token refresh completion
  subscribeTokenRefresh(callback) {
    this.refreshSubscribers.push(callback);
  },

  // Notify all subscribers when token is refreshed
  onRefreshed(token) {
    this.refreshSubscribers.forEach(callback => callback(token));
    this.refreshSubscribers = [];
  },

  // Refresh the access token using refresh token
  async refreshToken() {
    try {
      const refreshToken = sessionStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        console.error('No refresh token available');
        this.redirectToLogin();
        return null;
      }

      console.log('🔄 Refreshing access token...');

      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      
      if (data.accessToken) {
        sessionStorage.setItem('accessToken', data.accessToken);
        console.log('✅ Access token refreshed successfully');
        return data.accessToken;
      }

      throw new Error('No access token in response');
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      this.redirectToLogin();
      return null;
    }
  },

  // Redirect to login page
  redirectToLogin() {
    sessionStorage.clear();
    showToast('Session expired. Please login again.', 'error');
    setTimeout(() => {
      window.location.href = './login.html';
    }, 1500);
  },

  // Main request function with automatic token refresh
  async request(endpoint, options = {}) {
    const token = sessionStorage.getItem('accessToken');
    
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);

      // Handle 401 Unauthorized - Token expired
      if (response.status === 401) {
        const errorData = await response.json().catch(() => ({}));
        
        // Check if it's a token expiration
        if (errorData.message?.includes('expired') || errorData.message?.includes('Token expired')) {
          console.log('⚠️ Token expired, attempting refresh...');

          // Prevent multiple simultaneous refresh attempts
          if (!this.isRefreshing) {
            this.isRefreshing = true;
            const newToken = await this.refreshToken();
            this.isRefreshing = false;

            if (newToken) {
              // Notify all waiting requests
              this.onRefreshed(newToken);
              
              // Retry the original request with new token
              config.headers['Authorization'] = `Bearer ${newToken}`;
              const retryResponse = await fetch(`${this.baseURL}${endpoint}`, config);
              
              if (!retryResponse.ok) {
                throw new Error(`Request failed: ${retryResponse.status}`);
              }
              
              return await retryResponse.json();
            }
          } else {
            // Wait for the ongoing refresh to complete
            return new Promise((resolve, reject) => {
              this.subscribeTokenRefresh(async (newToken) => {
                try {
                  config.headers['Authorization'] = `Bearer ${newToken}`;
                  const retryResponse = await fetch(`${this.baseURL}${endpoint}`, config);
                  
                  if (!retryResponse.ok) {
                    throw new Error(`Request failed: ${retryResponse.status}`);
                  }
                  
                  resolve(await retryResponse.json());
                } catch (error) {
                  reject(error);
                }
              });
            });
          }
        } else {
          // Not a token expiration, just unauthorized
          throw new Error('Unauthorized');
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  },

  // Auth endpoints
  auth: {
    async register(data) {
      return await apiService.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    async login(data) {
      const response = await apiService.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      
      if (response.accessToken) {
        sessionStorage.setItem('accessToken', response.accessToken);
        if (response.refreshToken) {
          sessionStorage.setItem('refreshToken', response.refreshToken);
        }
      }
      
      return response;
    },

    async logout() {
      try {
        await apiService.request('/auth/logout', { method: 'POST' });
      } catch (error) {
        console.error('Logout error:', error);
      } finally {
        sessionStorage.clear();
      }
    }
  },

  // Trip endpoints
  trips: {
    async getAll(filters = {}) {
      const params = new URLSearchParams(filters);
      return await apiService.request(`/trips?${params}`);
    },

    async getById(id) {
      return await apiService.request(`/trips/${id}`);
    },

    async create(data) {
      return await apiService.request('/trips', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    async update(id, data) {
      return await apiService.request(`/trips/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },

    async delete(id) {
      return await apiService.request(`/trips/${id}`, {
        method: 'DELETE'
      });
    }
  },

  // Place endpoints
  places: {
    async getByTrip(tripId, filters = {}) {
      const params = new URLSearchParams(filters);
      return await apiService.request(`/trips/${tripId}/places?${params}`);
    },

    async create(tripId, data) {
      return await apiService.request(`/trips/${tripId}/places`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    async update(placeId, data) {
      return await apiService.request(`/places/${placeId}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },

    async delete(placeId) {
      return await apiService.request(`/places/${placeId}`, {
        method: 'DELETE'
      });
    },

    async toggleFavorite(placeId) {
      return await apiService.request(`/places/${placeId}/favorite`, {
        method: 'POST'
      });
    }
  },

  // Expense endpoints - FIXED TO MATCH BACKEND ROUTES
  expenses: {
    async getByTrip(tripId) {
      return await apiService.request(`/expenses/trips/${tripId}/expenses`);
    },

    async create(tripId, data) {
      return await apiService.request(`/expenses/trips/${tripId}/expenses`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    async update(expenseId, data) {
      return await apiService.request(`/expenses/${expenseId}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },

    async delete(expenseId) {
      return await apiService.request(`/expenses/${expenseId}`, {
        method: 'DELETE'
      });
    },

    // Additional helper methods matching backend capabilities
    async getSummary(tripId) {
      return await apiService.request(`/expenses/trips/${tripId}/expenses/summary`);
    },

    async getByCategory(tripId) {
      return await apiService.request(`/expenses/trips/${tripId}/expenses/by-category`);
    }
  },

  // Activity endpoints
  activities: {
    async getByTrip(tripId) {
      return await apiService.request(`/activities/trip/${tripId}`);
    },

    async create(tripId, data) {
      return await apiService.request(`/activities/trip/${tripId}`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    async update(activityId, data) {
      return await apiService.request(`/activities/${activityId}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },

    async delete(activityId) {
      return await apiService.request(`/activities/${activityId}`, {
        method: 'DELETE'
      });
    }
  },

  // Schedule endpoints
  schedules: {
    async getByTrip(tripId) {
      return await apiService.request(`/trips/${tripId}/schedules`);
    },

    async create(tripId, data) {
      return await apiService.request(`/trips/${tripId}/schedules`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    async update(scheduleId, data) {
      return await apiService.request(`/schedules/${scheduleId}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },

    async delete(scheduleId) {
      return await apiService.request(`/schedules/${scheduleId}`, {
        method: 'DELETE'
      });
    }
  },

  // Recommendation endpoints
  recommendations: {
    async getForTrip(tripId, options = {}) {
      const params = new URLSearchParams(options);
      return await apiService.request(`/trips/${tripId}/recommendations?${params}`);
    }
  },

  // Preference endpoints
  preferences: {
    async get() {
      return await apiService.request('/preferences');
    },

    async update(data) {
      return await apiService.request('/preferences', {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },

    async trackSearch(data) {
      return await apiService.request('/preferences/track-search', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    }
  }
};

// Make it globally available
window.apiService = apiService;

console.log('✅ Enhanced API Service loaded with auto-refresh (EXPENSE ROUTES FIXED)');
