let fs = require('fs').promises
let path = require('path')
let { BadRequestError } = require('../utils/errors')
let { MAX_FILE_SIZE } = require('../config/constants')

/**
 * Validate file size
 */
let validateFileSize = (file) => {
  if (file.size > MAX_FILE_SIZE) {
    throw BadRequestError(
      `File too large (${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB max)`
    )
  }
}

/**
 * Upload image (fixed folder: uploads/images)
 */
let uploadFile = async (file) => {
  if (!file) throw BadRequestError('No file provided')

  validateFileSize(file)

  // Create unique filename
  let fileName = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`

  // Fixed upload directory (no generic folder param)
  let uploadDir = path.join(__dirname, '../../uploads/images')
  await fs.mkdir(uploadDir, { recursive: true })

  // Write file to disk
  let fullPath = path.join(uploadDir, fileName)
  await fs.writeFile(fullPath, file.buffer)

  return {
    url: `/uploads/images/${fileName}`,
    fileName
  }
}

/**
 * Delete image safely (no error if file missing)
 */
let deleteFile = async (fileUrl) => {
  if (!fileUrl || !fileUrl.startsWith('/uploads/')) return

  let relativePath = fileUrl.replace('/uploads/', '')
  let fullPath = path.join(__dirname, '../../uploads', relativePath)

  // Silent failure if file does not exist
  await fs.unlink(fullPath).catch(() => {})
}

module.exports = {
  uploadFile,
  deleteFile
}
