let express = require('express')
let router = express.Router()
let uploadController = require('../controllers/upload.controller')
let { authenticate } = require('../middleware/auth.middleware')
let { uploadSingle, uploadMultiple } = require('../middleware/multer.middleware')

// All routes require authentication
router.use(authenticate)

// Single file uploads
router.post('/image', uploadSingle, uploadController.uploadImage);
router.post('/document', uploadSingle, uploadController.uploadDocument);
router.post('/receipt/:tripId', uploadSingle, uploadController.uploadReceipt);

// Multiple file uploads
router.post('/multiple', uploadMultiple, uploadController.uploadMultiple);

// File management
router.delete('/:fileKey', uploadController.deleteFile);
router.get('/signed-url/:fileKey', uploadController.getSignedUrl);

module.exports = router;