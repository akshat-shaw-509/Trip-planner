// JWT library for token verification
const jwt = require('jsonwebtoken')

// User model to fetch authenticated user
const User = require('../models/User.model')

// Environment configuration (JWT secret, etc.)
const config = require('../config/env')

// Custom error helper for unauthorized access
const { UnauthorizedError } = require('../utils/errors')

/**
 * -------------------- Helper Functions --------------------
 */

/**
 * Extract Bearer token from Authorization header
 * Expected format:
 * Authorization: Bearer <token>
 */
const getTokenFromHeader = (req) => {
  const authHeader = req.headers.authorization

  // Header must exist and start with "Bearer "
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null

  // Split "Bearer <token>" and return token
  return authHeader.split(' ')[1]
}

/**
 * -------------------- Authentication Middleware --------------------
 */

/**
 * Authenticate user (STRICT)
 * - Requires a valid JWT token
 * - Ensures user exists and is active
 * - Attaches user object to req.user
 */
const authenticate = async (req, res, next) => {
  try {
    // Extract token from request header
    const token = getTokenFromHeader(req)

    if (!token) {
      throw UnauthorizedError('No token provided')
    }

    // Verify token using JWT secret
    const decoded = jwt.verify(token, config.jwt.secret)

    // Fetch user from database using decoded token ID
    const user = await User.findById(decoded.id)

    if (!user) {
      throw UnauthorizedError('User not found')
    }

    // Optional strict checks (enable if needed)
    // if (!user.isVerified) {
    //   throw UnauthorizedError('Please verify your email first')
    // }

    // Block inactive users
    if (!user.isActive) {
      throw UnauthorizedError('User account is inactive')
    }

    // Attach authenticated user to request object
    req.user = user

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
 * Usage example:
 * authorize('admin', 'moderator')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    // User must be authenticated and have required role
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

    // Continue as guest if no token
    if (!token) return next()

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret)

    // Fetch user from database
    const user = await User.findById(decoded.id)

    // Attach user only if active
    if (user && user.isActive) {
      req.user = user
    }
  } catch (error) {
    // Silently ignore token errors in optional auth
  }

  next()
}

/**
 * Export authentication & authorization middlewares
 */
module.exports = {
  authenticate,
  authorize,
  optionalAuth
}
