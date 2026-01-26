<<<<<<< HEAD
const authService = require('../services/auth.service')
const emailService = require('../services/email.service')
const googleAuthService = require('../services/googleAuth.service')

/**
 * Send standardized success response
 */
const sendSuccess = (res, statusCode, data = null, message = null) => {
  const response = { success: true }
  if (data) response.data = data
  if (message) response.message = message
  res.status(statusCode).json(response)
}

/**
 * Register new user
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    const result = await authService.register(req.body, req)

    // Send verification email (non-blocking)
    emailService
      .sendVerificationEmail(
        result.user.email,
        result.user.verificationToken
      )
      .catch(err => console.error('Verification email failed:', err))

    // Store refresh token securely in cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    // Remove refreshToken from response body
    const { refreshToken, ...responseBody } = result

    sendSuccess(res, 201, responseBody, 'User registered. Please verify email.')
  } catch (error) {
    console.error('Registration error:', error)

    // Validation errors (express-validator)
    if (error.errors && Array.isArray(error.errors)) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      })
    }

    // Operational errors with statusCode
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      })
    }

    // Fallback error
    res.status(500).json({
      success: false,
      message: error.message || 'Registration failed'
    })
  }
}

/**
 * Login user
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const result = await authService.login(
      req.body.email,
      req.body.password,
      req
    )

    // Store refresh token in cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    const { refreshToken, ...responseBody } = result
    sendSuccess(res, 200, responseBody, 'Login successful')
  } catch (error) {
    console.error('Login error:', error)
    res.status(error.statusCode || 401).json({
      success: false,
      message: error.message || 'Login failed'
    })
  }
}

/**
 * Refresh access token using refresh token
 * POST /api/auth/refresh-token
 */
const refreshToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No refresh token provided'
      })
    }

    const result = await authService.refreshAccessToken(token)

    // Rotate refresh token
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    const { refreshToken: _, ...responseBody } = result
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

/**
 * Logout user
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  try {
    const token = req.cookies.refreshToken

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

/**
 * Verify email using token
 * GET /api/auth/verify/:token
 */
const verifyEmail = async (req, res) => {
  try {
    const result = await authService.verifyEmail(req.params.token)
    sendSuccess(res, 200, null, result.message)
  } catch (error) {
    console.error('Email verification error:', error)
    res.status(400).json({
      success: false,
      message: error.message || 'Email verification failed'
    })
  }
}

/**
 * Get current authenticated user
 * GET /api/auth/me
 */
