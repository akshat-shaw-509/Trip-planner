let mongoose = require('mongoose')
let bcrypt = require('bcryptjs')
let crypto = require('crypto')

let userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name must not exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    avatar: {
      type: String,
      default: null,
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio must not exceed 500 characters'],
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    resetPasswordHash: {
      type: String,
      select: false
    },
    resetPasswordExpires: {
      type: Date,
      select: false
    },
  },
   {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password
        delete ret.resetPasswordHash
        delete ret.resetPasswordExpires
        return ret
      },
    },
  }
)
// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password,10)
  next()
})

// Method to compare passwords
userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain,this.password)
}

// Method to generate password reset token
userSchema.methods.createPasswordResetToken = function () {
  let token=crypto.randomBytes(32).toString('hex')
  this.resetPasswordHash=crypto.createHash('sha256').update(token).digest('hex')
  this.resetPasswordExpires=Date.now()+60*60*1000 
  return token
}

let User = mongoose.model('User', userSchema)
module.exports = User