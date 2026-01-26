let express = require('express')
let router = express.Router()
let uploadController = require('../controllers/upload.controller')
let { uploadBanner } = require('../middleware/upload.middleware')

// Note: Authentication middleware removed since it doesn't exist
// If you need authentication, create it in upload.middleware.js or import from auth middleware

// Single file uploads - uploadBanner works for single files
router.post('/image', uploadBanner.single('file'), uploadController.uploadImage)
router.post('/document', uploadBanner.single('file'), uploadController.uploadDocument) 
router.post('/receipt/:tripId', uploadBanner.single('file'), uploadController.uploadReceipt)

// Multiple file uploads - TEMPORARILY DISABLED
// router.post('/multiple', uploadBanner.array('files', 5), uploadController.uploadMultiple)

// File management
router.delete('/file', uploadController.deleteFile)

module.exports = router