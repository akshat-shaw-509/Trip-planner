<<<<<<< HEAD
let rateLimit = require('express-rate-limit')

// Import rate limit values from constants
let { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS } = require('../config/constants')

/**
 * -------------------- Base Rate Limit Options --------------------
 * Shared configuration used by all limiters
 */
const baseOptions = {
  // Send rate limit info in standard response headers
  standardHeaders: true,

  // Disable legacy X-RateLimit-* headers
  legacyHeaders: false,

  // Default message returned when rate limit is exceeded
  message: {
    success: false,
    message: 'Too many requests, try again later'
  }
}

/**
 * -------------------- General API Limiter --------------------
 * Moderate protection for regular API endpoints
 */
let apiLimiter = rateLimit({
  // Time window duration (from constants)
  windowMs: RATE_LIMIT_WINDOW_MS,

  // Maximum requests allowed in the time window
  max: RATE_LIMIT_MAX_REQUESTS,

  ...baseOptions
})

/**
 * -------------------- Auth Limiter --------------------
 * Strict protection for authentication endpoints
 * Prevents brute-force login attacks
 */
let authLimiter = rateLimit({
  // 15-minute time window
  windowMs: 15 * 60 * 1000,

  // Maximum login attempts allowed
  max: 10,

  // Successful logins are not counted
  skipSuccessfulRequests: true,

  ...baseOptions,

  // Custom message for auth rate limit
  message: {
    success: false,
    message: 'Too many login attempts'
  }
})

/**
 * -------------------- Password Reset Limiter --------------------
 * Very strict protection for password reset endpoints
 */
let passwordResetLimiter = rateLimit({
  // 1-hour window
  windowMs: 60 * 60 * 1000,

  // Maximum reset attempts allowed
  max: 3,

  ...baseOptions,

  // Custom message for password reset abuse
  message: {
    success: false,
    message: 'Too many password resets'
  }
})

/**
 * -------------------- File Upload Limiter --------------------
 * Allows higher limits but still prevents abuse
 */
let uploadLimiter = rateLimit({
  // 15-minute window
  windowMs: 15 * 60 * 1000,

  // Maximum uploads allowed
  max: 50,

  ...baseOptions,

  // Custom message for upload abuse
  message: {
    success: false,
    message: 'Too many uploads'
  }
})

let logRateLimitHit = (req, res, next) => {
  next()
}

/**
 * Export all rate limiters
 */
module.exports = {
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  uploadLimiter,
  logRateLimitHit
}
=======
let rateLimit = require('express-rate-limit')

// Import rate limit values from constants
let { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS } = require('../config/constants')

/**
 * -------------------- Base Rate Limit Options --------------------
 * Shared configuration used by all limiters
 */
const baseOptions = {
  // Send rate limit info in standard response headers
  standardHeaders: true,

  // Disable legacy X-RateLimit-* headers
  legacyHeaders: false,

  // Default message returned when rate limit is exceeded
  message: {
    success: false,
    message: 'Too many requests, try again later'
  }
}

/**
 * -------------------- General API Limiter --------------------
 * Moderate protection for regular API endpoints
 */
let apiLimiter = rateLimit({
  // Time window duration (from constants)
  windowMs: RATE_LIMIT_WINDOW_MS,

  // Maximum requests allowed in the time window
  max: RATE_LIMIT_MAX_REQUESTS,

  ...baseOptions
})

/**
 * -------------------- Auth Limiter --------------------
 * Strict protection for authentication endpoints
 * Prevents brute-force login attacks
 */
let authLimiter = rateLimit({
  // 15-minute time window
  windowMs: 15 * 60 * 1000,

  // Maximum login attempts allowed
  max: 10,

  // Successful logins are not counted
  skipSuccessfulRequests: true,

  ...baseOptions,

  // Custom message for auth rate limit
  message: {
    success: false,
    message: 'Too many login attempts'
  }
})

/**
 * -------------------- Password Reset Limiter --------------------
 * Very strict protection for password reset endpoints
 */
let passwordResetLimiter = rateLimit({
  // 1-hour window
  windowMs: 60 * 60 * 1000,

  // Maximum reset attempts allowed
  max: 3,

  ...baseOptions,

  // Custom message for password reset abuse
  message: {
    success: false,
    message: 'Too many password resets'
  }
})

/**
 * -------------------- File Upload Limiter --------------------
 * Allows higher limits but still prevents abuse
 */
let uploadLimiter = rateLimit({
  // 15-minute window
  windowMs: 15 * 60 * 1000,

  // Maximum uploads allowed
  max: 50,

  ...baseOptions,

  // Custom message for upload abuse
  message: {
    success: false,
    message: 'Too many uploads'
  }
})

let logRateLimitHit = (req, res, next) => {
  next()
}

/**
 * Export all rate limiters
 */
module.exports = {
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  uploadLimiter,
  logRateLimitHit
}
>>>>>>> 0007615a5a7317e8689fc9727726ee86c5585786
