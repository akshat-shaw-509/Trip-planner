const express = require('express')
const router = express.Router()
const uploadController = require('../controllers/upload.controller')
const { 
  uploadImage: uploadImageMiddleware, 
  uploadBanner: uploadBannerMiddleware,
  uploadDocument: uploadDocumentMiddleware,
  uploadGeneral: uploadGeneralMiddleware
} = require('../middleware/upload.middleware')

// Note: If you have authentication middleware, import and add it like:
// const { authenticate } = require('../middleware/auth.middleware')
// Then use: authenticate, uploadBannerMiddleware.single('file'), uploadController.uploadBanner

/**
 * Image uploads
 * POST /api/uploads/image
 * Multipart field name: "file"
 * Optional query: ?folder=images
 */
router.post(
  '/image',
  uploadImageMiddleware.single('file'),
  uploadController.uploadImage
)

/**
 * Document uploads
 * POST /api/uploads/document
 * Multipart field name: "file"
 * Optional query: ?folder=documents
 */
router.post(
  '/document',
  uploadDocumentMiddleware.single('file'),
  uploadController.uploadDocument
)

/**
 * Banner upload for trips
 * POST /api/uploads/banner/:tripId
 * Multipart field name: "banner" or "file"
 * Optional body: { oldBannerUrl: "..." }
 */
router.post(
  '/banner/:tripId',
  uploadBannerMiddleware.single('banner'),
  uploadController.uploadBanner
)

// Alternative route accepting "file" field name
router.post(
  '/trip-banner/:tripId',
  uploadBannerMiddleware.single('file'),
  uploadController.uploadBanner
)

/**
 * Multiple file uploads
 * POST /api/uploads/multiple
 * Multipart field name: "files"
 * Max files: 5
 * Optional query: ?folder=uploads
 */
router.post(
  '/multiple',
  uploadGeneralMiddleware.array('files', 5),
  uploadController.uploadMultiple
)

/**
 * Delete a file
 * DELETE /api/uploads/file
 * Body: { fileUrl: "/uploads/images/filename.jpg" }
 */
router.delete('/file', uploadController.deleteFile)

module.exports = router
