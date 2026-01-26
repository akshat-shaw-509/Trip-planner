<<<<<<< HEAD
/**
 * -------------------- 404 Handler --------------------
 * Handles requests to routes that do not exist
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    // Show which route was not found
    message: `Route ${req.originalUrl} not found`,
    statusCode: 404
  })
}

/**
 * -------------------- Global Error Handler --------------------
 * Centralized error handler for the entire application
 * Catches:
 * - Validation errors
 * - Database errors
 * - Auth errors
 * - Custom application errors
 */
const errorHandler = (err, req, res, next) => {
  // Log error for debugging and monitoring
  console.error('Global Error Handler:', err)

  // Default values (fallback)
  let statusCode = err.statusCode || 500
  let message = err.message || 'Internal Server Error'

  /**
   * -------- Specific Error Handling --------
   */

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400
    message = 'Validation Error'
  }

  // Invalid MongoDB ObjectId
  if (err.name === 'CastError') {
    statusCode = 400
    message = 'Invalid ID format'
  }

  // Duplicate key error (unique field violation)
  if (err.code === 11000) {
    statusCode = 409
    message = 'Duplicate field value entered'
  }

  // JWT errors (invalid token)
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401
    message = 'Invalid token'
  }

  // JWT expired token
  if (err.name === 'TokenExpiredError') {
    statusCode = 401
    message = 'Token expired'
  }

  /**
   * -------- Response Builder --------
   */
  const response = {
    success: false,
    message,
    statusCode
  }

  // Attach validation error details if present
  if (err.errors && Array.isArray(err.errors)) {
    response.errors = err.errors
  }

  // Include stack trace only in development mode
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack
  }

  res.status(statusCode).json(response)
}

/**
 * -------------------- Async Handler Utility --------------------
 * Wraps async route handlers to automatically catch errors
 *
 * Usage:
 * router.get('/route', asyncHandler(async (req, res) => { ... }))
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * Export error-handling utilities
 */
module.exports = {
  notFoundHandler,
  errorHandler,
  asyncHandler
}
=======
/**
 * -------------------- 404 Handler --------------------
 * Handles requests to routes that do not exist
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    // Show which route was not found
    message: `Route ${req.originalUrl} not found`,
    statusCode: 404
  })
}

/**
 * -------------------- Global Error Handler --------------------
 * Centralized error handler for the entire application
 * Catches:
 * - Validation errors
 * - Database errors
 * - Auth errors
 * - Custom application errors
 */
const errorHandler = (err, req, res, next) => {
  // Log error for debugging and monitoring
  console.error('Global Error Handler:', err)

  // Default values (fallback)
  let statusCode = err.statusCode || 500
  let message = err.message || 'Internal Server Error'

  /**
   * -------- Specific Error Handling --------
   */

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400
    message = 'Validation Error'
  }

  // Invalid MongoDB ObjectId
  if (err.name === 'CastError') {
    statusCode = 400
    message = 'Invalid ID format'
  }

  // Duplicate key error (unique field violation)
  if (err.code === 11000) {
    statusCode = 409
    message = 'Duplicate field value entered'
  }

  // JWT errors (invalid token)
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401
    message = 'Invalid token'
  }

  // JWT expired token
  if (err.name === 'TokenExpiredError') {
    statusCode = 401
    message = 'Token expired'
  }

  /**
   * -------- Response Builder --------
   */
  const response = {
    success: false,
    message,
    statusCode
  }

  // Attach validation error details if present
  if (err.errors && Array.isArray(err.errors)) {
    response.errors = err.errors
  }

  // Include stack trace only in development mode
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack
  }

  res.status(statusCode).json(response)
}

/**
 * -------------------- Async Handler Utility --------------------
 * Wraps async route handlers to automatically catch errors
 *
 * Usage:
 * router.get('/route', asyncHandler(async (req, res) => { ... }))
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * Export error-handling utilities
 */
module.exports = {
  notFoundHandler,
  errorHandler,
  asyncHandler
}
>>>>>>> 0007615a5a7317e8689fc9727726ee86c5585786
