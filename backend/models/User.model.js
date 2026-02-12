const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const AUTH_PROVIDERS = ['local', 'google']
//User Schema
//Represents a registered user
const UserSchema = new mongoose.Schema(
  {
    // User full name
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    // User email
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email',
      ],
    },
    // Hashed password
password: {
  type: String,
  required: function () {
    return this.authProvider === 'local'
  },
  validate: {
    validator: function (value) {
      if (!value) return true
      return value.length >= 8
    },
    message: 'Password must be at least 8 characters'
  },
  select: false,
},
    // Google OAuth ID
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple null values
    },
    // Authentication provider
authProvider: {
  type: String,
  enum: {
    values: AUTH_PROVIDERS,
    message: '{VALUE} is not a valid auth provider',
  },
  default: 'local',
},

// Account status
isActive: {
  type: Boolean,
  default: true,
},

// Password reset fields
passwordResetToken: String,
passwordResetExpires: Date,

// Login tracking
lastLogin: Date,

  },
  {
    timestamps: true,
    toJSON: {
      transform: function(doc, ret) {
        delete ret.password
        delete ret.passwordResetToken
        delete ret.passwordResetExpires
        delete ret.__v
        return ret
      }
    }
  }
)

// Indexes
UserSchema.index({ email: 1 })
UserSchema.index({ googleId: 1 })
UserSchema.index({ email: 1, googleId: 1 })   
UserSchema.index({ authProvider: 1 })
UserSchema.index({ isActive: 1 })

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  try {
    this.password = await bcrypt.hash(this.password, 10)
    next()
  } catch (error) {
    next(error)
  }
})

//Compare passwords
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}
//Create password reset token
UserSchema.methods.createPasswordResetToken = function () {
  // Generate random token
  const resetToken = crypto.randomBytes(32).toString('hex') 
  // Hash token and store in database
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex')
  // Token expires in 1 hour
  this.passwordResetExpires = Date.now() + 60 * 60 * 1000
  return resetToken // Return unhashed token to send via email
}

//Update last login timestamp
UserSchema.methods.updateLastLogin = function () {
  this.lastLogin = new Date()
  return this.save({ validateBeforeSave: false })
}
// Find active users
UserSchema.statics.findActiveUsers = function () {
  return this.find({ isActive: true })
}

module.exports = mongoose.model('User', UserSchema)


