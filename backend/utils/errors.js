let createAppError = (message, statusCode) => {
  let error = new Error(message)
  error.statusCode = statusCode
  error.status = statusCode.toString().startsWith('4') ? 'fail' : 'error'
  error.isOperational = true
  
  // Clean stack trace (intermediate intern optimization)
  Error.captureStackTrace(error, createAppError)
  return error;
}

let ValidationError = (message = 'Validation failed', errors = null) => {
  const error = createAppError(message, 400)
  error.errors = errors
  return error
}

let BadRequestError = (message = 'Bad Request') => {
  return createAppError(message, 400)
}

let UnauthorizedError = (message = 'Unauthorized') => {
  return createAppError(message, 401)
}

let ForbiddenError = (message = 'Forbidden') => {
  return createAppError(message, 403)
}

let NotFoundError = (message = 'Resource not found') => {
  return createAppError(message, 404)
}

let ConflictError = (message = 'Conflict') => {
  return createAppError(message, 409)
}

let InternalServerError = (message = 'Internal Server Error') => {
  return createAppError(message, 500)
}

module.exports = {
  ValidationError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError,
}
