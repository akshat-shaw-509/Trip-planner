const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')   
//User Schema 
const UserSchema = new mongoose.Schema(
  {
    //User full name
    name: {
      type: String,
      required: true,
      trim: true
    },
    //User email address
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    //User password (hashed)
     //select: false -> excluded from queries by default
   password: {
  type: String,
  required: true,
  minlength: 8,
  select: false
},
  //Google OAuth ID (if registered via Google)
  //sparse -> allows multiple null values
    googleId: {
      type: String,
      unique: true,
      sparse: true
    },
    //Authentication provider
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local'
    }
  },
  {
    timestamps: true
  }
)
//Schema Hooks
// Hash password before saving to database
UserSchema.pre('save', async function () {
  // Only hash if password field is modified
  if (!this.isModified('password')) return
  // Hash password with salt rounds = 12
  this.password = await bcrypt.hash(this.password, 12)
})
//Compare provided password with hashed password
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}
//Compare provided password with hashed password
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
  return resetToken
}
module.exports = mongoose.model('User', UserSchema)

