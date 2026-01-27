
let User = require('../models/User.model')
let RefreshToken = require('../models/RefreshToken.model')
let AuditLog = require('../models/AuditLog.model')

// JWT utility functions (access & refresh tokens)
let jwtUtils = require('../utils/jwt')

// Crypto -> used for secure token generation & hashing
let crypto = require('crypto')

/**
 * -------------------- Helper Utilities --------------------
 */

/**
 * Create a custom error with status code
 */
let createError = (message, statusCode) => {
  let error = new Error(message)
  error.statusCode = statusCode
  return error
}

/**
 * Create an audit log entry
 * Used for tracking sensitive actions (login, register, etc.)
 */
let createAudit = async (userId, action, req, details = {}) => {
  try {
    await AuditLog.create({
      user: userId,
      action,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      details
    })
  } catch (err) {
    // Audit failures should not break main flow
    console.error('Audit log failed:', err)
  }
}

/**
 * Generate and persist a refresh token
 */
let saveRefreshToken = async (userId) => {
  // Generate refresh token
  let token = jwtUtils.generateRefreshToken(userId.toString())

  // Decode token to extract expiry
  let decoded = jwtUtils.verifyRefreshToken(token)

  // Save token in DB
  await RefreshToken.create({
    token,
    user: userId,
    expiresAt: new Date(decoded.exp * 1000)
  })

  return token
}

/**
 * -------------------- Auth Service Functions --------------------
 */

/**
 * Register a new user
 */
let register = async (userData, req) => {
  let { name, email, password } = userData
  
  // Basic validation
  if (!name || !email || !password) {
    throw createError('Name, email and password are required', 400)
  }

  // Minimum password length check
  if (password.length < 8) {
    throw createError('Password must be at least 8 characters long', 400)
  }

  /**
   * Password strength validation
   */
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

  // Check if email already exists
  let existingUser = await User.findOne({ email: email.toLowerCase() })
  if (existingUser) {
    throw createError('Email already registered', 409)
  }

  // Generate email verification token
  let verificationToken = crypto.randomBytes(32).toString('hex')

  // Create user
  let user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    verificationToken
  })

  // Audit registration event
  await createAudit(user._id, 'REGISTER', req)

  // Generate auth tokens
  let accessToken = jwtUtils.generateAccessToken(user._id.toString())
  let refreshToken = await saveRefreshToken(user._id)

  let userObject = user.toObject()

  return {
    user: userObject,
    accessToken,
    refreshToken,
    requiresVerification: true
  }
}

/**
 * Login user with email and password
 */
let login = async (email, password, req) => {
  if (!email || !password) {
    throw createError('Email and password are required', 400)
  }

  // Fetch user including password
  let user = await User.findOne({ email: email.toLowerCase() }).select('+password')

  if (!user) {
    console.log('Login Failed: User not found for email:', email.toLowerCase())
    throw createError('Invalid email or password', 401)
  }

  // Account lock check (if enabled)
  if (user.isLocked) {
    console.log('Login Failed: Account locked for email:', email.toLowerCase())
    throw createError('Account locked due to too many failed attempts. Try again later.', 429)
  }

  // Active status check
  if (!user.isActive) {
    console.log('Login Failed: Account inactive for email:', email.toLowerCase())
    throw createError('Account is deactivated', 401)
  }

  console.log('Attempting login for:', email.toLowerCase())

  // Password verification
  let isPasswordValid = await user.comparePassword(password)

  if (!isPasswordValid) {
    console.log('Login Failed: Password mismatch for email:', email.toLowerCase())
    throw createError('Invalid email or password', 401)
  }

  console.log('Login Success for:', email.toLowerCase())

  // Generate new tokens
  let accessToken = jwtUtils.generateAccessToken(user._id.toString())
  let refreshToken = await saveRefreshToken(user._id)

  // Audit successful login
  await createAudit(user._id, 'LOGIN_SUCCESS', req)

  let userObject = user.toObject()

  return {
    user: userObject,
    accessToken,
    refreshToken
  }
}

