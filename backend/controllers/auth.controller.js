// controllers/auth.controller.js
let authService = require('../services/auth.service')
let emailService = require('../services/email.service')
const googleAuthService = require('../services/googleAuth.service')

let sendSuccess = (res, statusCode, data = null, message = null) => {
  let response = { success: true }
  if (data) response.data = data
  if (message) response.message = message
  res.status(statusCode).json(response)
}

let register = async (req, res) => {
  try {
    let result = await authService.register(req.body, req)
    
    // Send Welcome/Verification Email
    emailService.sendVerificationEmail(result.user.email, result.user.verificationToken).catch(err => {
      console.error('Verification email failed:', err)
    })

    // Secure Cookie for Refresh Token
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    // Don't send refreshToken in body, only in cookie
    let { refreshToken, ...responseBody } = result
    sendSuccess(res, 201, responseBody, 'User registered. Please verify email.')
  } catch (error) {
    console.error('Registration error:', error)
    
    // Handle validation errors from express-validator
    if (error.errors && Array.isArray(error.errors)) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      })
    }
    
    // Handle operational errors with statusCode
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      })
    }
    
    // Handle generic errors
    res.status(500).json({
      success: false,
      message: error.message || 'Registration failed'
    })
  }
}

let login = async (req, res) => {
  try {
    let result = await authService.login(req.body.email, req.body.password, req)

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    let { refreshToken, ...responseBody } = result
    sendSuccess(res, 200, responseBody, 'Login successful')
  } catch (error) {
    console.error('Login error:', error)
    res.status(error.statusCode || 401).json({
      success: false,
      message: error.message || 'Login failed'
    })
  }
}

let refreshToken = async (req, res) => {
  try {
    let token = req.cookies.refreshToken
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No refresh token provided'
      })
    }

    let result = await authService.refreshAccessToken(token)

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    let { refreshToken: _, ...responseBody } = result
    sendSuccess(res, 200, responseBody, 'Token refreshed successfully')
  } catch (error) {
    console.error('Refresh token error:', error)
    res.clearCookie('refreshToken')
    res.status(401).json({
      success: false,
      message: error.message || 'Token refresh failed'
    })
  }
}

let logout = async (req, res) => {
  try {
    let token = req.cookies.refreshToken
    if (req.user && token) {
      await authService.logout(req.user.id, token)
    }
    res.clearCookie('refreshToken')
    sendSuccess(res, 200, null, 'Logged out successfully')
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'Logout failed'
    })
  }
}

let verifyEmail = async (req, res) => {
  try {
    let result = await authService.verifyEmail(req.params.token)
    sendSuccess(res, 200, null, result.message)
  } catch (error) {
    console.error('Email verification error:', error)
    res.status(400).json({
      success: false,
      message: error.message || 'Email verification failed'
    })
  }
}

let getCurrentUser = async (req, res) => {
  try {
    sendSuccess(res, 200, req.user)
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get user'
    })
  }
}

let forgotPassword = async (req, res) => {
  try {
    await authService.forgotPassword(req.body.email)
    sendSuccess(res, 200, null, 'If email exists, reset link will be sent')
  } catch (error) {
    console.error('Forgot password error:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'Password reset request failed'
    })
  }
}

let resetPassword = async (req, res) => {
  try {
    let result = await authService.resetPassword(req.params.token, req.body.password)
    
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })
    
    let { refreshToken, ...responseBody } = result
    sendSuccess(res, 200, responseBody, result.message)
  } catch (error) {
    console.error('Reset password error:', error)
    res.status(400).json({
      success: false,
      message: error.message || 'Password reset failed'
    })
  }
}

let changePassword = async (req, res) => {
  try {
    let result = await authService.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword)
    sendSuccess(res, 200, null, result.message)
  } catch (error) {
    console.error('Change password error:', error)
    res.status(400).json({
      success: false,
      message: error.message || 'Password change failed'
    })
  }
}

// ✅ FIXED: Google OAuth Controller
const googleLogin = async (req, res) => {
  try {
    console.log('🔵 Google login request received:', { 
      hasIdToken: !!req.body.idToken,
      hasAccessToken: !!req.body.accessToken 
    })

    const { idToken, accessToken } = req.body
    
    if (!idToken && !accessToken) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID token or access token required' 
      })
    }

    const result = await googleAuthService.googleLogin(idToken, accessToken)

    // Set refresh token cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    // Don't send refresh token in response body
    const { refreshToken, ...responseBody } = result
    
    console.log('✅ Google login successful for:', result.user.email)
    
    res.status(200).json({
      success: true,
      data: responseBody,
      message: 'Google login successful'
    })
  } catch (error) {
    console.error('❌ Google login controller error:', error)
    res.status(401).json({ 
      success: false, 
      message: error.message || 'Google authentication failed'
    })
  }
}

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  verifyEmail,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  changePassword,
  googleLogin
}