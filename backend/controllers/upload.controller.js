let uploadService = require('../services/upload.service')

let sendSuccess = (res, statusCode, data = null, message = null, extra = {}) => {
  let response = { success: true }
  if (data) response.data = data
  if (message) response.message = message
  Object.assign(response, extra)
  res.status(statusCode).json(response)
}

let sendError = (res, statusCode, message) => {
  res.status(statusCode).json({ success: false, message })
}

let uploadImage = async (req, res, next) => {
  if (!req.file) {
    return sendError(res, 400,'No file provided')
  }
  
  try {
    let folder = req.query.folder || 'images'
    let result = await uploadService.uploadImage(req.file, folder)
    sendSuccess(res, 200, result, 'Image uploaded successfully')
  } catch (error) {
    next(error)
  }
}

let uploadDocument = async (req, res, next) => {
  if (!req.file) {
    return sendError(res, 400, 'No file provided')
  }
  
  try {
    let folder = req.query.folder || 'documents'
    let result = await uploadService.uploadDocument(req.file, folder)
    sendSuccess(res, 200, result, 'Document uploaded successfully')
  } catch (error) {
    next(error)
  }
}

let uploadReceipt = async (req, res, next) => {
  if (!req.file) {
    return sendError(res, 400, 'No file provided')
  }
  
  try {
    let result = await uploadService.uploadReceipt(req.file, req.params.tripId)
    sendSuccess(res, 200, result, 'Receipt uploaded successfully')
  } catch (error) {
    next(error)
  }
}

let uploadMultiple = async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return sendError(res, 400, 'No files provided')
  }
  
  try {
    let folder = req.query.folder || 'uploads'
    let uploadPromises = req.files.map(file => 
      uploadService.uploadFile(file, folder)
    )
    let results = await Promise.all(uploadPromises)
    sendSuccess(res, 200, results, 'Files uploaded successfully', { count: results.length })
  } catch (error) {
    next(error)
  }
}

let deleteFile = async (req, res, next) => {
  let { filePath } = req.body

  if (!filePath) {
    return sendError(res, 400, 'File path required')
  }

  try {
    let result = await uploadService.deleteFile(filePath)
    sendSuccess(res, 200, null, result.message)
  } catch (error) {
    next(error)
  }
}

module.exports = {
  uploadImage,
  uploadDocument,
  uploadReceipt,
  uploadMultiple,
  deleteFile
}