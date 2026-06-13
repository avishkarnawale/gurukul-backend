const User = require('../models/User');
const Fee = require('../models/Fee');
const Attendance = require('../models/Attendance');
const { asyncHandler } = require('../middleware/error');
const { formatClassLabel } = require('../utils/classes');
const { dedupeByDay, dayKey } = require('../utils/attendance');
const { toDateString } = require('../utils/date');
const {
  buildClassFeesPdf,
  buildClassStudentsPdf,
  buildMonthlyAttendancePdf,
} = require('../utils/exportPdfs');

function sendPdf(res, buffer, filename) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}

function safeFilename(s) {
  return String(s || 'report').replace(/[^\w\-]+/g, '-').replace(/-+/g, '-').slice(0, 60);
}

// @route GET /api/fees/export/pdf?class=Class 10|SSC
exports.exportClassFeesPdf = asyncHandler(async (req, res) => {
  const cls = req.query.class;
  if (!cls) {
    return res.status(400).json({ success: false, message: 'class query parameter is required' });
  }

  const studentIds = await User.find({ role: 'student', class: cls }).distinct('_id');
  const fees = await Fee.find({ student: { $in: studentIds } })
    .populate('student', 'name rollNumber class')
    .sort({ dueDate: 1 });

  const rows = fees.map((f) => ({
    studentName: f.student?.name,
    rollNumber: f.student?.rollNumber,
    term: f.term,
    totalAmount: f.totalAmount,
    paidAmount: f.paidAmount,
    status: f.status,
  }));

  const total = rows.reduce((s, f) => s + f.totalAmount, 0);
  const collected = rows.reduce((s, f) => s + f.paidAmount, 0);

  const pdf = await buildClassFeesPdf({
    classLabel: formatClassLabel(cls) || cls,
    fees: rows,
    summary: { total, collected, pending: total - collected },
  });

  sendPdf(res, pdf, `Gurukul-Fees-${safeFilename(formatClassLabel(cls))}.pdf`);
});

// @route GET /api/users/export/students/pdf?class=Class 10|SSC
exports.exportStudentsPdf = asyncHandler(async (req, res) => {
  const cls = req.query.class;
  if (!cls) {
    return res.status(400).json({ success: false, message: 'class query parameter is required' });
  }

  const students = await User.find({ role: 'student', class: cls })
    .select('name rollNumber class board parentName parentPhone address')
    .sort({ rollNumber: 1 });

  const rows = students.map((s) => ({
    name: s.name,
    rollNumber: s.rollNumber,
    classLabel: formatClassLabel(s.class) || s.class,
    board: s.board,
    parentName: s.parentName,
    parentPhone: s.parentPhone,
  }));

  const pdf = await buildClassStudentsPdf({
    classLabel: formatClassLabel(cls) || cls,
    students: rows,
  });

  sendPdf(res, pdf, `Gurukul-Students-${safeFilename(formatClassLabel(cls))}.pdf`);
});

// @route GET /api/attendance/export/pdf?class=...&month=2026-05
exports.exportMonthlyAttendancePdf = asyncHandler(async (req, res) => {
  const cls = req.query.class;
  const month = req.query.month; // YYYY-MM
  if (!cls || !month) {
    return res.status(400).json({ success: false, message: 'class and month (YYYY-MM) are required' });
  }

  const m = String(month).match(/^(\d{4})-(\d{2})$/);
  if (!m) {
    return res.status(400).json({ success: false, message: 'month must be YYYY-MM' });
  }

  const year = Number(m[1]);
  const mon = Number(m[2]);
  // Attendance dates are stored as UTC calendar days — match that when building the grid.
  const start = new Date(Date.UTC(year, mon - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, mon, 0, 23, 59, 59, 999));
  const daysInMonth = end.getUTCDate();

  const students = await User.find({ role: 'student', class: cls })
    .select('name rollNumber')
    .sort({ rollNumber: 1 });

  const studentIds = students.map((s) => s._id);
  const raw = await Attendance.find({
    student: { $in: studentIds },
    date: { $gte: start, $lte: end },
  });
  const records = dedupeByDay(raw);

  const grid = {};
  for (const r of records) {
    const sid = String(r.student?._id ?? r.student);
    if (!grid[sid]) grid[sid] = {};
    grid[sid][dayKey(r.date)] = r.status;
  }

  const days = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const key = toDateString(new Date(Date.UTC(year, mon - 1, d, 0, 0, 0, 0)));
    days.push({ day: d, key });
  }

  const monthLabel = new Date(Date.UTC(year, mon - 1, 1)).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const studentRows = students.map((s) => ({
    id: String(s._id),
    name: s.name,
    rollNumber: s.rollNumber,
  }));

  const pdf = await buildMonthlyAttendancePdf({
    classLabel: formatClassLabel(cls) || cls,
    monthLabel,
    students: studentRows,
    days,
    grid,
  });

  sendPdf(res, pdf, `Gurukul-Attendance-${safeFilename(formatClassLabel(cls))}-${month}.pdf`);
});
