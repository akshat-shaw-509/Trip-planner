const jwt = require('jsonwebtoken')
const User = require('../models/User.model')
const config = require('../config/env')
const { UnauthorizedError } = require('../utils/errors')

const getTokenFromHeader = (req) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  return authHeader.split(' ')[1]
}

// Strict authentication
const authenticate = async (req, res, next) => {
  console.log('🔐 authenticate called')
  console.log('🔐 next is:', typeof next)
  try {
    const token = getTokenFromHeader(req)
    if (!token) {
      throw new UnauthorizedError('No token provided')
    }

    const decoded = jwt.verify(token, config.jwt.secret)

    const user = await User.findById(decoded.id)
      .select('name email role isActive isVerified profilePicture')
      .lean()

    if (!user) {
      throw new UnauthorizedError('User not found')
    }

    if (!user.isActive) {
      throw new UnauthorizedError('User account is inactive')
    }

    req.user = {
      ...user,
      _id: user._id,
      id: user._id.toString()
    }

    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Token expired'))
    }

    if (error.name === 'JsonWebTokenError') {
      return next(new UnauthorizedError('Invalid token'))
    }

    if (error.statusCode) {
      return next(error)
    }

    return next(new UnauthorizedError('Authentication failed'))
  }
}

// Optional authentication
const optionalAuth = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req)
    if (!token) return next()

    const decoded = jwt.verify(token, config.jwt.secret)

    const user = await User.findById(decoded.id)
      .select('name email role isActive isVerified profilePicture')
      .lean()

    if (user && user.isActive) {
      req.user = {
        ...user,
        _id: user._id,
        id: user._id.toString()
      }
    }
  } catch (_) {
    // silently ignore errors
  }

  next()
}

module.exports = {
  authenticate,
  optionalAuth
}


