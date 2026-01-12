let { 
  AppError, 
  ValidationError, 
  NotFoundError, 
  UnauthorizedError, 
  ForbiddenError,
  BadRequestError 
} = require('../utils/errors');
let config = require('../config/env');

// Error logger
let logError = (err, req) => {
  let errorLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: req.ip,
    userId: req.user?.id,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
  }
  console.error('Error:', JSON.stringify(errorLog, null, 2));
}

let notFoundHandler = (req, res, next) => {
  let error = NotFoundError(`Route ${req.originalUrl} not found`)
  next(error)
}

let errorHandler = (err, req, res, next) => {
  logError(err, req)
  let statusCode = err.statusCode || 500
  let message = err.message || 'Internal Server Error'
  let errors = err.errors || null

  if (err.name === 'ValidationError') {
    statusCode = 400
    message = 'Validation Error'
    errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message,
    }))
  }

  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format'
  }

  if (err.code === 11000) {
    statusCode = 409
    message = 'Duplicate field value'
    const field = Object.keys(err.keyValue)[0]
    errors = [{
      field,
      message: `${field} already exists`,
    }]
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401
    message = 'Invalid token'
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401
    message = 'Token expired'
  }

  if (err.name === 'MongooseError') {
    statusCode = 400
    message = 'Database validation error'
  }

  // Send error response
  const response = {
    success: false,
    message,
    ...(errors && { errors }),
    ...(config.isDevelopment && { stack: err.stack }),
  };

  res.status(statusCode).json(response);
};

// Async handler wrapper to catch errors in async route handlers
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // In production, you might want to gracefully shutdown the server
  if (config.isProduction) {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // In production, gracefully shutdown
  if (config.isProduction) {
    process.exit(1);
  }
});

module.exports = {
  notFoundHandler,
  errorHandler,
  asyncHandler,
  logError,
};