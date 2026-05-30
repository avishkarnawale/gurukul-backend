const Announcement = require('../models/Announcement');
const Notification = require('../models/Notification');
const { asyncHandler } = require('../middleware/error');
const { notifyStudentsOfNotice } = require('../utils/notifyStudents');

// @desc    Create announcement
// @route   POST /api/announcements
// @access  Staff only
exports.createAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.create({ ...req.body, postedBy: req.user._id });
  const notifyResult = await notifyStudentsOfNotice(announcement);
  res.status(201).json({
    success: true,
    data: announcement,
    notificationsSent: notifyResult.created,
  });
});

// @desc    Get announcements (filtered by role/class)
// @route   GET /api/announcements
// @access  Private
exports.getAnnouncements = asyncHandler(async (req, res) => {
  const filter = { $or: [{ targetAudience: 'all' }] };

  if (req.user.role === 'student') {
    filter.$or.push({ targetAudience: 'students' });
    if (req.user.class) filter.$or.push({ targetClass: req.user.class });
  } else if (req.user.role === 'staff') {
    filter.$or.push({ targetAudience: 'staff' });
  }

  // Filter out expired announcements
  filter.$or = filter.$or.map(condition => condition);
  const now = new Date();

  const announcements = await Announcement.find({
    $and: [
      filter,
      { $or: [{ expiresAt: { $gt: now } }, { expiresAt: null }] },
    ],
  })
    .populate('postedBy', 'name role')
    .sort({ isPinned: -1, createdAt: -1 });

  res.json({ success: true, count: announcements.length, data: announcements });
});

// @desc    Get single announcement
// @route   GET /api/announcements/:id
// @access  Private
exports.getAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id).populate('postedBy', 'name role');
  if (!announcement) return res.status(404).json({ success: false, message: 'Announcement not found' });
  res.json({ success: true, data: announcement });
});

// @desc    Update announcement
// @route   PUT /api/announcements/:id
// @access  Staff only
exports.updateAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!announcement) return res.status(404).json({ success: false, message: 'Announcement not found' });
  res.json({ success: true, data: announcement });
});

// @desc    Delete announcement
// @route   DELETE /api/announcements/:id
// @access  Staff only
exports.deleteAnnouncement = asyncHandler(async (req, res) => {
  await Announcement.findByIdAndDelete(req.params.id);
  await Notification.deleteMany({ refId: req.params.id, type: 'notice' });
  res.json({ success: true, message: 'Announcement deleted' });
});
