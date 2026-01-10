let nodemailer = require('nodemailer')
let config = require('../config/env')

const getTransporter = () => {
  if (!config.email.user || !config.email.password) {
    console.warn('Email service not configured. Email functionality will be disabled.')
    return null
  }
  return nodemailer.createTransporter({
    service:config.email.service,
    auth:{
        user:config.email.user,
        pass:config.email.password
    }
  })
  }

let sendEmail = async (to, subject, html, text = null) => {
    let transporter=getTransporter()
  if (!transporter) {
    console.warn('Email not sent - service not configured')
    return {messageId:null,success:false}
  }

  try {
    let mailOptions = {
      from: `Planora <${config.email.from}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    }
    let info = await transporter.sendMail(mailOptions)
    console.log('Email sent:', info.messageId)
    return info
  } catch (error) {
    console.error('Email send error:', error.message)
    throw new Error('Failed to send email')
  }
}

let sendWelcomeEmail = async (user) => {
  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h1 style="color: #3b82f6;">Welcome to Planora!</h1>
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>Thanks for joining! Create your first trip to get started.</p>
      <a href="${config.frontend.url}/dashboard" 
         style="display: inline-block; padding: 12px 24px; background: #3b82f6; 
                color: white; text-decoration: none; border-radius: 6px;">
        Go to Dashboard
      </a>
      <p>Happy travels!<br>The Planora Team</p>
    </div>
  `
  return sendEmail(user.email,'Welcome to Planora!', html);
};

const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${config.frontend.url}/reset-password?token=${resetToken}`
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

const sendTripInvitation = async (trip, inviterName, inviteeEmail) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h1 style="color: #3b82f6;">Trip Invitation</h1>
      <p><strong>${inviterName}</strong> invited you to:</p>
      <h2>${trip.title}</h2>
      <p><strong>Destination:</strong> ${trip.destination}</p>
      <p><strong>Dates:</strong> ${new Date(trip.startDate).toLocaleDateString()} - ${new Date(trip.endDate).toLocaleDateString()}</p>
      <a href="${config.frontend.url}/trips/${trip._id}" 
         style="display: inline-block; padding: 12px 24px; background: #3b82f6; 
                color: white; text-decoration: none; border-radius: 6px;">
        View Trip
      </a>
    </div>
  `
  return sendEmail(inviteeEmail, `Join "${trip.title}"`, html);
}

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendTripInvitation,
};