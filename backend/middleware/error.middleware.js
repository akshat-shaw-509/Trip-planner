// middleware/error.middleware.js

// 404 Handler - for routes that don't exist
let notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    statusCode: 404
  })
}

// Global Error Handler - catches all errors
let errorHandler = (err, req, res, next) => {
  console.error('Global Error Handler:', err)

  // Default to 500 if no status code
  let statusCode = err.statusCode || 500
  let message = err.message || 'Internal Server Error'

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400
    message = 'Validation Error'
  }

  if (err.name === 'CastError') {
    statusCode = 400
    message = 'Invalid ID format'
  }

  if (err.code === 11000) {
    statusCode = 409
    message = 'Duplicate field value entered'
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401
    message = 'Invalid token'
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401
    message = 'Token expired'
  }

  // Build response
  let response = {
    success: false,
    message,
    statusCode
  }

  // Include validation errors if present
  if (err.errors && Array.isArray(err.errors)) {
    response.errors = err.errors
  }

  // In development, include stack trace
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack
  }

  res.status(statusCode).json(response)
}

// Async wrapper (optional - for routes that need it)
let asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

module.exports = {
  notFoundHandler,
  errorHandler,
  asyncHandler
}