/**
 * Refresh access token using refresh token
 */
let refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    throw createError('Refresh token is required', 400)
  }

  try {
    // Verify refresh token
    let decoded = jwtUtils.verifyRefreshToken(refreshToken)

    // Check token existence in DB
    let tokenDoc = await RefreshToken.findOne({ token: refreshToken })
    if (!tokenDoc) {
      throw createError('Invalid session (Token revoked)', 401)
    }

    // Validate user
    let user = await User.findById(decoded.id)
    if (!user || !user.isActive) {
      throw createError('User not found or inactive', 401)
    }

    // Rotate tokens (delete old, issue new)
    await RefreshToken.deleteOne({ _id: tokenDoc._id })

    let newAccessToken = jwtUtils.generateAccessToken(user._id.toString())
    let newRefreshToken = await saveRefreshToken(user._id)

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    }
  } catch (error) {
    if (error.statusCode) throw error
    throw createError('Invalid or expired refresh token', 401)
  }
}

/**
 * Logout user by revoking refresh token
 */
let logout = async (userId, refreshToken) => {
  if (!refreshToken) {
    throw createError('Refresh token is required', 400)
  }

  await RefreshToken.deleteOne({ token: refreshToken })

  return { message: 'Logged out successfully' }
}

/**
 * Verify user email
 */
let verifyEmail = async (token) => {
  if (!token) {
    throw createError('Verification token is required', 400)
  }

  // Hash token for comparison
  let hashedToken = crypto.createHash('sha256').update(token).digest('hex')

  let user = await User.findOne({ verificationToken: hashedToken })
  if (!user) {
    throw createError('Invalid or expired verification token', 400)
  }

  user.isVerified = true
  user.verificationToken = undefined
  await user.save()

  return { message: 'Email verified successfully' }
}

/**
 * Initiate password reset flow
 */
let forgotPassword = async (email) => {
  let user = await User.findOne({ email: email.toLowerCase() })
  
  if (!user) {
    return { message: 'If email exists, reset link will be sent' }
  }
  
  let resetToken = user.createPasswordResetToken()  // ← This creates a hashed token
  await user.save({ validateBeforeSave: false })
  
  return { resetToken }  // ← Returns the ORIGINAL token, but this isn't being sent anywhere!
}

/**
 * Reset password using token
 */
let resetPassword = async (token, newPassword) => {
  let hashedToken = crypto.createHash('sha256').update(token).digest('hex')

  let user = await User.findOne({
    resetPasswordHash: hashedToken,
    resetPasswordExpires: { $gt: Date.now() }
  })

  if (!user) {
    throw createError('Invalid or expired reset token', 401)
  }

  user.password = newPassword
  user.resetPasswordHash = undefined
  user.resetPasswordExpires = undefined
  await user.save()

  // Invalidate all sessions
  await RefreshToken.deleteMany({ user: user._id })

  let accessToken = jwtUtils.generateAccessToken(user._id.toString())
  let refreshToken = await saveRefreshToken(user._id)

  return {
    message: 'Password reset successful',
    accessToken,
    refreshToken
  }
}

/**
 * Change password for logged-in user
 */
let changePassword = async (userId, currentPassword, newPassword) => {
  let user = await User.findById(userId).select('+password')
  if (!user) {
    throw createError('User not found', 404)
  }

  let isPasswordValid = await user.comparePassword(currentPassword)
  if (!isPasswordValid) {
    throw createError('Current password is incorrect', 401)
  }

  user.password = newPassword
  await user.save()

  // Revoke all active refresh tokens
  await RefreshToken.deleteMany({ user: userId })

  return { message: 'Password changed successfully' }
}

/**
 * Export auth service methods
 */
module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
  verifyEmail,
  forgotPassword,
  resetPassword,
  changePassword
}
