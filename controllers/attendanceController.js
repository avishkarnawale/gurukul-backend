const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const { asyncHandler } = require('../middleware/error');
const {
  DAILY_SUBJECT,
  dedupeByDay,
  dayKey,
  startOfDay,
  parseDayRange,
} = require('../utils/attendance');

function toObjectId(id) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('Invalid student id');
    err.statusCode = 400;
    throw err;
  }
  return new mongoose.Types.ObjectId(id);
}

// @desc    Mark attendance for a class (bulk)
// @route   POST /api/attendance
// @access  Staff/Admin
exports.markAttendance = asyncHandler(async (req, res) => {
  const { records, class: cls, date } = req.body;
  if (!cls || !date || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ success: false, message: 'class, date, and records are required' });
  }

  const day = startOfDay(date);
  const { start, end } = parseDayRange(date);

  for (const r of records) {
    const studentOid = toObjectId(r.studentId);
    await Attendance.deleteMany({
      student: studentOid,
      date: { $gte: start, $lte: end },
    });
    await Attendance.create({
      student: studentOid,
      class: cls,
      date: day,
      status: r.status,
      subject: DAILY_SUBJECT,
      remarks: r.remarks,
      markedBy: req.user._id,
    });
  }

  res.status(201).json({
    success: true,
    message: `Attendance marked for ${records.length} students`,
  });
});

// @desc    Get attendance for logged-in student
// @route   GET /api/attendance/me
// @access  Student
exports.getMyAttendance = asyncHandler(async (req, res) => {
  const studentId = req.user._id;
  const { from, to } = req.query;
  const filter = { student: studentId };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  const raw = await Attendance.find(filter).sort({ date: -1 });
  const records = dedupeByDay(raw);
  const total = records.length;
  const present = records.filter((r) => r.status === 'present').length;
  const absent = records.filter((r) => r.status === 'absent').length;
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

  const data = records.map((r) => ({
    _id: r._id,
    date: dayKey(r.date),
    status: r.status,
    class: r.class,
  }));

  res.json({
    success: true,
    summary: { total, present, absent, percentage },
    data,
  });
});

// @desc    Get attendance for a specific student (staff)
// @route   GET /api/attendance/student/:studentId
// @access  Staff/Admin
exports.getStudentAttendance = asyncHandler(async (req, res) => {
  const raw = await Attendance.find({ student: req.params.studentId }).sort({ date: -1 });
  const records = dedupeByDay(raw);
  const total = records.length;
  const present = records.filter((r) => r.status === 'present').length;
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
  res.json({
    success: true,
    summary: { total, present, absent: total - present, percentage },
    data: records,
  });
});

// @desc    Get attendance for a class on a date
// @route   GET /api/attendance/class?class=Class 10|CBSE|Morning&date=2024-01-15
// @access  Staff/Admin
exports.getClassAttendance = asyncHandler(async (req, res) => {
  const { class: cls, date } = req.query;
  if (!date) {
    return res.json({ success: true, count: 0, data: [] });
  }

  const { start, end } = parseDayRange(date);
  const filter = { date: { $gte: start, $lte: end } };
  if (cls) filter.class = cls;

  const raw = await Attendance.find(filter).populate('student', 'name rollNumber').sort({ updatedAt: -1 });
  const byStudent = new Map();
  for (const r of raw) {
    const sid = String(r.student?._id ?? r.student);
    if (!byStudent.has(sid)) byStudent.set(sid, r);
  }

  const data = Array.from(byStudent.values());
  res.json({ success: true, count: data.length, data });
});

// @desc    Get 7-day attendance % for all students (admin dashboard)
// @route   GET /api/attendance/summary-7day
// @access  Staff/Admin
exports.get7DaySummary = asyncHandler(async (req, res) => {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const raw = await Attendance.find({ date: { $gte: since } });
  const records = dedupeByDay(raw);
  const total = records.length;
  const present = records.filter((r) => r.status === 'present').length;
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
  res.json({ success: true, data: { total, present, percentage, since } });
});
