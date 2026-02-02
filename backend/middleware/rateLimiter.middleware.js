const rateLimit = require('express-rate-limit')
const { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS } = require('../config/constants')

const baseOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, try again later'
  }
}
const apiLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  ...baseOptions
})

//Auth Limiter 
const authLimiter = rateLimit({
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
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  ...baseOptions,
  message: {
    success: false,
    message: 'Too many uploads'
  }
})
// Rate limit logging middleware
const logRateLimitHit = (req, res, next) => {
  // Get rate limit info from headers
  const limit = res.getHeader('RateLimit-Limit')
  const remaining = res.getHeader('RateLimit-Remaining')
  const reset = res.getHeader('RateLimit-Reset')
  // Log when user is getting close to limit (80% used)
  if (remaining !== undefined && limit !== undefined) {
    const usedPercentage = ((limit - remaining) / limit) * 100
    if (usedPercentage >= 80) {
      console.warn(`Rate limit warning:`, {
        ip: req.ip,
        path: req.path,
        method: req.method,
        userId: req.user?.id || 'anonymous',
        remaining: remaining,
        limit: limit,
        resetAt: new Date(reset * 1000).toISOString()
      })
    }
  }

  // Log actual rate limit hits (429 status)
  const originalJson = res.json
  res.json = function(data) {
    if (res.statusCode === 429) {
      console.error(`Rate limit exceeded:`, {
        ip: req.ip,
        path: req.path,
        method: req.method,
        userId: req.user?.id || 'anonymous',
        timestamp: new Date().toISOString(),
        userAgent: req.get('user-agent')
      })
    }
    return originalJson.call(this, data)
  }
  next()
}
module.exports = {
   apiLimiter,
  authLimiter,
  uploadLimiter,
  logRateLimitHit
}
