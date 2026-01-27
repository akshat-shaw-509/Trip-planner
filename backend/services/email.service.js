const nodemailer = require('nodemailer');
const config = require('../config/env');

let transporter = null;

if (config.email.user && config.email.password) {
  transporter = nodemailer.createTransport({
    service: config.email.service,
    auth: {
      user: config.email.user,
      pass: config.email.password,
    },
  });

  // ✅ ADD THIS BLOCK (SMTP VERIFICATION)
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ SMTP CONFIG ERROR:', error);
    } else {
      console.log('✅ SMTP SERVER READY');
    }
  });

} else {
  console.warn('Email service not configured. Email functionality disabled.');
}

/**
 * -------------------- Core Email Sender --------------------
 * Sends a generic email
 */
let sendEmail = async (to, subject, html, text = null) => {
  if (!transporter) {
    console.warn('Email not sent - transporter not configured')
    return { messageId: null, success: false }
  }
  try {
    // Mail configuration
    let mailOptions = {
      from: `Planora <${config.email.user}>`,
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

const sendPasswordResetEmail = async (email, resetToken) => {
  if (!transporter) {
  console.warn('Password reset email not sent - transporter not configured');
  return;
}
  const resetURL = `${process.env.FRONTEND_URL}/pages/login.html?reset=${resetToken}`;

  const mailOptions = {
    from: `Planora <${config.email.user}>`,
    to: email,
    subject: 'Password Reset Request - Planora',
    html: `<!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hi there,</p>
            <p>We received a request to reset your password for your Planora account.</p>
            <p>Click the button below to reset your password:</p>
            <p style="text-align: center;">
              <a href="${resetURL}" class="button">Reset My Password</a>
            </p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
            <p>For security reasons, we cannot reset your password without you clicking the link above.</p>
          </div>
          <div class="footer">
            <p>© 2024 Planora. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>`
  };
  return transporter.sendMail(mailOptions);
};


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
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendVerificationEmail,
  sendTripInvitation,
}
