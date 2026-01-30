const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

/**
 * -------------------- User Schema --------------------
 */
const UserSchema = new mongoose.Schema(
  {
    /**
     * User full name
     */
    name: {
      type: String,
      required: true,
      trim: true
    },
    /**
     * User email address
     * Must be unique across the system
     */
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    /**
     * User password (hashed)
     * select: false -> excluded from queries by default
     */
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false
    },
    /**
     * Password reset token (hashed)
     */
    passwordResetToken: String,
    /**
     * Password reset token expiry time
     */
    passwordResetExpires: Date,
    /**
     * Email verification token (hashed)
     */
    verificationToken: String,
    /**
     * Role-based access control
     */
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    /**
     * Whether the user account is active
     */
    isActive: {
      type: Boolean,
      default: true
    },
    /**
     * Whether the user's email is verified
     */
    isVerified: {
      type: Boolean,
      default: false
    },
    /**
     * Account lock status (for failed login attempts)
     */
    isLocked: {
      type: Boolean,
      default: false
    },
    /**
     * Google OAuth ID (if registered via Google)
     * sparse -> allows multiple null values
     */
    googleId: {
      type: String,
      unique: true,
      sparse: true
    },
    /**
     * Authentication provider
     */
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local'
    },
    /**
     * User profile picture URL
     */
    profilePicture: {
      type: String,
      default: null
    }
  },
  {
    // Automatically manage createdAt & updatedAt
    timestamps: true
  }
)

/**
 * -------------------- Performance Indexes --------------------
 */

// ✅ CRITICAL: Email index for login/register queries (MOST IMPORTANT)
// This is automatically created by unique: true, but we define it explicitly
// for clarity and to ensure it's a proper B-tree index
UserSchema.index({ email: 1 }, { unique: true })

// ✅ Email verification token index
// Sparse: only users with verification tokens will be indexed
// This speeds up email verification lookups
UserSchema.index({ verificationToken: 1 }, { sparse: true })

// ✅ Password reset token index
// Sparse: only users with active reset tokens will be indexed
// This speeds up password reset lookups
UserSchema.index({ passwordResetToken: 1 }, { sparse: true })

// ✅ Google ID index (already defined in schema with unique + sparse)
// No need to add explicitly, but mentioned here for clarity

// ✅ Compound index for common auth queries
// Useful for queries that check both isActive and role together
UserSchema.index({ isActive: 1, role: 1 })

// ✅ Password reset expiry index
// Useful for cleanup queries to find expired reset tokens
UserSchema.index({ passwordResetExpires: 1 }, { sparse: true })

/**
 * -------------------- Schema Hooks --------------------
 */

// Hash password before saving to database
UserSchema.pre('save', async function (next) {
  // Only hash if password field is modified
  if (!this.isModified('password')) return next()
  
  try {
    // Hash password with salt rounds = 12
    this.password = await bcrypt.hash(this.password, 12)
    next()
  } catch (error) {
    next(error)
  }
})

/**
 * -------------------- Instance Methods --------------------
 */

/**
 * Compare provided password with hashed password
 */
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

/**
 * Create password reset token
 */
UserSchema.methods.createPasswordResetToken = function () {
  // Generate random token
  const resetToken = crypto.randomBytes(32).toString('hex')
  
  // Hash token & store in DB
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex')
  
  // Token expires in 1 hour
  this.passwordResetExpires = Date.now() + 60 * 60 * 1000
  
  return resetToken // this goes in the email
}

/**
 * ✅ NEW: Create email verification token
 */
UserSchema.methods.createVerificationToken = function () {
  // Generate random token
  const verificationToken = crypto.randomBytes(32).toString('hex')
  
  // Hash token & store in DB
  this.verificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex')
  
  return verificationToken // this goes in the email
}

/**
 * ✅ NEW: Convert user to safe JSON (exclude sensitive fields)
 * This is called automatically when JSON.stringify() is used
 */
UserSchema.methods.toJSON = function () {
  const user = this.toObject()
  
  // Remove sensitive fields
  delete user.password
  delete user.passwordResetToken
  delete user.passwordResetExpires
  delete user.verificationToken
  
  return user
}

/**
 * Create and export User model
 */
module.exports = mongoose.model('User', UserSchema)



