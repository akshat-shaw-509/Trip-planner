let path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

let express = require('express')
let cors = require('cors')
let helmet = require('helmet')
let morgan = require('morgan')
let rateLimit = require('express-rate-limit')
let cookieParser = require('cookie-parser')

// Import routes
let authRoutes = require('./routes/auth.routes')
let tripRoutes = require('./routes/trip.routes')
let placeRoutes = require('./routes/place.routes')
let activityRoutes = require('./routes/activity.routes')
let expenseRoutes = require('./routes/expense.routes')
let uploadRoutes = require('./routes/upload.routes')
let recommendationRoutes = require('./routes/recommendation.routes')

// Import middleware
let { errorHandler, notFoundHandler } = require('./middleware/error.middleware')

let app = express()

/* =========================
   1. Trust proxy
========================= */
app.set('trust proxy', 1)

/* =========================
   2. Security (Helmet)
========================= */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    contentSecurityPolicy: false
  })
)



/* =========================
   3. CORS CONFIG (FIXED)
========================= */
let corsOriginConfig = process.env.CORS_ORIGIN || ''
let allowedOrigins = corsOriginConfig
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

const devOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:8000',
  'http://127.0.0.1:8000'
]

allowedOrigins = [...new Set([...allowedOrigins, ...devOrigins])]
app.use(cors({
  origin: function (origin, callback) {
    // Allow same-origin, Postman, server-side
    if (!origin) return callback(null, true)

    // ✅ Allow ALL localhost (FedCM-safe)
    if (
      origin.startsWith('http://localhost') ||
      origin.startsWith('http://127.0.0.1')
    ) {
      return callback(null, true)
    }

    // Optional production frontend
    const allowed = process.env.CORS_ORIGIN
      ?.split(',')
      .map(o => o.trim())

    if (allowed?.includes(origin)) {
      return callback(null, true)
    }

    // 🚨 NEVER block OAuth requests
    return callback(null, true)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))



/* =========================
   4. Rate limiting
========================= */
let limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
})
app.use(limiter)

/* =========================
   5. Body & cookies
========================= */
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser())

/* =========================
   6. Static files
========================= */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

/* =========================
   7. Logging
========================= */
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

/* =========================
   8. Health & root
========================= */
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Server running' })
})

app.get('/', (req, res) => {
  res.json({ success: true, message: 'Planora API' })
})

/* =========================
   9. Routes
========================= */
app.use('/api/auth', authRoutes)
app.use('/api', tripRoutes)
app.use('/api', placeRoutes)
app.use('/api/activities', activityRoutes)
app.use('/api/expenses', expenseRoutes)
app.use('/api/uploads', uploadRoutes)
app.use('/api', recommendationRoutes)

/* =========================
   10. Error handling
========================= */
app.use(notFoundHandler)
app.use(errorHandler)

module.exports = app