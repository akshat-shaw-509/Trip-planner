/**
 * -------------------- 404 Handler --------------------
 * Handles requests to routes that do not exist
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    statusCode: 404
  })
}

/**
 * -------------------- Global Error Handler --------------------
 * Centralized error handler for the entire application
 */
const errorHandler = (err, req, res, next) => {
  // ✅ ENHANCED: Log detailed error information
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('❌ GLOBAL ERROR HANDLER');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('Error Name:', err.name);
  console.error('Error Message:', err.message);
  console.error('Error Code:', err.code);
  console.error('Error Status:', err.statusCode);
  
  // Log Mongoose validation errors in detail
  if (err.name === 'ValidationError' && err.errors) {
    console.error('Validation Errors:');
    Object.keys(err.errors).forEach(key => {
      console.error(`  ❌ ${key}:`, err.errors[key].message);
    });
  }
  
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Default values
  let statusCode = err.statusCode || 500
  let message = err.message || 'Internal Server Error'

  /**
   * -------- Mongoose Validation Errors --------
   * ✅ ENHANCED: Return detailed field errors
   */
  if (err.name === 'ValidationError') {
    statusCode = 400
    message = 'Validation Error'
    
    // Extract detailed validation errors
    const errors = Object.keys(err.errors).map(key => ({
      field: key,
      message: err.errors[key].message
    }));
    
    return res.status(statusCode).json({
      success: false,
      message,
      statusCode,
      errors // ← CRITICAL: Return detailed errors
    });
  }

  /**
   * -------- Invalid MongoDB ObjectId --------
   */
  if (err.name === 'CastError') {
    statusCode = 400
    message = `Invalid ${err.path}: ${err.value}`
  }

  /**
   * -------- Duplicate Key Error --------
   */
  if (err.code === 11000) {
    statusCode = 409
    const field = Object.keys(err.keyPattern)[0];
    message = `${field} already exists`
  }

  /**
   * -------- JWT Errors --------
   */
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401
    message = 'Invalid token'
  }

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

  // ✅ ENHANCED: Attach any validation errors
  if (err.errors && Array.isArray(err.errors)) {
    response.errors = err.errors
  }

  // Include stack trace only in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack
  }

  res.status(statusCode).json(response)
}

/**
 * -------------------- Async Handler Utility --------------------
 * Wraps async route handlers to automatically catch errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

module.exports = {
  notFoundHandler,
  errorHandler,
  asyncHandler
}
