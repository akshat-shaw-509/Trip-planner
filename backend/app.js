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

// Error middleware
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware')

const app = express()
app.use((req, res, next) => {
  console.log('➡️ Incoming:', req.method, req.originalUrl)
  console.log('➡️ next type:', typeof next)
  next()
})

/* =========================
   1. Trust proxy
*/
app.set('trust proxy', 1)

/* =========================
   2. Security (Helmet)
   → simplified, no custom overrides
*/
app.use(helmet())

/* =========================
   3. CORS
   → simplified, predictable
   → allows requests with no origin (Postman, curl)
*/
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
      if (!origin) return callback(null, true) // ✅ keep no-origin allowed
      if (allowedOrigins.includes(origin)) {
        return callback(null, true)
      }
      return callback(new Error('CORS not allowed'))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
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
app.use(cookieParser()) // ✅ explicitly kept

/* =========================
   6. Static uploads
   → moved to infra-level responsibility
*/
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

/* =========================
   7. Logging
*/
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

/* =========================
   8. API Routes (consistent mounting)
*/
app.use('/api/auth', authRoutes)
app.use('/api/trips', tripRoutes)
app.use('/api/places', placeRoutes)
app.use('/api/activities', activityRoutes)
app.use('/api/expenses', expenseRoutes)
app.use('/api/uploads', uploadRoutes)
app.use('/api/recommendations', recommendationRoutes)

/* =========================
   9. Error handling
*/
app.use(notFoundHandler)
app.use(errorHandler)

module.exports = app
