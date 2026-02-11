let User = require('../models/User.model')
let jwtUtils = require('../utils/jwt')

let createError = (message, statusCode) => {
  let error = new Error(message)
  error.statusCode = statusCode
  return error
}

//Register a new user
let register = async (userData) => {
  let { name, email, password } = userData

  if (!name || !email || !password) {
    throw createError('Name, email and password are required', 400)
  }

  // Minimum password length
  if (password.length < 8) {
    throw createError('Password must be at least 8 characters long', 400)
  }

  // Password strength rules
  let passwordErrors = []
  if (!/[A-Z]/.test(password)) passwordErrors.push('Password must contain at least 1 uppercase letter')
  if (!/[a-z]/.test(password)) passwordErrors.push('Password must contain at least 1 lowercase letter')
  if (!/[0-9]/.test(password)) passwordErrors.push('Password must contain at least 1 number')
  if (!/[@$!%*?&]/.test(password)) passwordErrors.push('Password must contain at least 1 special character (@$!%*?&)')

  if (passwordErrors.length > 0) {
    let error = createError('Password does not meet requirements', 400)
    error.errors = passwordErrors.map(msg => ({
      field: 'password',
      message: msg
    }))
    throw error
  }
  // prevent duplicate emails
  let existingUser = await User.findOne({ email: email.toLowerCase() }).lean()
  if (existingUser) {
    throw createError('Email already registered', 409)
  }

  let user = await User.create({
    name,
    email: email.toLowerCase(),
    password
  })

  let accessToken = jwtUtils.generateAccessToken(user._id.toString())
  let refreshToken = jwtUtils.generateRefreshToken(user._id.toString())

  let userObject = user.toObject()
  delete userObject.password

  return {
    user: userObject,
    accessToken,
    refreshToken
  }
}

// Login
let login = async (email, password) => {
  if (!email || !password) {
    throw createError('Email and password are required', 400)
  }

  let user = await User.findOne({ email: email.toLowerCase() })
    .select('+password name email role')

  if (!user) {
    throw createError('Invalid email or password', 401)
  }

  let isPasswordValid = await user.comparePassword(password)
  if (!isPasswordValid) {
    throw createError('Invalid email or password', 401)
  }

  let accessToken = jwtUtils.generateAccessToken(user._id.toString())
  let refreshToken = jwtUtils.generateRefreshToken(user._id.toString())

  let userObject = user.toObject()
  delete userObject.password

  return {
    user: userObject,
    accessToken,
    refreshToken
  }
}

//Generate a new access token using refresh token
let refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    throw createError('Refresh token is required', 400)
  }

  try {
    let decoded = jwtUtils.verifyRefreshToken(refreshToken)
    let newAccessToken = jwtUtils.generateAccessToken(decoded.id.toString())

    return { accessToken: newAccessToken }
  } catch (err) {
    throw createError('Invalid or expired refresh token', 401)
  }
}

//Logout
let logout = async () => {
  return { message: 'Logged out successfully' }
}

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout
}
