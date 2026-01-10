let jwt = require('jsonwebtoken')
let User = require('../models/User.model')
let config = require('../config/env')
let { UnauthorizedError } = require('../utils/errors')

let authenticate = async (req, res, next) => {
  try {
    let token=getTokenFromHeader(req)
    if(!token){
        return next(new UnauthorizedError('No token provided'))
    }

    let decoded=jwt.verify(token, config.jwt.secret)
    let user = await User.findById(decoded.id).select('-password')

    if (!user || !user.isActive) {
      return next(new UnauthorizedError('User inactive or not found'))
    }
    req.user = user
    next()
  } catch (error) {
    if(error.name==='TokenExpiredError'){
        return next(new UnauthorizedError('Token expired'))
    }
    next(new UnauthorizedError('Invalid token'))
  }
}

let getTokenFromHeader=(req)=>{
    let authHeader=req.headers.authorization
    if(!authHeader||!authHeader.startsWith('Bearer')) return null
    return authHeader.split(' ')[1]
}

let authorize=(...roles)=>{
    return (req,res,next)=>{
        if(!req.user?.role||!roles.includes(req.user.role)){
            return next(new UnauthorizedError('Insufficient permission'))
        }
        next()
    }
}

let optionalAuth = async (req, res, next) => {
  try {
    let token = getTokenFromHeader(req)
    if (!token) return next()
    let decoded = jwt.verify(token, config.jwt.secret)
    let user = await User.findById(decoded.id).select('-password')
    if (user?.isActive) {
      req.user = user
    }
  } catch (error) {
    // Silently ignore invalid/expired tokens
  }
  next()
};


module.exports = {
  authenticate,
  authorize,
  optionalAuth,
};