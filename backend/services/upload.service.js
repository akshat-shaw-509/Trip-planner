let fs = require('fs').promises
let path = require('path')
let { BadRequestError } = require('../utils/errors')
let { MAX_FILE_SIZE, ALLOWED_IMAGE_TYPES, ALLOWED_DOCUMENT_TYPES } = require('../config/constants')
let validateFileSize = (file) => {
  if (file.size > MAX_FILE_SIZE) {
    throw BadRequestError(`File too large (${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB max)`)
  }
}
let validateImageType = (file) => {
  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    throw BadRequestError(`Image only: ${ALLOWED_IMAGE_TYPES.join(', ')}`)
  }
}
let validateDocumentType = (file) => {
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.mimetype)) {
    throw BadRequestError(`Docs only: ${ALLOWED_DOCUMENT_TYPES.join(', ')}`)
  }
}

let uploadFile = async (file, folder = 'uploads') => {
  if (!file) throw BadRequestError('No file provided')
  validateFileSize(file)
  
  // Create unique filename
  let fileName = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`
  
  // Create upload directory path
  let uploadDir = path.join(__dirname, '../../uploads', folder)
  await fs.mkdir(uploadDir, { recursive: true })
  
  // Full file path
  let filePath = path.join(uploadDir, fileName)
  
  // Write file to disk
  await fs.writeFile(filePath, file.buffer)
  
  return { 
    url: `/uploads/${folder}/${fileName}`,
    path: filePath, 
    fileName: fileName,
    folder: folder
  }
}

let deleteFile = async (filePath) => {
  try {
    // Extract relative path if it's a URL
    let relativePath = filePath.startsWith('/uploads/') 
      ? filePath.replace('/uploads/', '')
      : filePath
    
    let fullPath = path.join(__dirname, '../../uploads', relativePath)
    await fs.unlink(fullPath)
    return { message: 'File deleted successfully' }
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw BadRequestError('File not found')
    }
    throw BadRequestError('Failed to delete file')
  }
}

module.exports = {
  uploadFile,
  deleteFile,
}

