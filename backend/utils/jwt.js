let jwt = require('jsonwebtoken')
let config = require('../config/env')

let generateToken = (payload, secret, expiresIn) => {
  return jwt.sign(payload, secret, { expiresIn })
}

let verifyToken = (token, secret) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    const message = error.name === 'TokenExpiredError' 
      ? 'Token expired' 
      : 'Invalid token'
    throw new Error(message)
  }
}

let decodeToken = (token) => {
  return jwt.decode(token)
};

let generateAccessToken = (userId) => {
  return generateToken(
    { id: userId },
    config.jwt.secret,
    config.jwt.accessExpiresIn
  )
}

let generateRefreshToken = (userId) => {
  return generateToken(
    { id: userId },
    config.jwt.refreshSecret,
    config.jwt.refreshExpiresIn
  )
}

let verifyAccessToken = (token) => {
  return verifyToken(token, config.jwt.secret);
}

let verifyRefreshToken = (token) => {
  return verifyToken(token, config.jwt.refreshSecret)
}

module.exports = {
  generateToken,
  verifyToken,
  decodeToken,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
}