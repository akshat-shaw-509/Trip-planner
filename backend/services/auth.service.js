// services/auth.service.js
let User = require('../models/User.model')
let RefreshToken = require('../models/RefreshToken.model')
let AuditLog = require('../models/AuditLog.model')
let jwtUtils = require('../utils/jwt')
let crypto = require('crypto')

// Helper: Create custom error
let createError = (message, statusCode) => {
  let error = new Error(message)
  error.statusCode = statusCode
  return error
}

// Helper: Create Audit Log
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
    console.error('Audit log failed:', err)
  }
}

// Helper: Generate Refresh Token Document
let saveRefreshToken = async (userId) => {
  let token = jwtUtils.generateRefreshToken(userId.toString())
  let decoded = jwtUtils.verifyRefreshToken(token)
  await RefreshToken.create({
    token,
    user: userId,
    expiresAt: new Date(decoded.exp * 1000)
  })
  return token
}

let register = async (userData, req) => {
  let { name, email, password } = userData
  
  // Validation
  if (!name || !email || !password) {
    throw createError('Name, email and password are required', 400)
  }
  
  if (password.length < 8) {
    throw createError('Password must be at least 8 characters long', 400)
  }
  
  // Check password strength
  let passwordErrors = []
  if (!/[A-Z]/.test(password)) passwordErrors.push('Password must contain at least 1 uppercase letter')
  if (!/[a-z]/.test(password)) passwordErrors.push('Password must contain at least 1 lowercase letter')
  if (!/[0-9]/.test(password)) passwordErrors.push('Password must contain at least 1 number')
  if (!/[@$!%*?&]/.test(password)) passwordErrors.push('Password must contain at least 1 special character (@$!%*?&)')
  
  if (passwordErrors.length > 0) {
    let error = createError('Password does not meet requirements', 400)
    error.errors = passwordErrors.map(msg => ({ field: 'password', message: msg }))
    throw error
  }
  
  // Check if email already exists
  let existingUser = await User.findOne({ email: email.toLowerCase() })
  if (existingUser) {
    throw createError('Email already registered', 409)
  }
  
  // Create verification token
  let verificationToken = crypto.randomBytes(32).toString('hex')
  
  let user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    verificationToken
  })
  
  await createAudit(user._id, 'REGISTER', req)

  // Generate tokens
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

let login = async (email, password, req) => {
  if (!email || !password) {
    throw createError('Email and password are required', 400)
  }
  
  let user = await User.findOne({ email: email.toLowerCase() }).select('+password')
  
  if (!user) {
    console.log('Login Failed: User not found for email:', email.toLowerCase())
    throw createError('Invalid email or password', 401)
  }
  
  // Check Lockout
  if (user.isLocked) {
    console.log('Login Failed: Account locked for email:', email.toLowerCase())
    throw createError('Account locked due to too many failed attempts. Try again later.', 429)
  }

  if (!user.isActive) {
    console.log('Login Failed: Account inactive for email:', email.toLowerCase())
    throw createError('Account is deactivated', 401)
  }

  console.log('Attempting login for:', email.toLowerCase())

  let isPasswordValid = await user.comparePassword(password)
  
  if (!isPasswordValid) {
    console.log('Login Failed: Password mismatch for email:', email.toLowerCase())
    throw createError('Invalid email or password', 401)
  }

  console.log('Login Success for:', email.toLowerCase())
  
  // Successful login - reset attempts
 

  let accessToken = jwtUtils.generateAccessToken(user._id.toString())
  let refreshToken = await saveRefreshToken(user._id)
  
  await createAudit(user._id, 'LOGIN_SUCCESS', req)

  let userObject = user.toObject()
  return {
    user: userObject,
    accessToken,
    refreshToken
  }
}

let refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    throw createError('Refresh token is required', 400)
  }
  
  try {
    let decoded = jwtUtils.verifyRefreshToken(refreshToken)
    let tokenDoc = await RefreshToken.findOne({ token: refreshToken })
    
    if (!tokenDoc) {
      throw createError('Invalid session (Token revoked)', 401)
    }
    
    let user = await User.findById(decoded.id)
    if (!user || !user.isActive) {
      throw createError('User not found or inactive', 401)
    }
    
    // Rotate tokens
    await RefreshToken.deleteOne({ _id: tokenDoc._id })
    let newAccessToken = jwtUtils.generateAccessToken(user._id.toString())
    let newRefreshToken = await saveRefreshToken(user._id)
    
    return { accessToken: newAccessToken, refreshToken: newRefreshToken }
  } catch (error) {
    if (error.statusCode) throw error
    throw createError('Invalid or expired refresh token', 401)
  }
}

let logout = async (userId, refreshToken) => {
  if (!refreshToken) {
    throw createError('Refresh token is required', 400)
  }
  await RefreshToken.deleteOne({ token: refreshToken })
  return { message: 'Logged out successfully' }
}

let verifyEmail = async (token) => {
  if (!token) {
    throw createError('Verification token is required', 400)
  }
  
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

let forgotPassword = async (email) => {
  let user = await User.findOne({ email: email.toLowerCase() })
  if (!user) return { message: 'If email exists, reset link will be sent' }
  
  let resetToken = user.createPasswordResetToken()
  await user.save({ validateBeforeSave: false })
  
  return { resetToken } 
}

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
  
  await RefreshToken.deleteMany({ user: user._id })
  
  let accessToken = jwtUtils.generateAccessToken(user._id.toString())
  let refreshToken = await saveRefreshToken(user._id)
  
  return { message: 'Password reset successful', accessToken, refreshToken }
}

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
  
  await RefreshToken.deleteMany({ user: userId })
  return { message: 'Password changed successfully' }
}

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