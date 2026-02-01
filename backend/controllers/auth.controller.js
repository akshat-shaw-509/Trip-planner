const authService = require('../services/auth.service')
const emailService = require('../services/email.service')
const googleAuthService = require('../services/googleAuth.service')

const sendSuccess = (res, statusCode, data = null, message = null) => {
  const response = { success: true }
  if (data) response.data = data
  if (message) response.message = message
  res.status(statusCode).json(response)
}

 //Register new user
 //POST /api/auth/register
const register = async (req, res) => {
  try {
    const result = await authService.register(req.body, req)
    // Store refresh token securely in cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })
    // Remove refreshToken from response body
    const { refreshToken, ...responseBody } = result
   sendSuccess(res, 201, responseBody, 'User registered successfully')
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

//Login user
//POST /api/auth/login
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

//Refresh access token using refresh token
//POST /api/auth/refresh-token
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

    const { refreshToken, ...responseBody } = result
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

//Logout user
//POST /api/auth/logout
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

//Get current authenticated user
///GET /api/auth/me
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
//Google OAuth login
//POST /api/auth/google
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
  getCurrentUser,
  googleLogin
}

