let bcrypt = require('bcryptjs')
let User = require('../models/User.model')
let jwtUtils = require('../utils/jwt')
let {
  UnauthorizedError,
  ValidationError,
  ConflictError,
  NotFoundError
} = require('../utils/errors')

let register = async (userData) => {
  let { name, email, password } = userData
  
  if (!name || !email || !password) {
    throw ValidationError('Name, email and password are required')
  }
  
  if (password.length < 8) {
    throw ValidationError('Password must be at least 8 characters long')
  }
  
  // Check if email exists
  let existingUser = await User.findOne({ email: email.toLowerCase() })
  if (existingUser) {
    throw ConflictError('Email already registered')
  }
  
  // Create user (password will be hashed by User model pre-save hook)
  let user = await User.create({
    name,
    email: email.toLowerCase(),
    password
  })
  
  // Generate tokens
  let accessToken = jwtUtils.generateAccessToken(user._id.toString())
  let refreshToken = jwtUtils.generateRefreshToken(user._id.toString())
  
  // Remove password from response
  let userObject = user.toObject()
  delete userObject.password
  
  return {
    user: userObject,
    accessToken,
    refreshToken
  }
}

let login = async (email, password) => {
  if (!email || !password) {
    throw ValidationError('Email and password are required')
  }
  
  // Find user with password
  let user = await User.findOne({ email: email.toLowerCase() }).select('+password')
  
  if (!user) {
    throw UnauthorizedError('Invalid email or password')
  }
  
  // Check password
  let isPasswordValid = await user.comparePassword(password)
  if (!isPasswordValid) {
    throw UnauthorizedError('Invalid email or password')
  }
  
  // Check if user is active
  if (!user.isActive) {
    throw UnauthorizedError('Account is deactivated')
  }
  
  // Generate tokens
  let accessToken = jwtUtils.generateAccessToken(user._id.toString())
  let refreshToken = jwtUtils.generateRefreshToken(user._id.toString())
  
  // Remove password from response
  let userObject = user.toObject()
  delete userObject.password
  
  return {
    user: userObject,
    accessToken,
    refreshToken
  }
}

let refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    throw ValidationError('Refresh token is required')
  }
  
  try {
    let decoded = jwtUtils.verifyRefreshToken(refreshToken)
    
    // Check if user still exists
    let user = await User.findById(decoded.id)
    if (!user || !user.isActive) {
      throw UnauthorizedError('User not found or inactive')
    }
    
    // Generate new access token
    let accessToken = jwtUtils.generateAccessToken(user._id.toString())
    
    return { accessToken }
  } catch (error) {
    throw UnauthorizedError('Invalid or expired refresh token')
  }
}

let logout = async (userId) => {
  // Verify user exists
  let user = await User.findById(userId)
  if (!user) {
    throw NotFoundError('User not found')
  }
  
  // In a stateless JWT system, logout is handled client-side
  // Here we just confirm the action
  return { message: 'Logged out successfully' }
}

let forgotPassword = async (email) => {
  if (!email) {
    throw ValidationError('Email is required')
  }
  
  let user = await User.findOne({ email: email.toLowerCase() })
  
  // Don't reveal if user exists (security best practice)
  if (!user) {
    return { message: 'If email exists, reset link will be sent' }
  }
  
  // Generate reset token (expires in 1 hour)
  let resetToken = user.createPasswordResetToken()
  await user.save({ validateBeforeSave: false })
  
  return {
    resetToken,
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name
    }
  }
}

let resetPassword = async (token, newPassword) => {
  if (!token || !newPassword) {
    throw ValidationError('Token and new password are required')
  }
  
  if (newPassword.length < 8) {
    throw ValidationError('Password must be at least 8 characters long')
  }
  
  // Hash the token to compare with stored hash
  let crypto = require('crypto')
  let hashedToken = crypto.createHash('sha256').update(token).digest('hex')
  
  // Find user with valid token
  let user = await User.findOne({
    resetPasswordHash: hashedToken,
    resetPasswordExpires: { $gt: Date.now() }
  })
  
  if (!user) {
    throw UnauthorizedError('Invalid or expired reset token')
  }
  
  // Update password (will be hashed by pre-save hook)
  user.password = newPassword
  user.resetPasswordHash = undefined
  user.resetPasswordExpires = undefined
  await user.save()
  
  // Generate new tokens
  let accessToken = jwtUtils.generateAccessToken(user._id.toString())
  let refreshToken = jwtUtils.generateRefreshToken(user._id.toString())
  
  return {
    message: 'Password reset successful',
    accessToken,
    refreshToken
  }
}

let changePassword = async (userId, currentPassword, newPassword) => {
  if (!userId || !currentPassword || !newPassword) {
    throw ValidationError('User ID, current password, and new password are required')
  }
  
  if (newPassword.length < 8) {
    throw ValidationError('New password must be at least 8 characters long')
  }
  
  if (currentPassword === newPassword) {
    throw ValidationError('New password must be different from current password')
  }
  
  // Get user with password
  let user = await User.findById(userId).select('+password')
  if (!user) {
    throw NotFoundError('User not found')
  }
  
  // Verify current password
  let isPasswordValid = await user.comparePassword(currentPassword)
  if (!isPasswordValid) {
    throw UnauthorizedError('Current password is incorrect')
  }
  
  // Update password
  user.password = newPassword
  await user.save()
  
  return { message: 'Password changed successfully' }
}

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
  forgotPassword,
  resetPassword,
  changePassword
}