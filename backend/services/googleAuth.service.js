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
     * -------------------- Debug Logging --------------------
     */
    console.log('🔍 Google Login Debug:')
    console.log('- Has idToken:', !!idToken)
    console.log('- Has accessToken:', !!accessToken)
    console.log('- CLIENT_ID configured:', !!process.env.GOOGLE_CLIENT_ID)
    console.log('- CLIENT_ID (first 20 chars):', process.env.GOOGLE_CLIENT_ID?.substring(0, 20))
    
    if (idToken) {
      console.log('- Token type: ID Token')
      console.log('- Token length:', idToken.length)
    }

    /**
     * -------------------- Token Verification --------------------
     */

    // Case 1: Verify Google ID token
    if (idToken) {
      console.log('📝 Attempting to verify ID token...')
      
      try {
        let ticket = await client.verifyIdToken({
          idToken,
          audience: process.env.GOOGLE_CLIENT_ID,
        })
        payload = ticket.getPayload()
        console.log('✅ Token verified successfully')
        console.log('- User email:', payload.email)
        console.log('- Email verified:', payload.email_verified)
      } catch (verifyError) {
        console.error('❌ Token verification failed:', verifyError.message)
        console.error('- Error details:', verifyError)
        throw new Error(`Token verification failed: ${verifyError.message}`)
      }
    }

    // Case 2: Fetch user info using Google access token
    else if (accessToken) {
      console.log('📝 Fetching user info with access token...')
      
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
      
      console.log('✅ User info fetched successfully')
    }

    // No valid token provided
    else {
      console.error('❌ No token provided')
      throw new Error('Either idToken or accessToken must be provided')
    }

    /**
     * -------------------- Payload Validation --------------------
     */
    let { sub, email, name, email_verified } = payload

    console.log('📧 Processing user:', email)

    // Ensure Google account email is verified
    if (!email_verified) {
      console.error('❌ Email not verified:', email)
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
      console.log('👤 Creating new Google user:', email)
      user = await User.create({
        name,
        email,
        googleId: sub,
        isVerified: true,
        authProvider: 'google'
      })
      console.log('✅ New Google user created:', email)
    }

    // Existing user without Google linked
    else if (!user.googleId) {
      console.log('🔗 Linking existing user to Google:', email)
      user.googleId = sub
      user.authProvider = 'google'
      user.isVerified = true
      await user.save()
      console.log('✅ User linked to Google:', email)
    }

    // Existing Google-linked user
    else {
      console.log('✅ Existing Google user logged in:', email)
    }

    /**
     * -------------------- Token Generation --------------------
     */
    console.log('🎫 Generating JWT tokens...')
    let jwtAccessToken = generateAccessToken(user._id)
    let jwtRefreshToken = generateRefreshToken(user._id)
    console.log('✅ Tokens generated successfully')

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
    console.error('❌ Google auth error:', error.message)
    console.error('- Full error:', error)
    throw new Error(error.message || 'Google authentication failed')
  }
}

/**
 * Export Google authentication service
 */
module.exports = { googleLogin }
