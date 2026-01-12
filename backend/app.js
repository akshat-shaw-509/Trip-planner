let path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })
let express = require('express')
let cors = require('cors')
let helmet = require('helmet')
let morgan = require('morgan')

// Import routes
let authRoutes = require('./routes/auth.routes')
let tripRoutes = require('./routes/trip.routes')
let placeRoutes = require('./routes/place.routes')
let activityRoutes = require('./routes/activity.routes')
let expenseRoutes = require('./routes/expense.routes')
let uploadRoutes = require('./routes/upload.routes')

// Import middleware
let { logRateLimitHit } = require('./middleware/rateLimiter.middleware')
let { errorHandler, notFoundHandler } = require('./middleware/error.middleware')

let app = express()

// Security middleware
app.use(helmet())

// Configure CORS
let corsOriginConfig = process.env.CORS_ORIGIN || ''
let allowedOrigins = corsOriginConfig.split(',').map(s => s.trim()).filter(Boolean)

let corsOptions = {
  origin: function(origin, callback) {
    if (!origin) return callback(null, true)
    if (allowedOrigins.length === 0) {
      allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://127.0.0.1:8000' ,'http://localhost:8000']
    }
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}
app.use(cors(corsOptions))

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Rate limiting logger
app.use(logRateLimitHit)

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  })
})

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Planora API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      auth: '/api/auth',
      trips: '/api/trips',
      places: '/api/places',
      activities: '/api/activities',
      expenses: '/api/expenses',
      uploads: '/api/uploads',
      health: '/health'
    }
  })
})

// API Routes - IMPORTANT: Auth routes must be mounted correctly
app.use('/api/auth', authRoutes)
app.use('/api', tripRoutes)
app.use('/api', placeRoutes)
app.use('/api/activities', activityRoutes)
app.use('/api/expenses', expenseRoutes)
app.use('/api/uploads', uploadRoutes)

// 404 Handler
app.use(notFoundHandler)

// Error Handler (must be last)
app.use(errorHandler)

module.exports = app