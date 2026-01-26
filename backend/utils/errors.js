
let createAppError = (message, statusCode) => {
  let error = new Error(message)
  error.statusCode = statusCode
  error.status = statusCode.toString().startsWith('4') ? 'fail' : 'error'
  error.isOperational = true
  Error.captureStackTrace(error, createAppError)
  return error
}

let ValidationError = (message = 'Validation failed', errors = null) => {
  const error = createAppError(message, 400)
  error.errors = errors
  throw error
}

let TooManyRequestsError = (message = 'Too many requests') => {
  throw createAppError(message, 429)
}

let UnauthorizedError = (message = 'Unauthorized') => {
  throw createAppError(message, 401)
}

let ForbiddenError = (message = 'Forbidden') => {
  throw createAppError(message, 403)
}

let NotFoundError = (message = 'Resource not found') => {
  throw createAppError(message, 404)
}

let ConflictError = (message = 'Conflict') => {
  throw createAppError(message, 409)
}

let BadRequestError = (message = 'Bad Request') => {
  throw createAppError(message, 400)
}


module.exports = {
  ValidationError,
  TooManyRequestsError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  BadRequestError
}