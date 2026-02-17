import nodemailer from 'nodemailer';

export const sendEmail = async ({ email, subject, message }) => {
  try {
    // Validate environment variables
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('❌ EMAIL_USER or EMAIL_PASS not configured in .env');
      
      // In development, log the email instead of failing
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 [DEV MODE] Email would be sent:');
        console.log('To:', email);
        console.log('Subject:', subject);
        console.log('Message:', message);
        return { success: true, devMode: true };
      }
      
      throw new Error('Email configuration missing');
    }
    console.log("process.env.EMAIL_USER",process.env.EMAIL_USER);
    console.log("process.env.EMAIL_USER", process.env.EMAIL_PASS);
    

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Must be App Password, not regular password
      },
    });

    // Verify connection
    await transporter.verify();

    // Send email
    const info = await transporter.sendMail({
      from: `"Community Platform" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: subject,
      html: message,
    });

    console.log('✅ Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('❌ Email sending failed:', error.message);

    // In development, log instead of failing
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 [DEV MODE] Email would be sent:');
      console.log('To:', email);
      console.log('Subject:', subject);
      console.log('Message:', message);
      return { success: true, devMode: true };
    }

    throw error;
  }
};

/**
 * Send OTP email with consistent formatting
 */
export const sendOTPEmail = async ({ email, otp, purpose, communityName }) => {
  const message = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
        .container { background-color: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto; }
        .header { color: #333; margin-bottom: 20px; }
        .otp { font-size: 32px; font-weight: bold; color: #6366F1; letter-spacing: 5px; text-align: center; padding: 20px; background-color: #EFF6FF; border-radius: 8px; margin: 20px 0; }
        .info { color: #666; font-size: 14px; margin-top: 20px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2 class="header">${purpose}</h2>
        ${communityName ? `<p>Community: <strong>${communityName}</strong></p>` : ''}
        <p>Your verification code is:</p>
        <div class="otp">${otp}</div>
        <div class="info">
          <p>⏱️ This code will expire in <strong>10 minutes</strong></p>
          <p>🔒 Do not share this code with anyone</p>
        </div>
        <div class="footer">
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ email, subject: purpose, message });
};