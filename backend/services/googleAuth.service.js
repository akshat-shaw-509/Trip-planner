// Google OAuth client for verifying ID tokens
let { OAuth2Client } = require('google-auth-library')

// User model
let User = require('../models/User.model')

// JWT helpers for generating access & refresh tokens
let { generateAccessToken, generateRefreshToken } = require('../utils/jwt')

// Initialize Google OAuth client
let client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

/**
 * -------------------- Google Login Service --------------------
 * Supports login via:
 * 1) Google ID Token (recommended)
 * 2) Google Access Token (fallback)
 */
let googleLogin = async (idToken, accessToken = null) => {
  let payload

  try {
    /**
     * -------------------- Token Verification --------------------
     */

    // Case 1: Verify Google ID token
    if (idToken) {
      let ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      })
      payload = ticket.getPayload()
    }

    // Case 2: Fetch user info using Google access token
    else if (accessToken) {
      let userInfoResponse = await fetch(
        `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`
      )

      if (!userInfoResponse.ok) {
        throw new Error('Failed to fetch user info from Google')
      }

      payload = await userInfoResponse.json()

      // Normalize payload fields
      payload.sub = payload.sub || payload.id
      payload.email_verified = payload.email_verified !== false
    }

    // No valid token provided
    else {
      throw new Error('Either idToken or accessToken must be provided')
    }

    /**
     * -------------------- Payload Validation --------------------
     */
    let { sub, email, name, email_verified } = payload

    // Ensure Google account email is verified
    if (!email_verified) {
      throw new Error('Google email not verified')
    }

    /**
     * -------------------- User Lookup / Creation --------------------
     */

    // Try to find existing user by Google ID or email
    let user = await User.findOne({
      $or: [{ googleId: sub }, { email }]
    })

    // New Google user
    if (!user) {
      user = await User.create({
        name,
        email,
        googleId: sub,
        isVerified: true,
        authProvider: 'google'
      })
      console.log('New Google user created:', email)
    }

    // Existing user without Google linked
    else if (!user.googleId) {
      user.googleId = sub
      user.authProvider = 'google'
      user.isVerified = true
      await user.save()
      console.log('Linked existing user to Google:', email)
    }

    // Existing Google-linked user
    else {
      console.log('Existing Google user logged in:', email)
    }

    /**
     * -------------------- Token Generation --------------------
     */
    let jwtAccessToken = generateAccessToken(user._id)
    let jwtRefreshToken = generateRefreshToken(user._id)

    /**
     * -------------------- Response --------------------
     */
    return {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        authProvider: user.authProvider,
        isVerified: user.isVerified
      },
      accessToken: jwtAccessToken,
      refreshToken: jwtRefreshToken
    }
  } catch (error) {
    console.error('Google auth error:', error)
    throw new Error(error.message || 'Google authentication failed')
  }
}

/**
 * Export Google authentication service
 */
module.exports = { googleLogin }
