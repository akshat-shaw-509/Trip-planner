let User = require('../models/User.model')
let RefreshToken = require('../models/RefreshToken.model')
let AuditLog = require('../models/AuditLog.model')
const emailService = require('../services/email.service')
let jwtUtils = require('../utils/jwt')
let crypto = require('crypto')

let createError = (message, statusCode) => {
  let error = new Error(message)
  error.statusCode = statusCode
  return error
}

//Audit log entry
 //Used for tracking sensitive actions (login, register, etc.)
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

//Generate and persist a refresh token
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

//Auth Service Functions 
//Register a new user
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
  //Password strength validation
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
  let verificationToken = crypto.randomBytes(32).toString('hex')
  let hashedVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex')
  // Create user
  let user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    verificationToken: hashedVerificationToken
  })
  //Run audit log and token generation in parallel
  const [_, refreshToken] = await Promise.all([
    createAudit(user._id, 'REGISTER', req), 
    saveRefreshToken(user._id)
  ])

  // Generate access token
  let accessToken = jwtUtils.generateAccessToken(user._id.toString())
  //Convert to plain object and remove sensitive fields
  let userObject = user.toObject()
  delete userObject.password
  delete userObject.verificationToken

  return {
    user: userObject,
    accessToken,
    refreshToken,
    verificationToken, 
    requiresVerification: true
  }
}

//Login user with email and password
let login = async (email, password, req) => {
  if (!email || !password) {
    throw createError('Email and password are required', 400)
  }
  let user = await User.findOne({ email: email.toLowerCase() })
    .select('+password name email role isActive isLocked isVerified')
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

  //Generate tokens and audit in parallel
  const [accessToken, refreshToken] = await Promise.all([
    Promise.resolve(jwtUtils.generateAccessToken(user._id.toString())),
    saveRefreshToken(user._id),
    createAudit(user._id, 'LOGIN_SUCCESS', req) // Non-critical
  ])
  //Remove sensitive data
  let userObject = user.toObject()
  delete userObject.password
  return {
    user: userObject,
    accessToken,
    refreshToken
  }
}

//Refresh access token using refresh token
let refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    throw createError('Refresh token is required', 400)
  }
  try {
    // Verify refresh token
    let decoded = jwtUtils.verifyRefreshToken(refreshToken)
    const [tokenDoc, user] = await Promise.all([
      RefreshToken.findOne({ token: refreshToken }).lean(),
      User.findById(decoded.id)
        .select('isActive role name email')
        .lean()
    ])
    if (!tokenDoc) {
      throw createError('Invalid session (Token revoked)', 401)
    }
    if (!user || !user.isActive) {
      throw createError('User not found or inactive', 401)
    }
    const [_, newRefreshToken] = await Promise.all([
      RefreshToken.deleteOne({ _id: tokenDoc._id }),
      saveRefreshToken(user._id || decoded.id)
    ])
    let newAccessToken = jwtUtils.generateAccessToken((user._id || decoded.id).toString())
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    }
  } catch (error) {
    if (error.statusCode) throw error
    throw createError('Invalid or expired refresh token', 401)
  }
}
//Logout user by revoking refresh token
let logout = async (userId, refreshToken) => {
  if (!refreshToken) {
    throw createError('Refresh token is required', 400)
  }

  await RefreshToken.deleteOne({ token: refreshToken })

  return { message: 'Logged out successfully' }
}

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
}
