let bcrypt=require('bcryptjs')
let userService=require('./user.service')
let jwtUtils=require('../utils/jwt')
let {
    createAuthenticationError,
    createValidationError,
    createConflictError,
    createNotFoundError
}=require('../utils/errors')

let hashPassword=async(password)=>{
    if(!password || password.length<8){
        throw createValidationError('Password must be at least 8 characters long')
    }
    let saltRounds=12
    let hashedPassword=await bcrypt.hash(password,saltRounds)
    return hashedPassword
}

let comparePassword=async(plainPassword,hashedPassword)=>{
    if(!plainPassword||!hashedPassword){
        return false
    }
    let isMatch=await bcrypt.compare(plainPassword,hashedPassword)
    return isMatch
}

let registerUser=async(userData)=>{
    let{name,email,password}=userData
    if(!name||!email||!password){
        throw createValidationError('Name,email and password are required')
    }
    if(password.length<8){
        throw createValidationError('Password must be at least 8 characters long')
    }
    let emailExists=await userService.emailExists(email)
    if(emailExists){
        throw createConflictError('Email already registered')
    }
    let hashedPassword=await hashPassword(password)
    let user=await userService.createUser({
        name,
        email,
        password:hashedPassword
    })
    let tokenPayload={
        id:user._id.toString(),
        email:user.email
    }
    let token=jwtUtils.generateToken(tokenPayload)
    let refreshToken=jwtUtils.generateRefreshToken({id:user._id.toString()})
    let userObject=user.toObject()
    delete userObject.password
    return{
        user:userObject,
        token,
        refreshToken
    }
}

let loginUser=async(credentials)=>{
    let {email,password}=credentials
    if(!email||!password){
        throw createValidationError('Email and password are required')
    }
    let user=await userService.getUserByEmail(email,{includePassword:true})
    if(!user){
        throw createAuthenticationError('Invalid email or password')
    }
    let isPasswordValid=await comparePassword(password,user.password)
    if(!isPasswordValid){
        throw createAuthenticationError('Invalid email or password')
    }
    let tokenPayload={
        id:user._id.toString(),
        email:user.email
    }
    let token=jwtUtils.generateToken(tokenPayload)
    let refreshToken=jwtUtils.generateRefreshToken({id:user._id.toString()})
    let userObject=user.toObject()
    delete userObject.password
    return{
        user:userObject,
        token,
        refreshToken
    }
}

let logoutUser=async(userId)=>{
    let exists=await userService.userExists(userId)
    if(!exists){
        throw createNotFoundError('User not found')
    }
    return true
}

let refreshAuthToken=async(refreshToken)=>{
    if(!refreshToken){
        throw createValidationError('Refresh token is required')
    }
    let decoded=jwtUtils.verifyRefreshToken(refreshToken)
    let user=await userService.getUserById(decoded.id)
    if(!user){
        throw createAuthenticationError('User not found')
    }
    let tokenPayload={
        id:user._id.toString(),
        email:user.email
    }
    let newToken=jwtUtils.generateToken(tokenPayload)
    return{
        token:newToken
    }
}

let requestPasswordReset=async(email)=>{
    if(!email){
        throw createValidationError('Email is required')
    }
    let user=await userService.getUserByEmail(email)
    if(!user){
        return{success:true}
    }
    let resetToken=jwtUtils.generateToken(
        {
            id:user._id.toString(),
            purpose:'password-reset'
        },
        '15m'
    )
    return{
        resetToken,
        user:{
            id:user._id.toString(),
            email:user.email,
            name:user.name
        }
    }
}

let resetUserPassword=async(resetToken,newPassword)=>{
    if(!resetToken||!newPassword){
        throw createValidationError('Reset token and new password are required')
    }
    if(newPassword.length<8){
        throw createValidationError('Password must be at least 8 characters long')
    }
    let decoded=jwtUtils.verifyToken(resetToken)
    if(decoded.purpose!=='password-reset'){
        throw createAuthenticationError('Invalid reset token')
    }
    let hashedPassword=await hashPassword(newPassword)
    await userService.updateUserPassword(decoded.id,hashedPassword)
    return true
}

let changeUserPassword=async(userId,currentPassword,newPassword)=>{
    if(!userId||!currentPassword||!newPassword){
        throw createValidationError('User ID, current password, and new password are required')
    }
    if(newPassword.length<8){
        throw createValidationError('New password must be at least 8 characters long')
    }
    if(currentPassword===newPassword){
        throw createValidationError('New password must be different from current password')
    }
    let user=await userService.getUserById(userId,{includePassword:true})
    let isPasswordValid=await comparePassword(currentPassword,user.password)
    if(!isPasswordValid){
        throw createAuthenticationError('Current password is incorrect')
    }
    let hashedPassword=await hashPassword(newPassword)
    await userService.updateUserPassword(userId,hashedPassword)
    return true
}

let deleteUserAccount=async(userId,password)=>{
    if(!userId||!password){
        throw createValidationError('User ID and password are required')
    }
    let user=await userService.getUserById(userId,{includePassword:true})
    let isPasswordValid=await comparePassword(password,user.password)
    if(!isPasswordValid){
        throw createAuthenticationError('Password is incorrect')
    }
    await userService.deleteUser(userId)
    return true
}

let verifyUserToken=async(token)=>{
    if(!token){
        throw createValidationError('Token is required')
    }
    let decoded=jwtUtils.verifyToken(token)
    let userFound=await userService.userExists(decoded.id)
    if(!userFound){
        throw createAuthenticationError('User no longer exists')
    }
    return decoded
}

module.exports={
    registerUser,
    loginUser,
    logoutUser,
    refreshAuthToken,
    requestPasswordReset,
    resetUserPassword,
    changeUserPassword,
    deleteUserAccount,
    verifyUserToken,
    hashPassword,
    comparePassword
}