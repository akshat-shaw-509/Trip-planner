const jwt = require('jsonwebtoken')
const User = require('../models/User.model')
const config = require('../config/env')
const { UnauthorizedError } = require('../utils/errors')

const getTokenFromHeader = (req) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  return authHeader.split(' ')[1]
}

//Authentication Middleware 

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
    // Verify token using JWT secret
    const decoded = jwt.verify(token, config.jwt.secret)
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
    const userWithId = {
      ...user,
      _id: user._id,           
      id: user._id.toString()  
    }
    req.user = userWithId
    next()
  } catch (error) {
    // Token expired
    if (error.name === 'TokenExpiredError') {
      return next(UnauthorizedError('Token expired'))
    }
    // Invalid token
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
 * Optional authentication (NON-STRICT)
 * - Does NOT throw error if token is missing or invalid
 * - Attaches req.user only if token is valid
 * - Useful for public routes with enhanced features for logged-in users
 */

const optionalAuth = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req)
    if (!token) return next()
    const decoded = jwt.verify(token, config.jwt.secret)
    const user = await User.findById(decoded.id)
      .select('name email role isActive isVerified profilePicture')
      .lean()

    if (user && user.isActive) {
      const userWithId = {
        ...user,
        _id: user._id,
        id: user._id.toString()
      }
      req.user = userWithId
    }
  } catch (error) {
    // Silently ignore token errors in optional auth
  }
  next()
}
module.exports = {
  authenticate,
  optionalAuth
}




