// ============================================================
// ENHANCED API SERVICE WITH DETAILED ERROR MESSAGES
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

  // ✅ ENHANCED REQUEST FUNCTION WITH DETAILED ERROR LOGGING
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
      // Log the request for debugging
      console.log(`🌐 API Request: ${config.method || 'GET'} ${endpoint}`);
      if (config.body) {
        console.log('📤 Request Body:', config.body);
      }

      const response = await fetch(`${this.baseURL}${endpoint}`, config);

      // ✅ ENHANCED ERROR HANDLING
      if (!response.ok) {
        // Try to get JSON error response
        let errorData;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
        } else {
          const textError = await response.text();
          errorData = { message: textError || `HTTP ${response.status}` };
        }
        
        // Log detailed error info
        console.error('═══════════════════════════════════════════');
        console.error(`❌ API ERROR ${response.status}`);
        console.error('═══════════════════════════════════════════');
        console.error('Endpoint:', `${this.baseURL}${endpoint}`);
        console.error('Method:', config.method || 'GET');
        console.error('Status:', response.status, response.statusText);
        console.error('Error Response:', errorData);
        
        // ✅ LOG FULL ERROR DATA OBJECT TO SEE ALL PROPERTIES
        console.error('Full Error Data Keys:', Object.keys(errorData));
        console.error('Full Error Data:', JSON.stringify(errorData, null, 2));
        
        console.error('═══════════════════════════════════════════');

        // Handle 401 Unauthorized - Token expired
        if (response.status === 401) {
          if (errorData.message?.includes('expired') || errorData.message?.includes('Token expired')) {
            console.log('⚠️ Token expired, attempting refresh...');

            if (!this.isRefreshing) {
              this.isRefreshing = true;
              const newToken = await this.refreshToken();
              this.isRefreshing = false;

              if (newToken) {
                this.onRefreshed(newToken);
                config.headers['Authorization'] = `Bearer ${newToken}`;
                const retryResponse = await fetch(`${this.baseURL}${endpoint}`, config);
                
                if (!retryResponse.ok) {
                  const retryError = await retryResponse.json().catch(() => ({}));
                  throw new Error(retryError.message || `HTTP ${retryResponse.status}`);
                }
                
                return await retryResponse.json();
              }
            } else {
              return new Promise((resolve, reject) => {
                this.subscribeTokenRefresh(async (newToken) => {
                  try {
                    config.headers['Authorization'] = `Bearer ${newToken}`;
                    const retryResponse = await fetch(`${this.baseURL}${endpoint}`, config);
                    
                    if (!retryResponse.ok) {
                      const retryError = await retryResponse.json().catch(() => ({}));
                      throw new Error(retryError.message || `HTTP ${retryResponse.status}`);
                    }
                    
                    resolve(await retryResponse.json());
                  } catch (error) {
                    reject(error);
                  }
                });
              });
            }
          } else {
            throw new Error('Unauthorized');
          }
        }

        // ✅ IMPROVED 400 BAD REQUEST HANDLING
        if (response.status === 400) {
          let errorMessage = 'Validation Error';
          let backendErrors = null;
          
          // Check for errors array (express-validator format)
          if (errorData.errors && Array.isArray(errorData.errors)) {
            console.error('🔍 VALIDATION ERRORS (Array Format):');
            errorData.errors.forEach(err => {
              const field = err.field || err.path || err.param || 'Unknown field';
              const message = err.message || err.msg || 'Invalid value';
              console.error(`  ❌ ${field}: ${message}`);
            });
            
            backendErrors = errorData.errors;
            errorMessage = errorData.errors.map(err => {
              const field = err.field || err.path || err.param || 'Field';
              const message = err.message || err.msg || 'Invalid';
              return `${field}: ${message}`;
            }).join('\n');
          } 
          // Check for error object (alternative format)
          else if (errorData.error && typeof errorData.error === 'object') {
            console.error('🔍 VALIDATION ERRORS (Object Format):');
            const errorObj = errorData.error;
            backendErrors = Object.keys(errorObj).map(key => ({
              field: key,
              message: errorObj[key]
            }));
            
            backendErrors.forEach(err => {
              console.error(`  ❌ ${err.field}: ${err.message}`);
            });
            
            errorMessage = backendErrors.map(err => 
              `${err.field}: ${err.message}`
            ).join('\n');
          }
          // Simple error message
          else if (errorData.message) {
            console.error('🔍 ERROR MESSAGE:', errorData.message);
            errorMessage = errorData.message;
          }
          
          const error = new Error(errorMessage);
          error.backendErrors = backendErrors;
          error.errorData = errorData;
          throw error;
        }

        // Other HTTP errors
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      // Success - log and return
      const data = await response.json();
      console.log('✅ API Response:', data);
      return data;

    } catch (error) {
      console.error(`❌ API request failed: ${endpoint}`, error);
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
    },

    async forgotPassword(email) {
      return await apiService.request('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
    },

    async resetPassword(token, password) {
      return await apiService.request(`/auth/reset-password/${token}`, {
        method: 'POST',
        body: JSON.stringify({ password })
      });
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
        method: 'PATCH'
      });
    }
  },

  // Expense endpoints
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
      return await apiService.request(`/activities/trips/${tripId}/activities`);
    },

    async create(tripId, data) {
      return await apiService.request(`/activities/trips/${tripId}/activities`, {
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
    },

    async getByDate(tripId, date) {
      return await apiService.request(`/activities/trips/${tripId}/activities/by-date?date=${date}`);
    },

    async updateStatus(activityId, status) {
      return await apiService.request(`/activities/${activityId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
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

console.log('Enhanced API Service loaded with IMPROVED ERROR LOGGING');
