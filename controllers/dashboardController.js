const User = require('../models/User');
const Attendance = require('../models/Attendance');
const { formatClassLabel, migrateLegacyClassId } = require('../utils/classes');
const { dedupeByDay } = require('../utils/attendance');
const Homework = require('../models/Homework');
const Fee = require('../models/Fee');
const Announcement = require('../models/Announcement');
const { asyncHandler } = require('../middleware/error');

// @desc    Admin Dashboard Stats
// @route   GET /api/dashboard/admin
// @access  Staff/Admin
exports.adminDashboard = asyncHandler(async (req, res) => {
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const [
    totalStudents,
    totalStaff,
    pendingFeesResult,
    attendanceAgg,
    recentNotices,
  ] = await Promise.all([
    User.countDocuments({ role: 'student', isActive: true }),
    User.countDocuments({ role: { $in: ['staff', 'admin'] }, isActive: true }),
    Fee.aggregate([
      { $match: { status: { $in: ['pending', 'partial'] } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, paid: { $sum: '$paidAmount' } } },
    ]),
    Attendance.aggregate([
      { $match: { date: { $gte: since } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
        },
      },
    ]),
    Announcement.find({ $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] })
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(5)
      .populate('postedBy', 'name')
      .lean(),
  ]);

  const pendingFees = pendingFeesResult[0]
    ? pendingFeesResult[0].total - pendingFeesResult[0].paid
    : 0;

  const attRow = attendanceAgg[0];
  const sevenDayAttendance = attRow?.total > 0
    ? Math.round((attRow.present / attRow.total) * 100)
    : 0;

  res.json({
    success: true,
    stats: {
      students: totalStudents,
      staff: totalStaff,
      due: pendingFees,
      attPct: sevenDayAttendance,
    },
    data: {
      totalStudents,
      totalStaff,
      pendingFees,
      sevenDayAttendance,
      recentNotices,
    },
  });
});

// @desc    Student Dashboard Stats
// @route   GET /api/dashboard/student
// @access  Student
exports.studentDashboard = asyncHandler(async (req, res) => {
  const studentId = req.user._id;
  const studentClass = req.user.class;
  const now = new Date();

  const noticeFilter = {
    $and: [
      { $or: [{ targetAudience: 'all' }, { targetAudience: 'students' }, { targetClass: studentClass }] },
      { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
    ],
  };

  const [
    attendanceRecords,
    feesAgg,
    fees,
    notices,
    upcomingHomework,
  ] = await Promise.all([
    Attendance.find({ student: studentId }).select('date status subject updatedAt').lean(),
    Fee.aggregate([
      { $match: { student: studentId, status: { $in: ['pending', 'partial'] } } },
      { $group: { _id: null, due: { $sum: { $subtract: ['$totalAmount', '$paidAmount'] } } } },
    ]),
    Fee.find({ student: studentId, status: { $in: ['pending', 'partial'] } })
      .select('term totalAmount paidAmount status dueDate')
      .lean(),
    Announcement.find(noticeFilter)
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(5)
      .populate('postedBy', 'name')
      .lean(),
    Homework.find({ class: studentClass, dueDate: { $gte: now } })
      .select('title subject dueDate submissions')
      .sort({ dueDate: 1 })
      .limit(5)
      .lean(),
  ]);

  const dedupedAttendance = dedupeByDay(attendanceRecords);
  const totalDays = dedupedAttendance.length;
  const presentDays = dedupedAttendance.filter((r) => r.status === 'present').length;
  const attendancePercent = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

  const feesDue = feesAgg[0]?.due ?? 0;
  const pendingHomeworkCount = upcomingHomework.filter(
    (hw) => !hw.submissions.some((s) => String(s.student) === String(studentId)),
  ).length;

  const upcomingWithStatus = upcomingHomework.map((hw) => ({
    _id: hw._id,
    title: hw.title,
    subject: hw.subject,
    dueDate: hw.dueDate,
    submitted: hw.submissions.some((s) => String(s.student) === String(studentId)),
  }));

  const homeworkCards = upcomingWithStatus.map((h) => ({
    id: h._id,
    title: h.title,
    due_date: h.dueDate ? new Date(h.dueDate).toISOString().slice(0, 10) : null,
    subjects: { name: h.subject },
  }));

  const noticeCards = notices.map((n) => ({
    id: n._id,
    title: n.title,
    content: n.content,
    pinned: n.isPinned,
    created_at: n.createdAt,
  }));

  const feeItems = fees.map((f) => ({
    id: f._id,
    term: f.term,
    total_amount: f.totalAmount,
    paid_amount: f.paidAmount,
    status: f.status,
    due_date: f.dueDate ? new Date(f.dueDate).toISOString().slice(0, 10) : null,
  }));

  res.json({
    success: true,
    student: {
      full_name: req.user.name,
      roll_number: req.user.rollNumber,
      classes: {
        name:
          formatClassLabel(studentClass) ||
          formatClassLabel(migrateLegacyClassId(studentClass)) ||
          studentClass ||
          '',
      },
    },
    stats: {
      attendance: { pct: attendancePercent, present: presentDays, total: totalDays },
      homework: homeworkCards,
      fees: { due: feesDue, items: feeItems },
      notices: noticeCards,
    },
    data: {
      studentName: req.user.name,
      class: studentClass,
      rollNumber: req.user.rollNumber,
      attendance: { percentage: attendancePercent, present: presentDays, total: totalDays },
      pendingHomework: pendingHomeworkCount,
      feesDue,
      noticesCount: notices.length,
      upcomingHomework: upcomingWithStatus,
      latestNotices: notices,
    },
  });
});
