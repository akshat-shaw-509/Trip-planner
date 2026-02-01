let express = require('express')
let rateLimit = require('express-rate-limit')

let router = express.Router()
let authController = require('../controllers/auth.controller')
let { authenticate } = require('../middleware/auth.middleware')
let { 
  validateRegister, 
  validateLogin, 
} = require('../middleware/validation.middleware')

//Auth rate limiter
let authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true
})

// Local auth 
router.post('/login', validateLogin, authLimiter, authController.login)
router.post('/register', validateRegister, authLimiter, authController.register)

// Google OAuth
router.post('/google', authController.googleLogin)

// Tokens & recovery
router.post('/refresh', authController.refreshToken)
// Protected routes
router.get('/me', authenticate, authController.getCurrentUser)
router.post('/logout', authenticate, authController.logout)

// Config Endpoints
router.get('/config', (req, res) => {
  res.json({ 
    success: true,
    config: {
      apiBaseURL: process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}/api`,
      googleClientId: process.env.GOOGLE_CLIENT_ID,
      geoapifyApiKey: process.env.GEOAPIFY_API_KEY
    }
  });
});

// Individual config endpoints
router.get('/google-client-id', (req, res) => {
  res.json({ 
    success: true, 
    clientId: process.env.GOOGLE_CLIENT_ID 
  });
});

router.get('/geoapify-api-key', (req, res) => {
  res.json({ 
    success: true, 
    apiKey: process.env.GEOAPIFY_API_KEY 
  });
});

module.exports = router
