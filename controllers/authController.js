const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/error');
const { sendTokenResponse } = require('../utils/token');
const { sendWhatsAppOtp, OWNER_WA } = require('../utils/whatsapp');

const OTP_TTL_MS = 10 * 60 * 1000;   // 10 minutes
const OTP_RESEND_MS = 60 * 1000;     // 60s cooldown between sends
const OTP_MAX_ATTEMPTS = 5;

function maskPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 4) return '••••';
  const last4 = digits.slice(-4);
  return `+91 ••••••${last4}`;
}

// Owner is the only admin; find the admin to reset. Email is optional and only
// needed to disambiguate if multiple admins ever exist.
async function findResetAdmin(email) {
  if (email) return User.findOne({ email: String(email).toLowerCase(), role: 'admin' });
  const admins = await User.find({ role: 'admin' }).limit(2);
  return admins.length === 1 ? admins[0] : null;
}

// @desc    Student login — Roll Number + Date of Birth
// @route   POST /api/auth/student-login
// @access  Public
exports.studentLogin = asyncHandler(async (req, res) => {
  const { rollNumber, dateOfBirth } = req.body;
  if (!rollNumber || !dateOfBirth)
    return res.status(400).json({ success: false, error: 'Roll number and date of birth are required', message: 'Roll number and date of birth are required' });

  const user = await User.findOne({ rollNumber: rollNumber.toUpperCase(), role: 'student' }).select('+password');
  if (!user)
    return res.status(401).json({ success: false, error: 'No student found with this roll number', message: 'No student found with this roll number' });

  // DOB is the password (YYYY-MM-DD format)
  const match = await user.matchPassword(dateOfBirth);
  if (!match)
    return res.status(401).json({ success: false, error: 'Incorrect date of birth', message: 'Incorrect date of birth' });

  sendTokenResponse(user, 200, res);
});

// @desc    Staff / Admin login — Email + Password
// @route   POST /api/auth/staff-login
// @access  Public
exports.staffLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, error: 'Email and password are required', message: 'Email and password are required' });

  const user = await User.findOne({ email, role: { $in: ['staff', 'admin'] } }).select('+password');
  if (!user || !(await user.matchPassword(password)))
    return res.status(401).json({ success: false, error: 'Invalid credentials', message: 'Invalid credentials' });

  sendTokenResponse(user, 200, res);
});

// @desc    Request a password-reset OTP (admin/owner) — sent via WhatsApp
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res) => {
  const admin = await findResetAdmin(req.body.email);
  if (!admin) {
    return res.status(404).json({
      success: false,
      message: req.body.email
        ? 'No admin account found for this email'
        : 'Could not identify the admin account. Please enter your admin email.',
    });
  }

  const full = await User.findById(admin._id).select('+resetOtpSentAt');
  if (full.resetOtpSentAt && Date.now() - new Date(full.resetOtpSentAt).getTime() < OTP_RESEND_MS) {
    return res.status(429).json({ success: false, message: 'Please wait a minute before requesting another code.' });
  }

  // Use the admin's own phone, else fall back to the configured owner number.
  const phone = admin.phone || OWNER_WA;
  if (!phone) {
    return res.status(400).json({ success: false, message: 'No phone number is set on the admin account.' });
  }

  // Generate 6-digit OTP, store only its hash.
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  full.resetOtpHash = await bcrypt.hash(otp, 10);
  full.resetOtpExpires = new Date(Date.now() + OTP_TTL_MS);
  full.resetOtpAttempts = 0;
  full.resetOtpSentAt = new Date();
  await full.save();

  const result = await sendWhatsAppOtp(phone, otp).catch((e) => ({ sent: false, reason: e.message }));
  // Fallback so the owner is never locked out before WhatsApp is configured.
  if (!result.sent) {
    console.log(`[forgot-password] WhatsApp not delivered (${result.reason}). OTP for ${admin.email}: ${otp}`);
  }

  res.json({
    success: true,
    message: result.sent
      ? 'OTP sent to your WhatsApp number.'
      : 'OTP generated. WhatsApp delivery is not configured yet — check the server logs for the code.',
    maskedPhone: maskPhone(phone),
    delivered: !!result.sent,
  });
});

// @desc    Reset password using the OTP
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = asyncHandler(async (req, res) => {
  const { otp, newPassword, email } = req.body;
  if (!otp || !newPassword)
    return res.status(400).json({ success: false, message: 'OTP and new password are required' });
  if (String(newPassword).length < 6)
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

  const admin = await findResetAdmin(email);
  if (!admin) return res.status(404).json({ success: false, message: 'Admin account not found' });

  const full = await User.findById(admin._id).select('+password +resetOtpHash +resetOtpExpires +resetOtpAttempts');
  if (!full.resetOtpHash || !full.resetOtpExpires)
    return res.status(400).json({ success: false, message: 'No active reset request. Please request a new code.' });
  if (Date.now() > new Date(full.resetOtpExpires).getTime())
    return res.status(400).json({ success: false, message: 'This code has expired. Please request a new one.' });
  if (full.resetOtpAttempts >= OTP_MAX_ATTEMPTS)
    return res.status(429).json({ success: false, message: 'Too many incorrect attempts. Please request a new code.' });

  const match = await bcrypt.compare(String(otp), full.resetOtpHash);
  if (!match) {
    full.resetOtpAttempts += 1;
    await full.save();
    return res.status(400).json({ success: false, message: 'Incorrect code. Please try again.' });
  }

  full.password = newPassword; // hashed by pre-save hook
  full.resetOtpHash = undefined;
  full.resetOtpExpires = undefined;
  full.resetOtpAttempts = 0;
  full.resetOtpSentAt = undefined;
  await full.save();

  sendTokenResponse(full, 200, res);
});

// @desc    Get logged-in user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  res.json({ success: true, data: user });
});

// @desc    Update profile
// @route   PUT /api/auth/me
// @access  Private
exports.updateProfile = asyncHandler(async (req, res) => {
  const allowed = ['name', 'phone', 'avatar', 'address', 'parentName', 'parentPhone'];
  const updates = {};
  allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-password');
  res.json({ success: true, data: user });
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(currentPassword)))
    return res.status(400).json({ success: false, message: 'Current password is incorrect' });
  user.password = newPassword;
  await user.save();
  sendTokenResponse(user, 200, res);
});
