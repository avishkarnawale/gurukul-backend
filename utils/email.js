const nodemailer = require('nodemailer');

// Owner inbox that receives the OTP. Override with OWNER_EMAIL env if needed.
const OWNER_EMAIL =
  process.env.OWNER_EMAIL || process.env.EMAIL_USER || 'gurukulclass.dorlewadi@gmail.com';

let cachedTransport = null;

function getTransport() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS; // Gmail App Password (16 chars, no spaces)
  if (!user || !pass) return null;

  if (!cachedTransport) {
    const port = Number(process.env.EMAIL_PORT) || 587; // 587 STARTTLS is the most firewall-friendly
    cachedTransport = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port,
      secure: String(process.env.EMAIL_SECURE ?? (port === 465 ? 'true' : 'false')) === 'true',
      auth: { user, pass },
      // Fail fast instead of hanging the HTTP request if the network blocks SMTP.
      connectionTimeout: 12000,
      greetingTimeout: 8000,
      socketTimeout: 15000,
    });
  }
  return cachedTransport;
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
  ]);
}

/** Send a one-time password by email. Returns { sent, reason }. */
async function sendEmailOtp(to, otp) {
  const transport = getTransport();
  if (!transport) return { sent: false, reason: 'Email (SMTP) not configured' };

  const from = process.env.EMAIL_FROM || `"Gurukul Classes" <${process.env.EMAIL_USER}>`;
  try {
    await withTimeout(transport.sendMail({
      from,
      to,
      subject: 'Your Gurukul Classes password reset code',
      text: `Your password reset code is ${otp}. It expires in 10 minutes. If you did not request this, ignore this email.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #eee;border-radius:12px">
          <h2 style="margin:0 0 8px;color:#111">Gurukul Classes</h2>
          <p style="color:#444">Use the code below to reset your admin password.</p>
          <p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#111;margin:16px 0">${otp}</p>
          <p style="color:#888;font-size:13px">This code expires in 10 minutes. If you didn't request a password reset, you can safely ignore this email.</p>
        </div>`,
    }), 18000, 'Email send');
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: e.message };
  }
}

module.exports = { sendEmailOtp, OWNER_EMAIL };
