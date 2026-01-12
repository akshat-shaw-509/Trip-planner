let authService = require('../services/auth.service')
let emailService = require('../services/email.service')

let sendSuccess=(res,statusCode,data=null,message=null)=>{
    let response={success:true}
    if(data) response.data=data
    if(message) response.message=message
    res.status(statusCode).json(response)
}

let register=async(req,res)=>{
    let result=await authService.register(req.body)
    emailService.sendWelcomeEmail(result.user).catch(err=>{
        console.error('Welcome email failed:',err)
    })
    sendSuccess(res,201,result,'User registered successfully')
}

let login=async(req,res)=>{
    let result=await authService.login(req.body.email,req.body.password)
    sendSuccess(res,200,result,'Login successful')
}

let refreshToken=async(req,res)=>{
    let result=await authService.refreshAccessToken(req.body.refreshToken)
    sendSuccess(res,200,result,'Token refreshed successfully')
}

let logout=async(req,res)=>{
    let result=await authService.logout(req.user.id)
    sendSuccess(res,200,null,result.message)
}

let getCurrentUser=async(req,res)=>{
    sendSuccess(res,200,req.user)
}

let forgotPassword = async (req, res, next) => {
  try {
    let result = await authService.forgotPassword(req.body.email)
    
    // Check if user was found
    if (!result.user) {
      return sendSuccess(res, 200, null, 'Forgot Password reset link will be sent')
    }
    
    const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${result.resetToken}`
    await emailService.sendPasswordResetEmail(result.user, resetUrl)
    sendSuccess(res, 200, null, 'Password reset link sent to email')
  } catch (error) {
    next(error)
  }
}
let resetPassword=async(req,res)=>{
    let result=await authService.resetPassword(req.params.token,req.body.password)
    sendSuccess(res,200,{
        accessToken:result.accessToken,
        refreshToken:result.refreshToken
    },result.message)
}

let changePassword=async(req,res)=>{
    let result=await authService.changePassword(req.user.id,req.body.currentPassword,req.body.newPassword)
    sendSuccess(res,200,null,result.message)
}

module.exports={
    register,
    login,
    refreshToken,
    logout,
    getCurrentUser,
    forgotPassword,
    resetPassword,
    changePassword
}
