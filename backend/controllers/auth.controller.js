let authService = require('../services/auth.service')
let emailService = require('../services/email.service')

let sendSuccess=(res,statusCode,data=null,message=null)=>{
    let response={success:true}
    if(data) response.data=data
    if(message) response.message=message
    res.status(statusCode).json(response)
}

let register=async(req,res,next)=>{
    let result=await authService.register(req.body)
    emailService.sendWelcomeEmail(result.user).catch(err=>{
        console.error('Welcome email failed:',err)
    })
    sendSuccess(res,201,result,'User registered successfully')
}

let login=async(req,res,next)=>{
    let result=await authService.login(req.body.email,req.body.password)
    sendSuccess(res,200,result,'Login successful')
}

let refreshToken=async(req,res,next)=>{
    let result=await authService.refreshAccessToken(req.body.refreshToken)
    sendSuccess(res,200,result,'Token refreshed successfully')
}

let logout=async(req,res,next)=>{
    let result=await authService.logout(req.user.id)
    sendSuccess(res,200,null,result.message)
}

let getCurrentUser=async(req,res)=>{
    sendSuccess(res,200,req.user)
}

let forgotPassword=async(req,res,next)=>{
    let { resetToken,user}=await authService.forgotPassword(req.body.email)
    await emailService.sendPasswordResetEmail(user,resetToken)
    sendSuccess(res,200,null,'Password reset link to email')
}

let resetPassword=async(req,res,next)=>{
    let result=await authService.resetPassword(req.params.token,req.body.password)
    sendSuccess(res,200,{
        accessToken:result.accessToken,
        refreshToken:result.refreshToken
    },result.message)
}

let changePassword=async(req,res,next)=>{
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