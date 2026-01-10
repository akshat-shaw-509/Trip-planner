require('dotenv').config()

const requiredEnvVars = [
  'NODE_ENV',
  'PORT', 
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET'
];

const optionalEnvVars = [
  'MAPBOX_ACCESS_TOKEN',
  'WEATHER_API_KEY', 
  'CURRENCY_API_KEY',
  'EMAIL_SERVICE',
  'EMAIL_USER',
  'EMAIL_PASSWORD',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_BUCKET_NAME',
  'AWS_REGION',
  'FRONTEND_URL'
];

const validateEnv = () => {
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar])
  
  if (missing.length > 0) {
    console.error('❌ Missing required env vars:', missing.join(', '))
    process.exit(1)
  }

  // Warn about missing optional vars (skip in test)
  if (process.env.NODE_ENV !== 'test') {
    const warnings = optionalEnvVars.filter(envVar => !process.env[envVar])
    if (warnings.length > 0) {
      console.warn('⚠️  Missing optional env vars:', warnings.join(', '))
    }
  }
};

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
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER
  },

  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    bucketName: process.env.AWS_BUCKET_NAME,
    region: process.env.AWS_REGION || 'us-east-1'
  },

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5000',

  // Environment flags
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test'
}

// Validate before export
validateEnv()

module.exports = config