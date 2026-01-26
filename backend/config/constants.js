<<<<<<< HEAD
module.exports = {
    // Trip status
    TRIP_STATUS: {
        PLANNING: 'planning',
        BOOKED: 'booked',
        ONGOING: 'ongoing',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled',
    },

    // Activity/Place categories
    PLACE_CATEGORIES: {
        ACCOMMODATION: 'accommodation',
        RESTAURANT: 'restaurant',
        ATTRACTION: 'attraction',
        TRANSPORT: 'transport',
        OTHER: 'other',
    },

    // Visit status
    PLACE_VISIT_STATUS: {
        PLANNED: 'planned',
        VISITED: 'visited',
        SKIPPED: 'skipped',
    },

    // Expense categories
    EXPENSE_CATEGORIES: {
        ACCOMMODATION: 'accommodation',
        FOOD: 'food',
        TRANSPORT: 'transport',
        ACTIVITIES: 'activities',
        SHOPPING: 'shopping',
        ENTERTAINMENT: 'entertainment',
        MISC: 'miscellaneous',
    },

    // ADD THESE FOR COMPATIBILITY
    MAX_FILE_SIZE: 5 * 1024 * 1024,
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'image/jpeg', 'image/png'],
    RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000,
    RATE_LIMIT_MAX_REQUESTS: 100,
    
    // Also keep old structure for backward compatibility
    APP_CONFIG: {
        MAX_FILE_SIZE: 5 * 1024 * 1024,
        DEFAULT_PAGE_SIZE: 20,
        MAX_PAGE_SIZE: 100,
        DEFAULT_CURRENCY: 'USD',
    },

    FILE_TYPES: {
        IMAGES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        DOCUMENTS: ['application/pdf', 'image/jpeg', 'image/png'],
    },

    RATE_LIMIT: {
        WINDOW_MS: 15 * 60 * 1000,
        MAX_REQUESTS: 100,
    },

  JWT_EXPIRY: {
    ACCESS: '15m',
    REFRESH: '7d',
  },

   EMAIL_TEMPLATES: {
    WELCOME: 'welcome',
    RESET_PASSWORD: 'reset_password',
    TRIP_INVITATION: 'trip_invitation',
  },
=======
module.exports = {
    // Trip status
    TRIP_STATUS: {
        PLANNING: 'planning',
        BOOKED: 'booked',
        ONGOING: 'ongoing',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled',
    },

    // Activity/Place categories
    PLACE_CATEGORIES: {
        ACCOMMODATION: 'accommodation',
        RESTAURANT: 'restaurant',
        ATTRACTION: 'attraction',
        TRANSPORT: 'transport',
        OTHER: 'other',
    },

    // Visit status
    PLACE_VISIT_STATUS: {
        PLANNED: 'planned',
        VISITED: 'visited',
        SKIPPED: 'skipped',
    },

    // Expense categories
    EXPENSE_CATEGORIES: {
        ACCOMMODATION: 'accommodation',
        FOOD: 'food',
        TRANSPORT: 'transport',
        ACTIVITIES: 'activities',
        SHOPPING: 'shopping',
        ENTERTAINMENT: 'entertainment',
        MISC: 'miscellaneous',
    },

    // ADD THESE FOR COMPATIBILITY
    MAX_FILE_SIZE: 5 * 1024 * 1024,
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'image/jpeg', 'image/png'],
    RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000,
    RATE_LIMIT_MAX_REQUESTS: 100,
    
    // Also keep old structure for backward compatibility
    APP_CONFIG: {
        MAX_FILE_SIZE: 5 * 1024 * 1024,
        DEFAULT_PAGE_SIZE: 20,
        MAX_PAGE_SIZE: 100,
        DEFAULT_CURRENCY: 'USD',
    },

    FILE_TYPES: {
        IMAGES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        DOCUMENTS: ['application/pdf', 'image/jpeg', 'image/png'],
    },

    RATE_LIMIT: {
        WINDOW_MS: 15 * 60 * 1000,
        MAX_REQUESTS: 100,
    },

  JWT_EXPIRY: {
    ACCESS: '15m',
    REFRESH: '7d',
  },

   EMAIL_TEMPLATES: {
    WELCOME: 'welcome',
    RESET_PASSWORD: 'reset_password',
    TRIP_INVITATION: 'trip_invitation',
  },
>>>>>>> 0007615a5a7317e8689fc9727726ee86c5585786
}