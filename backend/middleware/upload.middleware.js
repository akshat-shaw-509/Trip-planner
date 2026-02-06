const multer = require('multer')
const path = require('path')

/**
 * Memory storage for general uploads (processed by service layer)
 * This gives us more control and allows the service to handle folder logic
 */
const memoryStorage = multer.memoryStorage()

/**
 * File type filter for images
 */
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(
      new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed'),
      false
    )
  }
}

/**
 * File type filter for documents
 */
const documentFileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(
      new Error('Invalid document type. Only PDF, Word, Excel, and text files are allowed'),
      false
    )
  }
}

/**
 * General file filter (allows both images and documents)
 */
const generalFileFilter = (req, file, cb) => {
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
  const allowedDocTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
  
  const allAllowedTypes = [...allowedImageTypes, ...allowedDocTypes]
  
  if (allAllowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(
      new Error('Invalid file type'),
      false
    )
  }
}

/**
 * Multer instance for image uploads (banners, profile pics, etc.)
 */
const uploadImage = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
})

/**
 * Multer instance for banner uploads specifically
 */
const uploadBanner = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
})

/**
 * Multer instance for document uploads
 */
const uploadDocument = multer({
  storage: memoryStorage,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
})

/**
 * Multer instance for general file uploads (mixed types)
 */
const uploadGeneral = multer({
  storage: memoryStorage,
  fileFilter: generalFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
})

module.exports = {
  uploadImage,
  uploadBanner,
  uploadDocument,
  uploadGeneral
}
