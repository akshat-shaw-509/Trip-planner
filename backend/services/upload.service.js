const fs = require('fs').promises
const path = require('path')
const { BadRequestError } = require('../utils/errors')
const { MAX_FILE_SIZE } = require('../config/constants')

/**
 * Validate file size
 */
const validateFileSize = (file) => {
  if (file.size > MAX_FILE_SIZE) {
    throw new BadRequestError(
      `File too large (${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB max)`
    )
  }
}

/**
 * Upload file to specified folder
 * @param {Object} file - Multer file object
 * @param {String} folder - Target folder (e.g., 'images', 'banners', 'documents')
 */
const uploadFile = async (file, folder = 'images') => {
  if (!file) throw new BadRequestError('No file provided')

  validateFileSize(file)

  // Create unique filename
  const fileName = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`

  // Dynamic upload directory based on folder parameter
  const uploadDir = path.join(__dirname, '../../uploads', folder)
  await fs.mkdir(uploadDir, { recursive: true })

  // Write file to disk
  const fullPath = path.join(uploadDir, fileName)
  await fs.writeFile(fullPath, file.buffer)

  return {
    url: `/uploads/${folder}/${fileName}`,
    fileName,
    path: fullPath
  }
}

/**
 * Upload image (shorthand for uploadFile with 'images' folder)
 */
const uploadImage = async (file, folder = 'images') => {
  return uploadFile(file, folder)
}

/**
 * Upload document (shorthand for uploadFile with 'documents' folder)
 */
const uploadDocument = async (file, folder = 'documents') => {
  return uploadFile(file, folder)
}

/**
 * Upload banner image
 * @param {Object} file - Multer file object
 * @param {String} tripId - Trip ID for organizing banners
 */
const uploadBanner = async (file, tripId) => {
  if (!file) throw new BadRequestError('No file provided')

  validateFileSize(file)

  // Create unique filename with tripId
  const fileName = `banner-${tripId}-${Date.now()}${path.extname(file.originalname)}`

  // Upload to banners folder
  const uploadDir = path.join(__dirname, '../../uploads/banners')
  await fs.mkdir(uploadDir, { recursive: true })

  // Write file to disk
  const fullPath = path.join(uploadDir, fileName)
  await fs.writeFile(fullPath, file.buffer)

  return {
    url: `/uploads/banners/${fileName}`,
    fileName,
    path: fullPath
  }
}

/**
 * Delete file safely (no error if file missing)
 * @param {String} fileUrl - URL or path of the file to delete
 */
const deleteFile = async (fileUrl) => {
  if (!fileUrl) {
    return { success: false, message: 'No file URL provided' }
  }

  try {
    let filePath

    // Handle URL format (/uploads/...)
    if (fileUrl.startsWith('/uploads/')) {
      const relativePath = fileUrl.replace('/uploads/', '')
      filePath = path.join(__dirname, '../../uploads', relativePath)
    } 
    // Handle absolute path
    else if (path.isAbsolute(fileUrl)) {
      filePath = fileUrl
    } 
    // Handle relative path
    else {
      filePath = path.join(__dirname, '../../uploads', fileUrl)
    }

    // Check if file exists before deleting
    await fs.access(filePath)
    await fs.unlink(filePath)

    return { success: true, message: 'File deleted successfully' }
  } catch (error) {
    // File doesn't exist or can't be deleted - silent failure
    if (error.code === 'ENOENT') {
      return { success: true, message: 'File already deleted or does not exist' }
    }
    throw new BadRequestError(`Failed to delete file: ${error.message}`)
  }
}

/**
 * Delete old banner and upload new one
 * @param {String} oldBannerUrl - URL of old banner to delete
 * @param {Object} newFile - New banner file
 * @param {String} tripId - Trip ID
 */
const replaceBanner = async (oldBannerUrl, newFile, tripId) => {
  // Upload new banner first
  const newBanner = await uploadBanner(newFile, tripId)

  // Delete old banner (silent failure if it doesn't exist)
  if (oldBannerUrl) {
    await deleteFile(oldBannerUrl)
  }

  return newBanner
}

module.exports = {
  uploadFile,
  uploadImage,
  uploadDocument,
  uploadBanner,
  deleteFile,
  replaceBanner
}
