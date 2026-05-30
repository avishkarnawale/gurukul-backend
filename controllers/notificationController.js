const Notification = require('../models/Notification');
const { asyncHandler } = require('../middleware/error');

// @desc    List notifications for logged-in student
// @route   GET /api/notifications/me
// @access  Student
exports.getMyNotifications = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 30, 50);
  const notifications = await Notification.find({ user: req.user._id })
    .sort({ read: 1, createdAt: -1 })
    .limit(limit);

  const unread = await Notification.countDocuments({ user: req.user._id, read: false });

  res.json({
    success: true,
    unread,
    data: notifications,
  });
});

// @desc    Unread notification count
// @route   GET /api/notifications/me/unread-count
// @access  Student
exports.getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ user: req.user._id, read: false });
  res.json({ success: true, count });
});

// @desc    Mark one notification read
// @route   PUT /api/notifications/:id/read
// @access  Student
exports.markRead = asyncHandler(async (req, res) => {
  const n = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { read: true },
    { new: true },
  );
  if (!n) return res.status(404).json({ success: false, message: 'Notification not found' });
  res.json({ success: true, data: n });
});

// @desc    Mark all notifications read
// @route   PUT /api/notifications/me/read-all
// @access  Student
exports.markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ success: true, message: 'All notifications marked read' });
});
