<<<<<<< HEAD
// models/AuditLog.model.js
let mongoose = require('mongoose')

let auditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true }, // LOGIN_SUCCESS, PASSWORD_RESET, etc.
  ip: String,
  userAgent: String,
  details: mongoose.Schema.Types.Mixed,
}, { timestamps: true })

=======
// models/AuditLog.model.js
let mongoose = require('mongoose')

let auditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true }, // LOGIN_SUCCESS, PASSWORD_RESET, etc.
  ip: String,
  userAgent: String,
  details: mongoose.Schema.Types.Mixed,
}, { timestamps: true })

>>>>>>> 0007615a5a7317e8689fc9727726ee86c5585786
module.exports = mongoose.model('AuditLog', auditLogSchema)