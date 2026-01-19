const { OAuth2Client } = require('google-auth-library')
const User = require('../models/User.model')
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt')

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

const googleLogin = async (idToken, accessToken = null) => {
  let payload

  try {
    if (idToken) {
      // Verify ID token (preferred method)
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      })
      payload = ticket.getPayload()
    } else if (accessToken) {
      // Alternative: verify access token
      const userInfoResponse = await fetch(
        `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`
      )
      
      if (!userInfoResponse.ok) {
        throw new Error('Failed to fetch user info from Google')
      }
      
      payload = await userInfoResponse.json()
      payload.sub = payload.sub || payload.id
      payload.email_verified = payload.email_verified !== false
    } else {
      throw new Error('Either idToken or accessToken must be provided')
    }

    const { sub, email, name, email_verified } = payload

    if (!email_verified) {
      throw new Error('Google email not verified')
    }

    // Find existing user or create new one
    let user = await User.findOne({
      $or: [{ googleId: sub }, { email }]
    })

    if (!user) {
      // Create new user
      user = await User.create({
        name,
        email,
        googleId: sub,
        isVerified: true,
        authProvider: 'google'
      })
      console.log('✅ New Google user created:', email)
    } else if (!user.googleId) {
      // Link existing email account to Google
      user.googleId = sub
      user.authProvider = 'google'
      user.isVerified = true
      await user.save()
      console.log('✅ Linked existing user to Google:', email)
    } else {
      console.log('✅ Existing Google user logged in:', email)
    }

    // Generate tokens
    const jwtAccessToken = generateAccessToken(user._id)
    const jwtRefreshToken = generateRefreshToken(user._id)

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
    console.error('❌ Google auth error:', error)
    throw new Error(error.message || 'Google authentication failed')
  }
}

module.exports = { googleLogin }