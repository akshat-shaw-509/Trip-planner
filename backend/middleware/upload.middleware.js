let multer = require('multer')
let path = require('path')
let fs = require('fs').promises
let bannerStorage = multer.diskStorage({
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
//Filename callback
//Generates a unique filename using tripId and timestamp
  filename: (req, file, cb) => {
    let uniqueName = `banner-${req.params.tripId}-${Date.now()}${path.extname(file.originalname)}`

    cb(null, uniqueName)
  }
})

//File Type Filter
 //Allows only valid image formats
let imageFileFilter = (req, file, cb) => {
  let allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (allowedTypes.includes(file.mimetype)) {
    // Accept file
    cb(null, true)
  } else {
    //Reject file
    cb(
      new Error('Invalid file type. Only JPEG, PNG and WebP are allowed'),
      false
    )
  }
}

let uploadBanner = multer({
  storage: bannerStorage,   
  fileFilter: imageFileFilter, 
  limits: {
    fileSize: 5 * 1024 * 1024
  }
})

module.exports = {
  uploadBanner
}

