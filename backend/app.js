let path=require('path')
require('dotenv').config({path:path.join(__dirname,'.env')})
let express = require('express')
let cors = require('cors')
let helmet = require('helmet')
let morgan = require('morgan')
let authRoutes = require('./routes/auth.routes')
let tripRoutes = require('./routes/trip.routes')
let { logRateLimitHit } = require('./middleware/rateLimiter.middleware')
let { formatError, classifyError } = require('./utils/errors')
let app = express()
app.use(helmet())
// Configure CORS to allow a whitelist of origins. Set `CORS_ORIGIN` in .env as a
// comma-separated list (for example: http://localhost:3000,http://127.0.0.1:3000)
let corsOriginConfig = process.env.CORS_ORIGIN || ''
let allowedOrigins = corsOriginConfig.split(',').map(s => s.trim()).filter(Boolean)

let corsOptions = {
    origin: function(origin, callback) {
        // allow non-browser or same-origin requests (no origin)
        if (!origin) return callback(null, true)
        if (allowedOrigins.length === 0) {
            // if no whitelist provided, allow localhost variants by default
            allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8000']
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

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'))
}
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(logRateLimitHit)

app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    })
})

app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Planora API',
        version: '1.0.0',
        documentation: '/api/docs',
        endpoints: {
            auth: '/api/auth',
            health: '/health'
        }
    })
})

app.use('/api/trips', tripRoutes)
app.use('/api/auth', authRoutes)

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
        availableRoutes: {
            auth: '/api/auth',
            health: '/health'
        }
    })
})

app.use((err, req, res, next) => {
    console.error('Error Details:', err.message || err);
    
    const status = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    
    const response = {
        success: false,
        status: status >= 400 && status < 500 ? 'fail' : 'error',
        message: message,
        statusCode: status
    };
    
    if (process.env.NODE_ENV === 'development') {
        response.stack = err.stack;
    }
    
    res.status(status).json(response);
});


module.exports=app