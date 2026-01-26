let path = require('path')

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
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : [
      'https://akshat-shaw-509.github.io',
      'https://trip-planner-n1g3.onrender.com',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:8000',
      'http://127.0.0.1:8000'
    ];

// Log for debugging (you can remove this later)
console.log('Allowed CORS origins:', allowedOrigins);

app.use(cors({
  origin: function (origin, callback) {
    // allow server-to-server & Postman
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`❌ Blocked origin: ${origin}`);
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));


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