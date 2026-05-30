const nodemailer = require('nodemailer');

// Owner inbox that receives the OTP. Override with OWNER_EMAIL env if needed.
const OWNER_EMAIL =
  process.env.OWNER_EMAIL || process.env.EMAIL_USER || 'gurukulclass.dorlewadi@gmail.com';

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
  ]);
}

function otpHtml(otp) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #eee;border-radius:12px">
      <h2 style="margin:0 0 8px;color:#111">Gurukul Classes</h2>
      <p style="color:#444">Use the code below to reset your admin password.</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#111;margin:16px 0">${otp}</p>
      <p style="color:#888;font-size:13px">This code expires in 10 minutes. If you didn't request a password reset, you can safely ignore this email.</p>
    </div>`;
}
function otpText(otp) {
  return `Your Gurukul Classes password reset code is ${otp}. It expires in 10 minutes. If you did not request this, ignore this email.`;
}

// ── Provider 1: Resend (HTTPS API, works on Render free tier) ──────────────────
async function sendViaResend(to, otp) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  const from = process.env.RESEND_FROM || 'Gurukul Classes <onboarding@resend.dev>';
  const res = await withTimeout(
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        subject: 'Your Gurukul Classes password reset code',
        html: otpHtml(otp),
        text: otpText(otp),
      }),
    }),
    15000,
    'Resend',
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { sent: false, reason: data.message || data.error?.message || `Resend HTTP ${res.status}` };
  return { sent: true };
}

// ── Provider 2: Brevo / Sendinblue (HTTPS API) ─────────────────────────────────
async function sendViaBrevo(to, otp) {
  const key = process.env.BREVO_API_KEY;
  if (!key) return null;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || OWNER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || 'Gurukul Classes';
  const res = await withTimeout(
    fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': key, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName },
        to: [{ email: to }],
        subject: 'Your Gurukul Classes password reset code',
        htmlContent: otpHtml(otp),
        textContent: otpText(otp),
      }),
    }),
    15000,
    'Brevo',
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { sent: false, reason: data.message || `Brevo HTTP ${res.status}` };
  return { sent: true };
}

// ── Provider 3: SMTP via nodemailer (local dev / paid hosts only) ──────────────
let cachedTransport = null;
function getTransport() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) return null;
  if (!cachedTransport) {
    const port = Number(process.env.EMAIL_PORT) || 587;
    cachedTransport = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port,
      secure: String(process.env.EMAIL_SECURE ?? (port === 465 ? 'true' : 'false')) === 'true',
      auth: { user, pass },
      connectionTimeout: 12000,
      greetingTimeout: 8000,
      socketTimeout: 15000,
    });
  }
  return cachedTransport;
}
async function sendViaSmtp(to, otp) {
  const transport = getTransport();
  if (!transport) return null;
  const from = process.env.EMAIL_FROM || `"Gurukul Classes" <${process.env.EMAIL_USER}>`;
  await withTimeout(
    transport.sendMail({ from, to, subject: 'Your Gurukul Classes password reset code', text: otpText(otp), html: otpHtml(otp) }),
    18000,
    'SMTP send',
  );
  return { sent: true };
}

/**
 * Send a one-time password by email. Tries HTTPS providers first (Resend, Brevo)
 * because Render's free tier blocks outbound SMTP, then falls back to SMTP for
 * local dev / paid hosts. Returns { sent, reason }.
 */
async function sendEmailOtp(to, otp) {
  const providers = [sendViaResend, sendViaBrevo, sendViaSmtp];
  let lastReason = 'Email not configured';
  for (const provider of providers) {
    try {
      const result = await provider(to, otp);
      if (!result) continue; // provider not configured
      if (result.sent) return { sent: true };
      lastReason = result.reason || lastReason;
    } catch (e) {
      lastReason = e.message;
    }
  }
  return { sent: false, reason: lastReason };
}

module.exports = { sendEmailOtp, OWNER_EMAIL };
