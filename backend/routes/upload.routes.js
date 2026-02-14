const express = require('express')
const router = express.Router()
const uploadController = require('../controllers/upload.controller')
const { 
  uploadImage: uploadImageMiddleware, 
  uploadBanner: uploadBannerMiddleware,
  uploadDocument: uploadDocumentMiddleware,
  uploadGeneral: uploadGeneralMiddleware
} = require('../middleware/upload.middleware')

// image upload
router.post(
  '/image',
  uploadImageMiddleware.single('file'),
  uploadController.uploadImage
)

// document upload
router.post(
  '/document',
  uploadDocumentMiddleware.single('file'),
  uploadController.uploadDocument
)

// upload banner for a specific trip
router.post(
  '/banner/:tripId',
  uploadBannerMiddleware.single('banner'),
  uploadController.uploadBanner
)

// upload multiple files (max 5)
router.post(
  '/multiple',
  uploadGeneralMiddleware.array('files', 5),
  uploadController.uploadMultiple
)

// delete a previously uploaded file
router.delete('/file', uploadController.deleteFile)

module.exports = router
