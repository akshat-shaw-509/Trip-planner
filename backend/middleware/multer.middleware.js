let multer = require('multer')
let { MAX_FILE_SIZE, ALLOWED_IMAGE_TYPES, ALLOWED_DOCUMENT_TYPES } = require('../config/constants')

let storage = multer.memoryStorage()

let imageFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error(`Invalid file type. Only ${ALLOWED_IMAGE_TYPES.join(', ')} are allowed`), false)
  }
}

let documentFilter = (req, file, cb) => {
  if (ALLOWED_DOCUMENT_TYPES.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error(`Invalid file type. Only ${ALLOWED_DOCUMENT_TYPES.join(', ')} are allowed`), false)
  }
}

let generalFilter = (req, file, cb) => {
  const allowedTypes = [...new Set([...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES])]
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`), false)
  }
}

let uploadImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: MAX_FILE_SIZE },
})

let uploadDocument = multer({
  storage,
  fileFilter: documentFilter,
  limits: { fileSize: MAX_FILE_SIZE },
})

let uploadGeneral = multer({
  storage,
  fileFilter: generalFilter,
  limits: { fileSize: MAX_FILE_SIZE },
})

let uploadSingle = uploadGeneral.single('file');
const uploadMultiple = uploadGeneral.array('files', 10); // Max 10 files

let uploadFields = uploadGeneral.fields([
  { name: 'image', maxCount: 1 },
  { name: 'document', maxCount: 1 },
  { name: 'receipt', maxCount: 1 },
])

let handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      })
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files uploaded',
      })
    }
    return res.status(400).json({
      success: false,
      message: err.message,
    })
  }
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    })
  }
  next()
}

module.exports = {
  uploadSingle,
  uploadMultiple,
  uploadFields,
  uploadImage,
  uploadDocument,
  handleMulterError,
};