const getCurrentUser = async (req, res) => {
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

/**
 * Request password reset
 * POST /api/auth/forgot-password
 */
const forgotPassword = async (req, res) => {
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

/**
 * Reset password using token
 * POST /api/auth/reset-password/:token
 */
const resetPassword = async (req, res) => {
  try {
    const result = await authService.resetPassword(
      req.params.token,
      req.body.password
    )

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    const { refreshToken, ...responseBody } = result
    sendSuccess(res, 200, responseBody, result.message)
  } catch (error) {
    console.error('Reset password error:', error)
    res.status(400).json({
      success: false,
      message: error.message || 'Password reset failed'
    })
  }
}

/**
 * Change password for logged-in user
 * POST /api/auth/change-password
 */
const changePassword = async (req, res) => {
  try {
    const result = await authService.changePassword(
      req.user.id,
      req.body.currentPassword,
      req.body.newPassword
    )

    sendSuccess(res, 200, null, result.message)
  } catch (error) {
    console.error('Change password error:', error)
    res.status(400).json({
      success: false,
      message: error.message || 'Password change failed'
    })
  }
}

/**
 * Google OAuth login
 * POST /api/auth/google
 */
const googleLogin = async (req, res) => {
  try {
    const { idToken, accessToken } = req.body

    if (!idToken && !accessToken) {
      return res.status(400).json({
        success: false,
        message: 'ID token or access token required'
      })
    }

    const result = await googleAuthService.googleLogin(idToken, accessToken)

    // Store refresh token securely
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    const { refreshToken, ...responseBody } = result

    res.status(200).json({
      success: true,
      data: responseBody,
      message: 'Google login successful'
    })
  } catch (error) {
    console.error('Google login error:', error)
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
=======
const authService = require('../services/auth.service')
const emailService = require('../services/email.service')
const googleAuthService = require('../services/googleAuth.service')

/**
 * Send standardized success response
 */
const sendSuccess = (res, statusCode, data = null, message = null) => {
  const response = { success: true }
  if (data) response.data = data
  if (message) response.message = message
  res.status(statusCode).json(response)
}

/**
 * Register new user
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    const result = await authService.register(req.body, req)

    // Send verification email (non-blocking)
    emailService
      .sendVerificationEmail(
        result.user.email,
        result.user.verificationToken
      )
      .catch(err => console.error('Verification email failed:', err))

    // Store refresh token securely in cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    // Remove refreshToken from response body
    const { refreshToken, ...responseBody } = result

    sendSuccess(res, 201, responseBody, 'User registered. Please verify email.')
  } catch (error) {
    console.error('Registration error:', error)

    // Validation errors (express-validator)
    if (error.errors && Array.isArray(error.errors)) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      })
    }

    // Operational errors with statusCode
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      })
    }

    // Fallback error
    res.status(500).json({
      success: false,
      message: error.message || 'Registration failed'
    })
  }
}

/**
 * Login user
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const result = await authService.login(
      req.body.email,
      req.body.password,
      req
    )

    // Store refresh token in cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    const { refreshToken, ...responseBody } = result
    sendSuccess(res, 200, responseBody, 'Login successful')
  } catch (error) {
    console.error('Login error:', error)
    res.status(error.statusCode || 401).json({
      success: false,
      message: error.message || 'Login failed'
    })
  }
}

/**
 * Refresh access token using refresh token
 * POST /api/auth/refresh-token
 */
const refreshToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No refresh token provided'
      })
    }

    const result = await authService.refreshAccessToken(token)

    // Rotate refresh token
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    const { refreshToken: _, ...responseBody } = result
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

/**
 * Logout user
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  try {
    const token = req.cookies.refreshToken

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

/**
 * Verify email using token
 * GET /api/auth/verify/:token
 */
const verifyEmail = async (req, res) => {
  try {
    const result = await authService.verifyEmail(req.params.token)
    sendSuccess(res, 200, null, result.message)
  } catch (error) {
    console.error('Email verification error:', error)
    res.status(400).json({
      success: false,
      message: error.message || 'Email verification failed'
    })
  }
}

/**
 * Get current authenticated user
 * GET /api/auth/me
 */
const getCurrentUser = async (req, res) => {
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

/**
 * Request password reset
 * POST /api/auth/forgot-password
 */
const forgotPassword = async (req, res) => {
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

/**
 * Reset password using token
 * POST /api/auth/reset-password/:token
 */
const resetPassword = async (req, res) => {
  try {
    const result = await authService.resetPassword(
      req.params.token,
      req.body.password
    )

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    const { refreshToken, ...responseBody } = result
    sendSuccess(res, 200, responseBody, result.message)
  } catch (error) {
    console.error('Reset password error:', error)
    res.status(400).json({
      success: false,
      message: error.message || 'Password reset failed'
    })
  }
}

/**
 * Change password for logged-in user
 * POST /api/auth/change-password
 */
const changePassword = async (req, res) => {
  try {
    const result = await authService.changePassword(
      req.user.id,
      req.body.currentPassword,
      req.body.newPassword
    )

    sendSuccess(res, 200, null, result.message)
  } catch (error) {
    console.error('Change password error:', error)
    res.status(400).json({
      success: false,
      message: error.message || 'Password change failed'
    })
  }
}

/**
 * Google OAuth login
 * POST /api/auth/google
 */
const googleLogin = async (req, res) => {
  try {
    const { idToken, accessToken } = req.body

    if (!idToken && !accessToken) {
      return res.status(400).json({
        success: false,
        message: 'ID token or access token required'
      })
    }

    const result = await googleAuthService.googleLogin(idToken, accessToken)

    // Store refresh token securely
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    const { refreshToken, ...responseBody } = result

    res.status(200).json({
      success: true,
      data: responseBody,
      message: 'Google login successful'
    })
  } catch (error) {
    console.error('Google login error:', error)
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
>>>>>>> 0007615a5a7317e8689fc9727726ee86c5585786
