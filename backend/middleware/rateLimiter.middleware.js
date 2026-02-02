let rateLimit = require('express-rate-limit')
let { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS } = require('../config/constants')

const baseOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, try again later'
  }
}
let apiLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  ...baseOptions
})

//Auth Limiter 
let authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // Maximum login attempts allowed
  max: 10,
  skipSuccessfulRequests: true,
  ...baseOptions,
  message: {
    success: false,
    message: 'Too many login attempts'
  }
})

//File Upload Limiter 
let uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  ...baseOptions,
  message: {
    success: false,
    message: 'Too many uploads'
  }
})

module.exports = {
  apiLimiter,
  authLimiter,
  uploadLimiter,
}


