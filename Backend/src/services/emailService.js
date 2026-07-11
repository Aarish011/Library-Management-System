const nodemailer = require('nodemailer');

function getTransporter() {
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT || 587);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    throw new Error('Email service is not configured');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

async function sendPasswordResetEmail({ to, name, resetUrl }) {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  await transporter.sendMail({
    from: `"Bookshelf Library" <${from}>`,
    to,
    subject: 'Reset your Bookshelf password',
    text: [
      `Hello ${name || 'Student'},`,
      '',
      'We received a request to reset your Bookshelf Library password.',
      `Open this link to set a new password: ${resetUrl}`,
      '',
      'This link will expire in 15 minutes.',
      'If you did not request this, you can ignore this email.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #172033;">
        <h2 style="color: #11182B;">Reset your password</h2>
        <p>Hello ${name || 'Student'},</p>
        <p>We received a request to reset your Bookshelf Library password.</p>
        <p>
          <a href="${resetUrl}" style="display: inline-block; background: #11182B; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 8px; font-weight: 700;">
            Reset password
          </a>
        </p>
        <p style="font-size: 13px; color: #667085;">This link will expire in 15 minutes.</p>
        <p style="font-size: 13px; color: #667085;">If you did not request this, you can ignore this email.</p>
      </div>
    `,
  });
}

module.exports = { sendPasswordResetEmail };
