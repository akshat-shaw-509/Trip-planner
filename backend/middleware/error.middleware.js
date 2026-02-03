const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    statusCode: 404
  })
}

const errorHandler = (err, req, res, next) => {
  // Log validation errors for debugging
  if (err.name === 'ValidationError' && err.errors) {
    console.error('Validation Errors:');
    Object.keys(err.errors).forEach(key => {
      console.error(`  ${key}:`, err.errors[key].message);
    });
  } else if (err.statusCode >= 500) {
    // Only log server errors
    console.error('Server Error:', err.message);
    if (process.env.NODE_ENV === 'development') {
      console.error(err.stack);
    }
  }
  
  let statusCode = err.statusCode || 500
  let message = err.message || 'Internal Server Error'

  //Mongoose Validation Errors
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
      errors
    });
  }

  //Invalid MongoDB ObjectId 
  if (err.name === 'CastError') {
    statusCode = 400
    message = `Invalid ${err.path}: ${err.value}`
  }

  //Duplicate Key Error
  if (err.code === 11000) {
    statusCode = 409
    const field = Object.keys(err.keyPattern)[0];
    message = `${field} already exists`
  }

  //JWT Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401
    message = 'Invalid token'
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401
    message = 'Token expired'
  }

  const response = {
    success: false,
    message,
    statusCode
  }
  if (err.errors && Array.isArray(err.errors)) {
    response.errors = err.errors
  }
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack
  }
  res.status(statusCode).json(response)
}

 //Wraps async route handlers to automatically catch errors
const asyncHandler = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next)
  }
}

module.exports = {
  notFoundHandler,
  errorHandler,
  asyncHandler
}
