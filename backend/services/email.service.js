// Nodemailer -> used for sending emails
let nodemailer = require('nodemailer')

// Environment configuration (email credentials, frontend URL, etc.)
let config = require('../config/env')

/**
 * -------------------- Transporter Helper --------------------
 * Creates and returns a Nodemailer transporter
 */
const getTransporter = () => {
  // If email credentials are missing, disable email functionality
  if (!config.email.user || !config.email.password) {
    console.warn('Email service not configured. Email functionality will be disabled.')
    return null
  }

  // Create SMTP transporter
  return nodemailer.createTransport({
    service: config.email.service,
    auth: {
      user: config.email.user,
      pass: config.email.password
    }
  })
}

/**
 * -------------------- Core Email Sender --------------------
 * Sends a generic email
 */
let sendEmail = async (to, subject, html, text = null) => {
  let transporter = getTransporter()

  // Gracefully exit if email service is disabled
  if (!transporter) {
    console.warn('Email not sent - service not configured')
    return { messageId: null, success: false }
  }

  try {
    // Mail configuration
    let mailOptions = {
      from: `Planora <${config.email.from}>`,
      to,
      subject,
      html,

      // Fallback plain-text version
      text: text || html.replace(/<[^>]*>/g, ''),
    }

    // Send email
    let info = await transporter.sendMail(mailOptions)
    console.log('Email sent:', info.messageId)

    return info
  } catch (error) {
    console.error('Email send error:', error.message)
    throw new Error('Failed to send email')
  }
}

/**
 * -------------------- Template-Based Emails --------------------
 */

/**
 * Send welcome email after successful registration
 */
let sendWelcomeEmail = async (user) => {
  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h1 style="color: #3b82f6;">Welcome to Planora!</h1>
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>Thanks for joining! Create your first trip to get started.</p>
      <a href="${config.frontendUrl}/dashboard" 
         style="display: inline-block; padding: 12px 24px; background: #3b82f6; 
                color: white; text-decoration: none; border-radius: 6px;">
        Go to Dashboard
      </a>
      <p>Happy travels!<br>The Planora Team</p>
    </div>
  `

  return sendEmail(user.email, 'Welcome to Planora!', html)
}

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h1 style="color: #3b82f6;">Reset Your Password</h1>
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>Click below to reset your password (expires in 1 hour):</p>
      <a href="${resetUrl}" 
         style="display: inline-block; padding: 12px 24px; background: #3b82f6; 
                color: white; text-decoration: none; border-radius: 6px;">
        Reset Password
      </a>
      <p>Ignore if you didn't request this.</p>
      <p>The Planora Team</p>
    </div>
  `

  return sendEmail(user.email, 'Password Reset', html)
}

/**
 * Send trip invitation email
 */
const sendTripInvitation = async (trip, inviterName, inviteeEmail) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h1 style="color: #3b82f6;">Trip Invitation</h1>
      <p><strong>${inviterName}</strong> invited you to:</p>
      <h2>${trip.title}</h2>
      <p><strong>Destination:</strong> ${trip.destination}</p>
      <p><strong>Dates:</strong> 
        ${new Date(trip.startDate).toLocaleDateString()} - 
        ${new Date(trip.endDate).toLocaleDateString()}
      </p>
      <a href="${config.frontendUrl}/trips/${trip._id}" 
         style="display: inline-block; padding: 12px 24px; background: #3b82f6; 
                color: white; text-decoration: none; border-radius: 6px;">
        View Trip
      </a>
    </div>
  `

  return sendEmail(inviteeEmail, `Join "${trip.title}"`, html)
}

/**
 * Send email verification link
 */
const sendVerificationEmail = async (user, verifyToken) => {
  const verifyUrl = `${config.frontendUrl}/verify-email?token=${verifyToken}`

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h1 style="color: #3b82f6;">Verify Your Email</h1>
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>Please verify your email by clicking the button below:</p>
      <a href="${verifyUrl}" 
         style="display: inline-block; padding: 12px 24px; background: #3b82f6; 
                color: white; text-decoration: none; border-radius: 6px;">
        Verify Email
      </a>
      <p>If you didn’t create this account, ignore this email.</p>
      <p>The Planora Team</p>
    </div>
  `

  return sendEmail(user.email, 'Verify your email', html)
}

/**
 * Export email service functions
 */
module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendTripInvitation,
}
