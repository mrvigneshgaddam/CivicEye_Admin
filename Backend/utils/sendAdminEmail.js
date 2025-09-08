// Backend/utils/sendAdminEmail.js
const nodemailer = require('nodemailer');

async function sendAdminEmail(user) {
  try {
    // Check if email configuration is available
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('Email configuration missing. Skipping email notification.');
      return;
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { 
        user: process.env.SMTP_USER, 
        pass: process.env.SMTP_PASS 
      }
    });

    // Email content - sent to the USER, not admin
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: user.email,  // ← Send to the USER'S email, not admin
      subject: `🚨 Your CivicEye Account Has Been Locked`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 5px; }
            .content { background: white; padding: 20px; border-radius: 5px; margin-top: 20px; border: 1px solid #e9ecef; }
            .alert { color: #dc3545; font-weight: bold; }
            .button { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
            .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #6c757d; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>🚨 CivicEye Security Alert</h2>
            </div>
            <div class="content">
              <h3 class="alert">Your Account Has Been Locked</h3>
              <p><strong>User Email:</strong> ${user.email}</p>
              <p><strong>User Name:</strong> ${user.name}</p>
              <p><strong>Badge Number:</strong> ${user.badgeNumber || 'N/A'}</p>
              <p><strong>Department:</strong> ${user.department || 'N/A'}</p>
              <p><strong>Lockout Time:</strong> ${new Date().toLocaleString()}</p>
              <p><strong>Auto Unlock:</strong> ${new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString()}</p>
              
              <h4>What happened?</h4>
              <p>Your account has been locked due to multiple failed login attempts.</p>
              
              <h4>What to do next:</h4>
              <ul>
                <li>Wait for the account to automatically unlock in 24 hours</li>
                <li>Contact your system administrator for immediate assistance</li>
                <li>If you did not attempt to login, please notify security immediately</li>
              </ul>
              
              <p>If you need immediate access, please contact your administrator at ${process.env.ADMIN_EMAIL || 'your administrator'}.</p>
            </div>
            <div class="footer">
              <p>This is an automated security alert from CivicEye System.</p>
              <p>Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    // Send email
    await transporter.sendMail(mailOptions);
    console.log(`Lockout notification sent to user: ${user.email}`);
    
  } catch (error) {
    console.error('Failed to send user email:', error.message);
    // Don't throw the error to prevent login from failing due to email issues
  }
}

// Optional: Function to send to admin as well (if you want both)
async function sendAdminNotification(user) {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.ADMIN_EMAIL) {
      console.warn('Email configuration missing. Skipping admin notification.');
      return;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { 
        user: process.env.SMTP_USER, 
        pass: process.env.SMTP_PASS 
      }
    });

    const unlockLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/unlock?policeId=${user._id}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: process.env.ADMIN_EMAIL,
      subject: `🚨 Account Locked: ${user.email} - CivicEye System`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>/* same styles as above */</style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>🚨 CivicEye Admin Security Alert</h2>
            </div>
            <div class="content">
              <h3 class="alert">Account Lockout Detected</h3>
              <p><strong>User Email:</strong> ${user.email}</p>
              <p><strong>User Name:</strong> ${user.name}</p>
              <p><strong>Badge Number:</strong> ${user.badgeNumber || 'N/A'}</p>
              <p><strong>Department:</strong> ${user.department || 'N/A'}</p>
              <p><strong>Lockout Time:</strong> ${new Date().toLocaleString()}</p>
              
              <h4>Recommended Actions:</h4>
              <ul>
                <li>Verify if this is a legitimate lockout or suspicious activity</li>
                <li>Contact the user to confirm their identity</li>
                <li>Review recent login attempts for this account</li>
                <li>Manually unlock the account if necessary</li>
              </ul>
              
              <p>
                <a href="${unlockLink}" class="button">Unlock Account Now</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Admin notification sent for user: ${user.email}`);
    
  } catch (error) {
    console.error('Failed to send admin email:', error.message);
  }
}

module.exports = { sendAdminEmail, sendAdminNotification };