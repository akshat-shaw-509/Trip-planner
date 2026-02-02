let User = require('../models/User.model')
let jwtUtils = require('../utils/jwt')

let createError = (message, statusCode) => {
  let error = new Error(message)
  error.statusCode = statusCode
  return error
}

/**
 * -------------------- Register --------------------
 */
let register = async (userData) => {
  let { name, email, password } = userData

  if (!name || !email || !password) {
    throw createError('Name, email and password are required', 400)
  }

  // Minimum password length
  if (password.length < 8) {
    throw createError('Password must be at least 8 characters long', 400)
  }

  // Password strength rules (KEPT as requested)
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

/**
 * -------------------- Login --------------------
 */
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

/**
 * -------------------- Refresh Access Token --------------------
 * (NO DB, NO rotation)
 */
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

/**
 * -------------------- Logout --------------------
 * (Client-side token discard)
 */
let logout = async () => {
  return { message: 'Logged out successfully' }
}

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout
}
