let express = require('express')
let rateLimit = require('express-rate-limit')

let router = express.Router()
let authController = require('../controllers/auth.controller')
let { authenticate } = require('../middleware/auth.middleware')
let { 
  validateRegister, 
  validateLogin,
  validatePasswordReset,
  validateChangePassword 
} = require('../middleware/validation.middleware')

//Auth rate limiter (LOCAL auth only)
let authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true
})

// Local auth (rate-limited)
router.post('/login', validateLogin, authLimiter, authController.login)
router.post('/register', validateRegister, authLimiter, authController.register)

// Google OAuth (NO rate limiter)
router.post('/google', authController.googleLogin)

// Tokens & recovery
router.post('/refresh', authController.refreshToken)
router.post('/forgot-password', authController.forgotPassword)
router.post('/reset-password/:token', validatePasswordReset, authController.resetPassword)
router.get('/verify-email/:token', authController.verifyEmail)

// Protected routes
router.get('/me', authenticate, authController.getCurrentUser)
router.post('/logout', authenticate, authController.logout)
router.post(
  '/change-password',
  authenticate,
  validateChangePassword,
  authController.changePassword
)

// ===================== Config Endpoints (Public) =====================
// Unified config endpoint - returns all frontend configuration
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

// Individual config endpoints (for backwards compatibility or specific use)
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