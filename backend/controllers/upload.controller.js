const uploadService = require('../services/upload.service')

const sendSuccess = (res, statusCode, data = null, message = null, extra = {}) => {
  const response = { success: true }
  if (data) response.data = data
  if (message) response.message = message
  Object.assign(response, extra)
  res.status(statusCode).json(response)
}

const sendError = (res, statusCode, message) => {
  res.status(statusCode).json({ success: false, message })
}

//Upload a single image
//POST /api/uploads/image
const uploadImage = async (req, res, next) => {
  if (!req.file) {
    return sendError(res, 400, 'No file provided')
  }
  try {
    const folder = req.query.folder || 'images'
    const result = await uploadService.uploadImage(req.file, folder)
    sendSuccess(res, 200, result, 'Image uploaded successfully')
  } catch (error) {
    next(error)
  }
}

//Upload a single document
//POST /api/uploads/document
const uploadDocument = async (req, res, next) => {
  if (!req.file) {
    return sendError(res, 400, 'No file provided')
  }
  try {
    const folder = req.query.folder || 'documents'
    const result = await uploadService.uploadDocument(req.file, folder)
    sendSuccess(res, 200, result, 'Document uploaded successfully')
  } catch (error) {
    next(error)
  }
}

//Upload trip banner
//POST /api/uploads/banner/:tripId
const uploadBanner = async (req, res, next) => {
  if (!req.file) {
    return sendError(res, 400, 'No banner image provided')
  }

  const { tripId } = req.params
  if (!tripId) {
    return sendError(res, 400, 'Trip ID is required')
  }

  try {
    const { oldBannerUrl } = req.body
    let result
    // If old banner URL is provided, replace it
    if (oldBannerUrl) {
      result = await uploadService.replaceBanner(oldBannerUrl, req.file, tripId)
    } else {
      // Just upload new banner
      result = await uploadService.uploadBanner(req.file, tripId)
    }

    sendSuccess(res, 200, result, 'Banner uploaded successfully')
  } catch (error) {
    next(error)
  }
}

//Upload multiple files at once
//POST /api/uploads/multiple
const uploadMultiple = async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return sendError(res, 400, 'No files provided')
  }
  try {
    const folder = req.query.folder || 'uploads' 
    const uploadPromises = req.files.map(file =>
      uploadService.uploadFile(file, folder)
    )
    const results = await Promise.all(uploadPromises)
    sendSuccess(res,200,results,'Files uploaded successfully',
      { count: results.length }
    )
  } catch (error) {
    next(error)
  }
}

//Delete a file from storage
//DELETE /api/uploads/file
const deleteFile = async (req, res, next) => {
  const { fileUrl } = req.body
  if (!fileUrl) {
    return sendError(res, 400, 'File URL is required')
  }
  try {
    const result = await uploadService.deleteFile(fileUrl)
    sendSuccess(res, 200, null, result.message)
  } catch (error) {
    next(error)
  }
}

module.exports = {
  uploadImage,
  uploadDocument,
  uploadBanner,
  uploadMultiple,
  deleteFile
}
