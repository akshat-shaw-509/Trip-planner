const fs = require('fs').promises
const path = require('path')
const { BadRequestError } = require('../utils/errors')
const { MAX_FILE_SIZE } = require('../config/constants')

// basic size validation before saving file
const validateFileSize = (file) => {
  if (file.size > MAX_FILE_SIZE) {
    throw new BadRequestError(
      `File too large (${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB max)`
    )
  }
}

// save file into a specific uploads folder
const uploadFile = async (file, folder = 'images') => {
  if (!file) throw new BadRequestError('No file provided')

  validateFileSize(file)
  const fileName = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`

  const uploadDir = path.join(__dirname, '../../uploads', folder)
  await fs.mkdir(uploadDir, { recursive: true })
  const fullPath = path.join(uploadDir, fileName)
  await fs.writeFile(fullPath, file.buffer)

  return {
    url: `/uploads/${folder}/${fileName}`,
    fileName,
    path: fullPath
  }
}

// shorthand for image uploads
const uploadImage = async (file, folder = 'images') => {
  return uploadFile(file, folder)
}

// shorthand for document uploads
const uploadDocument = async (file, folder = 'documents') => {
  return uploadFile(file, folder)
}

// upload banner image for a trip
const uploadBanner = async (file, tripId) => {
  if (!file) throw new BadRequestError('No file provided')

  validateFileSize(file)
  const fileName = `banner-${tripId}-${Date.now()}${path.extname(file.originalname)}`
  const uploadDir = path.join(__dirname, '../../uploads/banners')
  await fs.mkdir(uploadDir, { recursive: true })
  const fullPath = path.join(uploadDir, fileName)
  await fs.writeFile(fullPath, file.buffer)

  return {
    url: `/uploads/banners/${fileName}`,
    fileName,
    path: fullPath
  }
}

// delete file from disk
const deleteFile = async (fileUrl) => {
  if (!fileUrl) {
    return { success: false, message: 'No file URL provided' }
  }

  try {
    let filePath
    if (fileUrl.startsWith('/uploads/')) {
      const relativePath = fileUrl.replace('/uploads/', '')
      filePath = path.join(__dirname, '../../uploads', relativePath)
    } 
    
    else if (path.isAbsolute(fileUrl)) {
      filePath = fileUrl
    } 
    
    else {
      filePath = path.join(__dirname, '../../uploads', fileUrl)
    }
    await fs.access(filePath)
    await fs.unlink(filePath)

    return { success: true, message: 'File deleted successfully' }
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { success: true, message: 'File already deleted or does not exist' }
    }
    throw new BadRequestError(`Failed to delete file: ${error.message}`)
  }
}

// replace banner by uploading new file and removing old one
const replaceBanner = async (oldBannerUrl, newFile, tripId) => {
  const newBanner = await uploadBanner(newFile, tripId)
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
