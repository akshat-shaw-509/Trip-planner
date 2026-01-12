let express = require('express')
let router = express.Router()
let uploadController = require('../controllers/upload.controller')
let { authenticate } = require('../middleware/auth.middleware')
let { uploadSingle, uploadMultiple, handleMulterError } = require('../middleware/multer.middleware')

// All routes require authentication
router.use(authenticate)

// Single file uploads
router.post('/image', uploadSingle, handleMulterError, uploadController.uploadImage)
router.post('/document', uploadSingle, handleMulterError, uploadController.uploadDocument)
router.post('/receipt/:tripId', uploadSingle, handleMulterError, uploadController.uploadReceipt)

// Multiple file uploads
router.post('/multiple', uploadMultiple, handleMulterError, uploadController.uploadMultiple)

// File management
router.delete('/file', uploadController.deleteFile)

module.exports = router