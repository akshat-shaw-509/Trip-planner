let express = require('express')
let router = express.Router()
let authController = require('../controllers/auth.controller')
let { authenticate } = require('../middleware/auth.middleware')
let { 
  validateRegister, 
  validateLogin,
  validatePasswordReset,
  validateChangePassword 
} = require('../middleware/validation.middleware')

// Public routes (no authentication required)
router.post('/register', validateRegister, authController.register)
router.post('/login', validateLogin, authController.login)
router.post('/refresh', authController.refreshToken)
router.post('/forgot-password', authController.forgotPassword)
router.post('/reset-password/:token', validatePasswordReset, authController.resetPassword)

// Protected routes (authentication required)
router.get('/me', authenticate, authController.getCurrentUser)
router.post('/logout', authenticate, authController.logout)
router.post('/change-password', authenticate, validateChangePassword, authController.changePassword)

module.exports = router