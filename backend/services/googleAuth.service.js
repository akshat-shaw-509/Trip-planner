// Google OAuth client for verifying ID tokens
let { OAuth2Client } = require('google-auth-library')

// User model
let User = require('../models/User.model')

// JWT helper (access token only)
let { generateAccessToken } = require('../utils/jwt')

// Initialize Google OAuth client
let client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

/**
 * -------------------- Google Login Service --------------------
 * Supports login via Google ID Token only
 */
let googleLogin = async (idToken) => {
  try {
    if (!idToken) {
      throw new Error('Google ID token is required')
    }

    // Verify Google ID token
    let ticket
    try {
      ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID
      })
    } catch (err) {
      throw new Error('Invalid Google ID token')
    }

    let payload = ticket.getPayload()
    let { sub, email, name, email_verified } = payload

    if (!email_verified) {
      throw new Error('Google email not verified')
    }

    // Find existing user by Google ID or email
    let user = await User.findOne({
      $or: [{ googleId: sub }, { email }]
    })

    // Create new user if not found
    if (!user) {
      user = await User.create({
        name,
        email,
        googleId: sub
      })
    }
    // Link Google account to existing user
    else if (!user.googleId) {
      user.googleId = sub
      await user.save()
    }

    // Generate access token
    let accessToken = generateAccessToken(user._id.toString())

    return {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email
      },
      accessToken
    }
  } catch (error) {
    console.error('Google auth error:', error.message)
    throw new Error(error.message || 'Google authentication failed')
  }
}

module.exports = { googleLogin }

