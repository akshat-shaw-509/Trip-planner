// middleware/upload.middleware.js
// Create this new file for Multer configuration

let multer = require('multer');
let path = require('path');
let fs = require('fs').promises;

// Configure storage for banner uploads
let bannerStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    let uploadPath = path.join(__dirname, '../uploads/banners');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Use tripId from route params
    let uniqueName = `banner-${req.params.tripId}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter for images only
let imageFileFilter = (req, file, cb) => {
  let allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG and WebP are allowed'), false);
  }
};

// Multer instance for banner uploads
let uploadBanner = multer({
  storage: bannerStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

module.exports = {
  uploadBanner
};