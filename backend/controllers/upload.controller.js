let uploadService = require('../services/upload.service')
let config = require('../config/env')

let sendSuccess=(res,statusCode,data=null,message=null,extra={})=>{
    let response={ success:true }
    if(data) response.data=data
    if(message) response.message=message
    Object.assign(response,extra)
    res.status(statusCode).json(response)
}

let sendError=(res,statusCode,message)=>{
    res.status(statusCode).json({ success:false,message })
}

let useAWS=()=>{
    return config.aws?.accessKeyId && config.aws?.secretAccessKey
}

let handleSingleUpload=async(req,res,next,serviceFn,defaultFolder='uploads')=>{
    if(!req.file){
        return sendError(res,400,'No file provided')
    }
    try{
        let folder=req.query.folder||defaultFolder
        let result=useAWS()
        ?await serviceFn(req.file,folder||req.params.tripId)
        :await uploadService.uploadFileLocal(req.file,folder)
        sendSuccess(res,200,result,`${defaultFolder} uploaded successfully`)
    } catch(error){
        next(error)
    }
}

let uploadImage = async (req, res, next) => {
  handleSingleUpload(req,res,next,uploadService.uploadImage,'images')
}

let uploadDocument = async (req, res, next) => {
    handleSingleUpload(req,res,next,uploadService.uploadDocument,'documents')
}

let uploadReceipt = async (req, res, next) => {
    handleSingleUpload(req,res,next,uploadService.uploadReceipt,`receipts/${req.params.tripId}`) 
}

let uploadMultiple = async (req, res, next) => {
   if (!req.files || req.files.length === 0) {
    return sendError(res, 400, 'No files provided')
  }
   try {
    let folder = req.query.folder || 'uploads'
    let uploadPromises = req.files.map(file => 
      useAWS() 
        ? uploadService.uploadFile(file, folder)
        : uploadService.uploadFileLocal(file, folder)
    )
    let results = await Promise.all(uploadPromises);
    sendSuccess(res, 200, results, 'Files uploaded successfully', { count: results.length });
  } catch (error) {
    next(error)
  }
}

let deleteFile = async (req, res, next) => {
    let { fileKey } = req.body;

    if (!fileKey) {
      return sendError(res,400,'File key required')
    }

    try{
    let result = await uploadService.deleteFile(fileKey)
    sendSuccess(res,200,null,result.message)
  } catch (error) {
    next(error)
  }
}

let getSignedUrl = async (req, res, next) => {
    let { fileKey } = req.params
    let expiresIn = parseInt(req.query.expiresIn) || 3600

    try{
    let result = await uploadService.getSignedUrl(fileKey, expiresIn)
    sendSuccess(res,200,result)
  } catch (error) {
    next(error)
  }
}

module.exports = {
  uploadImage,
  uploadDocument,
  uploadReceipt,
  uploadMultiple,
  deleteFile,
  getSignedUrl,
}