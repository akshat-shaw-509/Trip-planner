const apiService = {
    baseURL: 'http://localhost:5000/api',
    
    auth: {
        login: (data) => apiService.post('/auth/login', data),
        register: (data) => apiService.post('/auth/register', data),
        logout: () => apiService.post('/auth/logout'),
        refreshToken: (refreshToken) => apiService.post('/auth/refresh', { refreshToken }),
        // ✅ Added Google OAuth endpoint
        google: (idToken) => apiService.post('/auth/google', { idToken })
    },

    async request(endpoint, options = {}) {
        const token = localStorage.getItem('accessToken');
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
        
        const config = {
            ...options,
            headers
        };
        
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, config);
            const data = await response.json();
            
            if (!response.ok) {
                console.error('API Error Details:', {
                    endpoint,
                    status: response.status,
                    statusText: response.statusText,
                    data: data
                });
                
                const error = new Error(data.message || 'Request failed');
                error.response = { data, status: response.status };
                error.validationErrors = data.errors;
                throw error;
            }
            
            return data;
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    },
    
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },
    
    async post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    },
    
    async put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    },
    
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    },
    
    trips: {
        getAll: () => apiService.get('/trips'),
        getById: (id) => apiService.get(`/trips/${id}`),
        create: (data) => apiService.post('/trips', data),
        update: (id, data) => apiService.put(`/trips/${id}`, data),
        delete: (id) => apiService.delete(`/trips/${id}`)
    },
    
    places: {
        getByTrip: (tripId, filters = {}) => {
            const params = new URLSearchParams(filters);
            return apiService.get(`/trips/${tripId}/places?${params}`);
        },
        getById: (placeId) => apiService.get(`/places/${placeId}`),
        create: (tripId, data) => apiService.post(`/trips/${tripId}/places`, data),
        update: (placeId, data) => apiService.put(`/places/${placeId}`, data),
        delete: (placeId) => apiService.delete(`/places/${placeId}`),
        toggleFavorite: (placeId) => apiService.request(`/places/${placeId}/favorite`, {
            method: 'PATCH'
        })
    },

    activities: {
        getByTrip: (tripId) => apiService.get(`/activities/trips/${tripId}/activities`),
        getById: (id) => apiService.get(`/activities/${id}`),
        create: (tripId, data) => apiService.post(`/activities/trips/${tripId}/activities`, data),
        update: (id, data) => apiService.put(`/activities/${id}`),
        delete: (id) => apiService.delete(`/activities/${id}`)
    },
    
    recommendations: {
        getForTrip: (tripId, options = {}) => {
            const params = new URLSearchParams();
            if (options.limit) params.append('limit', options.limit);
            if (options.radius) params.append('radius', options.radius);
            if (options.category) params.append('category', options.category);
            if (options.useAI) params.append('useAI', 'true');
            
            const queryString = params.toString();
            const endpoint = `/trips/${tripId}/recommendations${queryString ? '?' + queryString : ''}`;
            
            console.log('📡 Fetching recommendations from:', endpoint);
            return apiService.get(endpoint);
        },
        
        getDayPlans: (tripId) => {
            console.log('📡 Fetching day plans for trip:', tripId);
            return apiService.get(`/trips/${tripId}/day-plans`);
        }
    },

    expenses: {
        getByTrip: (tripId) => apiService.get(`/expenses/trips/${tripId}/expenses`),
        create: (tripId, data) => {
            console.log('📤 Creating expense:', { tripId, data });
            return apiService.post(`/expenses/trips/${tripId}/expenses`, data);
        },
        getById: (id) => apiService.get(`/expenses/${id}`),
        update: (id, data) => apiService.put(`/expenses/${id}`, data),
        delete: (id) => apiService.delete(`/expenses/${id}`)
    },
    
    preferences: {
        get: () => {
            console.log('📡 Fetching user preferences');
            return apiService.get('/preferences');
        },
        trackSearch: (searchData) => {
            return apiService.post('/preferences/track-search', searchData);
        },
        updateRatingThreshold: (threshold) => {
            return apiService.put('/preferences/rating-threshold', { threshold });
        },
        reset: () => {
            return apiService.delete('/preferences');
        }
    }
};

window.apiService = apiService;