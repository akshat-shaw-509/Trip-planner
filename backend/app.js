const path = require('path')
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')
const cookieParser = require('cookie-parser')

// Routes
const authRoutes = require('./routes/auth.routes')
const tripRoutes = require('./routes/trip.routes')
const placeRoutes = require('./routes/place.routes')
const activityRoutes = require('./routes/activity.routes')
const expenseRoutes = require('./routes/expense.routes')
const uploadRoutes = require('./routes/upload.routes')
const recommendationRoutes = require('./routes/recommendation.routes')
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware')

const app = express()

app.set('trust proxy', 1)
app.use(
  helmet({
    crossOriginOpenerPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
)

//CORS
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : [
      'https://akshat-shaw-509.github.io',
      'https://trip-planner-n1g3.onrender.com',
      'https://trip-planner-5uys.onrender.com',
      'http://localhost:3000',
      'http://localhost:8000'
    ]

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true) 
      if (allowedOrigins.includes(origin)) {
        return callback(null, true)
      }
      return callback(new Error('CORS not allowed'))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
)

// Rate limiting
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
  })
)

// Cookies
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser()) 

//Uploads
app.use(
  '/uploads',
  express.static(path.join(__dirname, '../uploads'), {
    setHeaders: (res) => {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    }
  })
)

//Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/trips', tripRoutes)
app.use('/api/places', placeRoutes)
app.use('/api/activities', activityRoutes)
app.use('/api/expenses', expenseRoutes)
app.use('/api/uploads', uploadRoutes)
app.use('/api/recommendations', recommendationRoutes)

app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Planora API is running',
    version: '1.0.0',
    documentation: 'https://github.com/akshat-shaw-509/Trip-planner',
    endpoints: {
      auth: '/api/auth',
      trips: '/api/trips',
      places: '/api/places',
      activities: '/api/activities',
      expenses: '/api/expenses',
      uploads: '/api/uploads',
      recommendations: '/api/recommendations',
      health: '/api/health'
    }
  })
})

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  })
})
// Error handling
app.use(notFoundHandler)
app.use(errorHandler)

module.exports = app
