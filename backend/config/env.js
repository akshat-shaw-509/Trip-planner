const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

const requiredEnvVars = [
  'NODE_ENV',
  'PORT', 
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET'
]

const optionalEnvVars = [
  'EMAIL_SERVICE',
  'EMAIL_USER',
  'EMAIL_PASS',      
  'FRONTEND_URL',
  'MAX_FILE_SIZE',
  'UPLOAD_DIR'
]

const validateEnv = () => {
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar])
  
  if (missing.length > 0) {
    console.error('Missing required env vars')
    console.error(missing.join(', '))
    process.exit(1)
  }

  if (process.env.NODE_ENV !== 'test') {
    const warnings = optionalEnvVars.filter(envVar => !process.env[envVar])
    if (warnings.length > 0) {
      console.warn('Missing optional env vars:', warnings.join(', '))
    }
  }
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  mongoUri: process.env.MONGODB_URI,
  
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },

 email: {
  service: process.env.EMAIL_SERVICE || 'gmail',
  user: process.env.EMAIL_USER,
  password: process.env.EMAIL_PASS,  
  from: process.env.EMAIL_FROM || process.env.EMAIL_USER
},

  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5242880, // 5MB default
    uploadDir: process.env.UPLOAD_DIR || 'uploads'
  },

  google: {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET
},
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5000',
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test'
}
validateEnv()
module.exports = config
