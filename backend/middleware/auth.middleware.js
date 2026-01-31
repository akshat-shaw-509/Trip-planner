// JWT library for token verification
const jwt = require('jsonwebtoken')
// User model to fetch authenticated user
const User = require('../models/User.model')
// Environment configuration (JWT secret, etc.)
const config = require('../config/env')
// Custom error helper for unauthorized access
const { UnauthorizedError } = require('../utils/errors')

// ✅ ADD TOKEN CACHE (install: npm install node-cache)
const NodeCache = require('node-cache')
const tokenCache = new NodeCache({ 
  stdTTL: 300, // Cache for 5 minutes
  checkperiod: 60, // Cleanup expired entries every minute
  useClones: false // Better performance, we don't modify cached data
})

/**
 * -------------------- Helper Functions --------------------
 */

/**
 * Extract Bearer token from Authorization header
 * Expected format: Authorization: Bearer <token>
 */
const getTokenFromHeader = (req) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  return authHeader.split(' ')[1]
}

/**
 * -------------------- Authentication Middleware --------------------
 */

/**
 * Authenticate user (OPTIMIZED VERSION)
 * - Requires a valid JWT token
 * - Ensures user exists and is active
 * - Attaches user object to req.user
 * - Uses caching to reduce database queries
 */
const authenticate = async (req, res, next) => {
  try {
    // Extract token from request header
    const token = getTokenFromHeader(req)
    if (!token) {
      throw UnauthorizedError('No token provided')
    }

    // ✅ CHECK CACHE FIRST (avoids database query)
    const cachedUser = tokenCache.get(token)
    if (cachedUser) {
      req.user = cachedUser
      return next()
    }

    // Verify token using JWT secret
    const decoded = jwt.verify(token, config.jwt.secret)

    // ✅ OPTIMIZED DATABASE QUERY
    const user = await User.findById(decoded.id)
      .select('name email role isActive isVerified profilePicture')
      .lean()

    if (!user) {
      throw UnauthorizedError('User not found')
    }

    // Block inactive users
    if (!user.isActive) {
      throw UnauthorizedError('User account is inactive')
    }

    // ✅ FIX: Ensure both _id and id are available on req.user
    const userWithId = {
      ...user,
      _id: user._id,           // MongoDB's _id
      id: user._id.toString()  // String version for compatibility
    }

    // ✅ CACHE THE USER (subsequent requests will be faster)
    tokenCache.set(token, userWithId)

    // Attach authenticated user to request object
    req.user = userWithId
    next()
  } catch (error) {
    // Token expired
    if (error.name === 'TokenExpiredError') {
      return next(UnauthorizedError('Token expired'))
    }
    // Invalid or malformed token
    if (error.name === 'JsonWebTokenError') {
      return next(UnauthorizedError('Invalid token'))
    }
    // Custom application errors
    if (error.statusCode) {
      return next(error)
    }
    // Fallback authentication error
    next(UnauthorizedError('Authentication failed'))
  }
}

/**
 * -------------------- Authorization Middleware --------------------
 */

/**
 * Role-based authorization
 * Usage example: authorize('admin', 'moderator')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw UnauthorizedError('Insufficient permissions')
    }
    next()
  }
}

/**
 * -------------------- Optional Authentication --------------------
 */

/**
 * Optional authentication (NON-STRICT)
 * - Does NOT throw error if token is missing or invalid
 * - Attaches req.user only if token is valid
 * - Useful for public routes with enhanced features for logged-in users
 */

const optionalAuth = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req)
    if (!token) return next()

    // ✅ CHECK CACHE FIRST
    const cachedUser = tokenCache.get(token)
    if (cachedUser) {
      req.user = cachedUser
      return next()
    }

    const decoded = jwt.verify(token, config.jwt.secret)

    // ✅ OPTIMIZED QUERY
    const user = await User.findById(decoded.id)
      .select('name email role isActive isVerified profilePicture')
      .lean()

    if (user && user.isActive) {
      // ✅ FIX: Ensure both _id and id are available
      const userWithId = {
        ...user,
        _id: user._id,
        id: user._id.toString()
      }
      tokenCache.set(token, userWithId)
      req.user = userWithId
    }
  } catch (error) {
    // Silently ignore token errors in optional auth
  }
  next()
}

/**
 * ✅ CACHE INVALIDATION HELPER
 * Call this when user data changes (profile update, role change, etc.)
 */
const invalidateUserCache = (userId) => {
  // Since we cache by token, we can't directly invalidate by userId
  // Option 1: Clear entire cache (simple but less efficient)
  tokenCache.flushAll()
  
  // Option 2: Track userId->token mapping (more complex, more efficient)
  // This would require additional logic in authenticate()
}

/**
 * Export authentication & authorization middlewares
 */
module.exports = {
  authenticate,
  authorize,
  optionalAuth,
  invalidateUserCache // Export for use when user data changes
}

