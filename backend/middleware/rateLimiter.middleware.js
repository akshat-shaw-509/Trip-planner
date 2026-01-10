let rateLimit = require('express-rate-limit')
let { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS } = require('../config/constants')

// Shared rate limit options
const baseOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, try again later'
  }
}

// General API (moderate protection)
let apiLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,        // From constants
  max: RATE_LIMIT_MAX_REQUESTS,          // From constants
  ...baseOptions
})

// Auth endpoints (strict - brute force protection)
let authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,                   // 10 login attempts
  skipSuccessfulRequests: true,  // Don't count successful logins
  ...baseOptions,
  message: {
    success: false,
    message: 'Too many login attempts'
  }
})

// Password reset (very strict)
let passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 3,                    // 3 resets per hour
  ...baseOptions,
  message: {
    success: false,
    message: 'Too many password resets'
  }
})

// File uploads (generous but protected)
let uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 50,                   // 50 uploads
  ...baseOptions,
  message: {
    success: false,
    message: 'Too many uploads'
  }
})

let logRateLimitHit = (req, res, next) => {
  next()
}

module.exports = {
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  uploadLimiter,
  logRateLimitHit
}