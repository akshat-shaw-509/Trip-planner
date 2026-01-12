let jwt = require('jsonwebtoken')
let User = require('../models/User.model')
let config = require('../config/env')
let { UnauthorizedError } = require('../utils/errors')

let getTokenFromHeader = (req) => {
  let authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer')) return null
  return authHeader.split(' ')[1]
}

let authenticate = async (req, res, next) => {
  try {
    let token = getTokenFromHeader(req)
    
    if (!token) {
      return UnauthorizedError('No token provided')
    }

    let decoded = jwt.verify(token, config.jwt.secret)
    let user = await User.findById(decoded.id).select('-password')

    if (!user) {
      return UnauthorizedError('User not found')
    }

    if (!user.isActive) {
      return UnauthorizedError('User account is inactive')
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
    if (error.statusCode) {
      return next(error)
    }
    next(UnauthorizedError('Authentication failed'))
  }
}

let authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user?.role || !roles.includes(req.user.role)) {
      return next(UnauthorizedError('Insufficient permissions'))
    }
    next()
  }
}

let optionalAuth = async (req, res, next) => {
  try {
    let token = getTokenFromHeader(req)
    if (!token) return next()
    
    let decoded = jwt.verify(token, config.jwt.secret)
    let user = await User.findById(decoded.id).select('-password')
    
    if (user && user.isActive) {
      req.user = user
    }
  } catch (error) {
    // Silently ignore invalid/expired tokens for optional auth
  }
  next()
}

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
}