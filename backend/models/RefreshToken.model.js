<<<<<<< HEAD
// models/RefreshToken.model.js
let mongoose = require('mongoose')

let refreshTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now, expires: 30 * 86400 }
})

=======
// models/RefreshToken.model.js
let mongoose = require('mongoose')

let refreshTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now, expires: 30 * 86400 }
})

>>>>>>> 0007615a5a7317e8689fc9727726ee86c5585786
module.exports = mongoose.model('RefreshToken', refreshTokenSchema)