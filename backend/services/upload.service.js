let AWS = require('aws-sdk')
let config = require('../config/env');
let fs = require('fs').promises
let path = require('path')
let { BadRequestError } = require('../utils/errors');
let { MAX_FILE_SIZE, ALLOWED_IMAGE_TYPES, ALLOWED_DOCUMENT_TYPES } = require('../config/constants');

// Configure AWS S3
const getS3Client = ()=>{
    if(!config.aws?.accessKeyId || !config.aws?.secretAccessKey){
        return null
}
    return new AWS.S3({
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
    region: config.aws.region,
  })
}

let validateFileSize = (file) => {
  if (file.size > MAX_FILE_SIZE) {
    throw new BadRequestError(`File too large (${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB max)`)
  }
}

let validateImageType = (file) => {
  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    throw new BadRequestError(`Image only: ${ALLOWED_IMAGE_TYPES.join(', ')}`)
  }
}

let validateDocumentType = (file) => {
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.mimetype)) {
    throw new BadRequestError(`Docs only: ${ALLOWED_DOCUMENT_TYPES.join(', ')}`)
  }
}

const uploadFile = async (file, folder = 'uploads') => {
  if (!file) throw new BadRequestError('No file provided')
  validateFileSize(file)
  let fileName = `${folder}/${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`
  if (getS3Client()) {
    let params = {
      Bucket: config.aws.bucketName,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
    }
    let result = await getS3Client().upload(params).promise()
    return { url: result.Location, key: result.Key, bucket: result.Bucket }
  }
  let uploadDir = path.join(__dirname, '../../', folder)
  await fs.mkdir(uploadDir, { recursive: true })
  let filePath = path.join(uploadDir, fileName.split('/').pop())
  await fs.writeFile(filePath, file.buffer)
  return { 
    url: `/${folder}/${fileName.split('/').pop()}`, 
    path: filePath, 
    fileName: fileName.split('/').pop()
  }
}

let uploadImage = async (file, folder = 'images') => {
  validateImageType(file)
  return uploadFile(file, folder)
}

let uploadDocument = async (file, folder = 'documents') => {
  validateDocumentType(file)
  return uploadFile(file, folder)
}

let uploadReceipt = async (file, tripId) => {
  validateDocumentType(file)
  return uploadFile(file, `receipts/${tripId}`)
}

let deleteFile = async (fileKey) => {
  if (!getS3Client()) throw new Error('AWS not configured')
  await getS3Client().deleteObject({
    Bucket: config.aws.bucketName,
    Key: fileKey,
  }).promise()
  return { message: 'File deleted' }
}

let getSignedUrl = async (fileKey, expiresIn = 3600) => {
  if (!getS3Client()) throw new Error('AWS not configured')
  let url = await getS3Client().getSignedUrlPromise('getObject', {
    Bucket: config.aws.bucketName,
    Key: fileKey,
    Expires: expiresIn,
  })
  return { url }
}

module.exports = {
  uploadFile,
  uploadImage,
  uploadDocument,
  uploadReceipt,
  deleteFile,
  getSignedUrl,
  uploadFileLocal: uploadFile
}