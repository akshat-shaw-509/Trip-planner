<<<<<<< HEAD
const mongoose = require('mongoose')

// bcrypt -> used for hashing and comparing passwords securely
const bcrypt = require('bcryptjs')

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
    }
  },
  {
    // Automatically manage createdAt & updatedAt
    timestamps: true
  }
)

/**
 * -------------------- Schema Hooks --------------------
 */

// Hash password before saving to database
UserSchema.pre('save', async function () {
  // Only hash if password field is modified
  if (!this.isModified('password')) return

  // Hash password with salt rounds = 12
  this.password = await bcrypt.hash(this.password, 12)
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
 * Create and export User model
 */
module.exports = mongoose.model('User', UserSchema)
=======
const mongoose = require('mongoose')

// bcrypt -> used for hashing and comparing passwords securely
const bcrypt = require('bcryptjs')

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
    }
  },
  {
    // Automatically manage createdAt & updatedAt
    timestamps: true
  }
)

/**
 * -------------------- Schema Hooks --------------------
 */

// Hash password before saving to database
UserSchema.pre('save', async function () {
  // Only hash if password field is modified
  if (!this.isModified('password')) return

  // Hash password with salt rounds = 12
  this.password = await bcrypt.hash(this.password, 12)
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
 * Create and export User model
 */
module.exports = mongoose.model('User', UserSchema)
>>>>>>> 0007615a5a7317e8689fc9727726ee86c5585786
