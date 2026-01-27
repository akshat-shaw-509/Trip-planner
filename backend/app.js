const path = require('path')
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')
const cookieParser = require('cookie-parser')

// Import routes
const authRoutes = require('./routes/auth.routes')
const tripRoutes = require('./routes/trip.routes')
const placeRoutes = require('./routes/place.routes')
const activityRoutes = require('./routes/activity.routes')
const expenseRoutes = require('./routes/expense.routes')
const uploadRoutes = require('./routes/upload.routes')
const recommendationRoutes = require('./routes/recommendation.routes')
const configRoutes = require('./routes/config.routes')
// Import middleware
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware')

console.log('ROUTE TYPES:', {
  authRoutes: typeof authRoutes,
  tripRoutes: typeof tripRoutes,
  placeRoutes: typeof placeRoutes,
  activityRoutes: typeof activityRoutes,
  expenseRoutes: typeof expenseRoutes,
  uploadRoutes: typeof uploadRoutes,
  recommendationRoutes: typeof recommendationRoutes,
  notFoundHandler: typeof notFoundHandler,
  errorHandler: typeof errorHandler
})

const app = express()

/* =========================
   1. Trust proxy
   */
app.set('trust proxy', 1)

/* =========================
   2. Security (Helmet)
   */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    contentSecurityPolicy: false
  })
)

/* =========================
   3. CORS CONFIG - UPDATED FOR GITHUB PAGES
    */
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : [
      // GitHub Pages - with and without trailing slash
      'https://akshat-shaw-509.github.io',
      'https://akshat-shaw-509.github.io/',
      // Render
      'https://trip-planner-n1g3.onrender.com',
      'https://trip-planner-5uys.onrender.com',
      // Localhost
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:8000',
      'http://127.0.0.1:8000'
    ]

console.log('Allowed CORS origins:', allowedOrigins)

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) {
        console.log('✅ Request with no origin - allowed')
        return callback(null, true)
      }

      // Normalize origin (remove trailing slash for comparison)
      const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin
      const normalizedAllowed = allowedOrigins.map(o => o.endsWith('/') ? o.slice(0, -1) : o)

      // Check if origin is allowed
      if (normalizedAllowed.includes(normalizedOrigin)) {
        console.log(`✅ CORS allowed for: ${origin}`)
        return callback(null, true)
      }

      console.error(`❌ CORS blocked for origin: ${origin}`)
      console.error(`   Normalized: ${normalizedOrigin}`)
      console.error(`   Allowed origins:`, normalizedAllowed)
      return callback(new Error(`CORS blocked for origin: ${origin}`))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie']
  })
)

/* =========================
   4. Rate limiting
   */
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
  })
)

/* =========================
   5. Body & cookies
   */
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser())

/* ========================= 
   6. Static files
   */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

/* =========================
   7. Logging
   */
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

/* =========================
   8. Health
   */
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Server running' })
})

/* =========================
   9. Routes
   */
app.use('/api/auth', authRoutes)
app.use('/api', tripRoutes)
app.use('/api', placeRoutes)
app.use('/api/activities', activityRoutes)
app.use('/api/expenses', expenseRoutes)
app.use('/api/uploads', uploadRoutes)
app.use('/api', recommendationRoutes)

/* =========================
   10. Error handling
   */
app.use('/api/config', configRoutes)
app.use(notFoundHandler)
app.use(errorHandler)

module.exports = app
