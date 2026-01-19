const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    googleId: {
  type: String,
  unique: true,
  sparse: true
},
authProvider: {
  type: String,
  enum: ['local', 'google'],
  default: 'local'
}
  },
  { timestamps: true }
)

// 🔐 Hash password before saving
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return
  this.password = await bcrypt.hash(this.password, 12)
})

// 🔍 Instance method to check password
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

module.exports = mongoose.model('User', UserSchema)
