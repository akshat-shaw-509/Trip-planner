module.exports = {
  TRIP_STATUS: {
    PLANNING: 'planning',
    BOOKED: 'booked',
    ONGOING: 'ongoing',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  },

  PLACE_CATEGORIES: {
    ACCOMMODATION: 'accommodation',
    RESTAURANT: 'restaurant',
    ATTRACTION: 'attraction',
    TRANSPORT: 'transport',
    OTHER: 'other',
  },

  PLACE_VISIT_STATUS: {
    PLANNED: 'planned',
    VISITED: 'visited',
    SKIPPED: 'skipped',
  },

  EXPENSE_CATEGORIES: {
    ACCOMMODATION: 'accommodation',
    FOOD: 'food',
    TRANSPORT: 'transport',
    ACTIVITIES: 'activities',
    SHOPPING: 'shopping',
    ENTERTAINMENT: 'entertainment',
    MISC: 'miscellaneous',
  },

  MAX_FILE_SIZE: 5 * 1024 * 1024,

  ALLOWED_IMAGE_TYPES: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ],

  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000,
    MAX_REQUESTS: 100,
  },

  JWT_EXPIRY: {
    ACCESS: '15m',
  },
}
