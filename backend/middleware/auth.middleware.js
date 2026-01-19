// middleware/auth.middleware.js

let jwt = require('jsonwebtoken')
let User = require('../models/User.model')
let config = require('../config/env')
let { UnauthorizedError } = require('../utils/errors')

/**
 * Extract Bearer token from Authorization header
 */
let getTokenFromHeader = (req) => {
  let authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  return authHeader.split(' ')[1]
}

/**
 * Authenticate user (STRICT)
 */
let authenticate = async (req, res, next) => {
  try {
    let token = getTokenFromHeader(req)
    if (!token) {
      throw UnauthorizedError('No token provided')
    }

    let decoded = jwt.verify(token, config.jwt.secret)
    let user = await User.findById(decoded.id)

    if (!user) {
      throw UnauthorizedError('User not found')
    }

    // Optional strict checks
    // if (!user.isVerified) {
    //   throw UnauthorizedError('Please verify your email first')
    // }

    if (!user.isActive) {
      throw UnauthorizedError('User account is inactive')
    }

    req.user = user
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(UnauthorizedError('Token expired'))
    }

    if (error.name === 'JsonWebTokenError') {
      return next(UnauthorizedError('Invalid token'))
    }

    // Custom app errors
    if (error.statusCode) {
      return next(error)
    }

    next(UnauthorizedError('Authentication failed'))
  }
}

/**
 * Role-based authorization
 */
let authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw UnauthorizedError('Insufficient permissions')
    }
    next()
  }
}

/**
 * Optional authentication (NON-STRICT)
 */
let optionalAuth = async (req, res, next) => {
  try {
    let token = getTokenFromHeader(req)
    if (!token) return next()

    let decoded = jwt.verify(token, config.jwt.secret)
    let user = await User.findById(decoded.id)

    if (user && user.isActive) {
      req.user = user
    }
  } catch (error) {
    // Ignore token errors in optional auth
  }

  next()
}

module.exports = {
  authenticate,
  authorize,
  optionalAuth
}
