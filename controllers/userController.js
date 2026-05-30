const User = require('../models/User');
const Fee = require('../models/Fee');
const Attendance = require('../models/Attendance');
const Grade = require('../models/Grade');
const Homework = require('../models/Homework');
const Notification = require('../models/Notification');
const { asyncHandler } = require('../middleware/error');
const { parseClassId } = require('../utils/classes');

const DEFAULT_FEE_TERM = 'Term 1 2025-26';

// @desc    Get all users (with filters)
// @route   GET /api/users?role=student&class=Class 10 A
// @access  Staff/Admin
exports.getAllUsers = asyncHandler(async (req, res) => {
  const { role, class: cls } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (cls) filter.class = cls;
  const users = await User.find(filter).select('-password').sort({ name: 1 });
  res.json({ success: true, count: users.length, data: users });
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Staff/Admin
exports.getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, data: user });
});

// @desc    Create user (admin adds student or staff)
// @route   POST /api/users
// @access  Admin
exports.createUser = asyncHandler(async (req, res) => {
  const { role, dateOfBirth, ...rest } = req.body;

  // Staff may only create students; admins can create any role
  if (req.user.role === 'staff' && role !== 'student') {
    return res.status(403).json({ success: false, error: 'Staff can only add students', message: 'Staff can only add students' });
  }

  // Students: password = DOB; Staff: password in body
  const password = role === 'student' ? dateOfBirth : req.body.password;
  const payload = { ...rest, role, dateOfBirth, password };
  if (role === 'student' && payload.class) {
    const parsed = parseClassId(payload.class);
    if (parsed) payload.board = parsed.board;
  }
  const user = await User.create(payload);

  // Fees are set manually per student (different standards charge different fees).
  // Only create a fee record if an amount was explicitly provided when adding.
  const feeAmount = Number(req.body.feeAmount);
  if (role === 'student' && Number.isFinite(feeAmount) && feeAmount > 0) {
    await Fee.create({
      student: user._id,
      term: req.body.feeTerm || DEFAULT_FEE_TERM,
      totalAmount: feeAmount,
      dueDate: req.body.feeDueDate
        ? new Date(req.body.feeDueDate)
        : new Date(new Date().setMonth(new Date().getMonth() + 3)),
      description: req.body.feeDescription || 'Tuition Fee',
      payments: [],
    });
  }

  const userObj = user.toObject();
  delete userObj.password;
  res.status(201).json({ success: true, data: userObj });
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Admin
exports.updateUser = asyncHandler(async (req, res) => {
  delete req.body.password; // use change-password endpoint instead
  const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).select('-password');
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, data: user });
});

// @desc    Toggle active status
// @route   PUT /api/users/:id/toggle-status
// @access  Admin
exports.toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  user.isActive = !user.isActive;
  await user.save();
  res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}`, isActive: user.isActive });
});

// @desc    Reset student password to DOB
// @route   PUT /api/users/:id/reset-password
// @access  Admin
exports.resetStudentPassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user || user.role !== 'student')
    return res.status(400).json({ success: false, message: 'Student not found' });
  user.password = user.dateOfBirth; // will be hashed by pre-save hook
  await user.save();
  res.json({ success: true, message: 'Password reset to date of birth' });
});

// @desc    Delete user (cascades all related records so the dashboard stays clean)
// @route   DELETE /api/users/:id
// @access  Admin
exports.deleteUser = asyncHandler(async (req, res) => {
  const id = req.params.id;
  await User.findByIdAndDelete(id);
  // Remove everything that referenced this user so no orphaned fees/attendance
  // keep showing up in dashboard totals after the student is gone.
  await Promise.all([
    Fee.deleteMany({ student: id }),
    Attendance.deleteMany({ student: id }),
    Grade.deleteMany({ student: id }),
    Homework.deleteMany({ student: id }),
    Notification.deleteMany({ user: id }),
  ]);
  res.json({ success: true, message: 'User and related records deleted' });
});
