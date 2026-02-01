const mongoose = require('mongoose')

let auditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true }, 
  ip: String,
  userAgent: String,
  details: mongoose.Schema.Types.Mixed,
}, { timestamps: true })

