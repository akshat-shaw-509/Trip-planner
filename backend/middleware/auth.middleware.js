const jwt = require('jsonwebtoken')
const User = require('../models/User.model')
const config = require('../config/env')
const { UnauthorizedError } = require('../utils/errors')
// Extract bearer token from Authorization header
const getTokenFromHeader = (req) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  return authHeader.split(' ')[1]
}
// Authentication
const authenticate = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req)
    if (!token) {
      throw new UnauthorizedError('No token provided')
    }
    let decoded
    try {
      decoded = jwt.verify(token, config.jwt.secret)
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Token expired')
      }
      throw new UnauthorizedError('Invalid token')
    }

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
    next(error)
  }
}
// Attach user if token is present, otherwise continue
const optionalAuth = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req)
    if (!token) return next()
    try {
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
      // Ignore errors
    }
    next()
  } catch (error) {
    next(error)
  }
}

module.exports = {
  authenticate,
  optionalAuth
}
