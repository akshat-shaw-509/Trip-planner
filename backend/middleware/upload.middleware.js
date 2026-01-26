let multer = require('multer')

// Path -> helps build OS-safe file paths
let path = require('path')

// fs.promises -> async filesystem operations
let fs = require('fs').promises

/**
 * -------------------- Storage Configuration --------------------
 * Disk storage setup for banner uploads
 */
let bannerStorage = multer.diskStorage({
  /**
   * Destination callback
   * Ensures the upload directory exists before saving the file
   */
  destination: async (req, file, cb) => {
    // Define upload directory for banners
    let uploadPath = path.join(__dirname, '../uploads/banners')

    try {
      // Create directory if it doesn't exist
      await fs.mkdir(uploadPath, { recursive: true })

      cb(null, uploadPath)
    } catch (error) {
      cb(error)
    }
  },

  /**
   * Filename callback
   * Generates a unique filename using tripId and timestamp
   */
  filename: (req, file, cb) => {
    let uniqueName = `banner-${req.params.tripId}-${Date.now()}${path.extname(file.originalname)}`

    cb(null, uniqueName)
  }
})

/**
 * -------------------- File Type Filter --------------------
 * Allows only valid image formats
 */
let imageFileFilter = (req, file, cb) => {
  // Allowed MIME types for banner images
  let allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  
  if (allowedTypes.includes(file.mimetype)) {
    // Accept file
    cb(null, true)
  } else {
    // Reject file with error
    cb(
      new Error('Invalid file type. Only JPEG, PNG and WebP are allowed'),
      false
    )
  }
}

/**
 * -------------------- Multer Upload Middleware --------------------
 * Handles banner uploads with size and type restrictions
 */
let uploadBanner = multer({
  storage: bannerStorage,   // Custom disk storage
  fileFilter: imageFileFilter, // Image-only uploads
  limits: {
    // Maximum file size: 5MB
    fileSize: 5 * 1024 * 1024
  }
})

/**
 * Export upload middleware
 */
module.exports = {
  uploadBanner
}
