const User = require('../models/User');
const { asyncHandler } = require('../middleware/error');
const { sendTokenResponse } = require('../utils/token');

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
