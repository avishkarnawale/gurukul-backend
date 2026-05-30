const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Grade = require('../models/Grade');
const Fee = require('../models/Fee');
const { asyncHandler } = require('../middleware/error');
const { dedupeByDay, dayKey } = require('../utils/attendance');
const { formatClassLabel } = require('../utils/classes');

// Build the full snapshot object for a student (used by JSON + PDF endpoints)
async function buildStudentSnapshot(studentId) {
  const student = await User.findOne({ _id: studentId, role: 'student' }).select('-password');
  if (!student) return null;

  // Attendance — ALL records since the student started (no date cap)
  const rawAtt = await Attendance.find({ student: studentId }).sort({ date: -1 });
  const attRecords = dedupeByDay(rawAtt);
  const attTotal = attRecords.length;
  const attPresent = attRecords.filter((r) => r.status === 'present').length;
  const attAbsent = attTotal - attPresent;
  const attPct = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : 0;

  const attendance = {
    summary: {
      totalDays: attTotal,
      presentDays: attPresent,
      absentDays: attAbsent,
      percentage: attPct,
    },
    recent: attRecords.slice(0, 15).map((r) => ({
      id: String(r._id),
      date: dayKey(r.date),
      status: r.status,
      class: r.class,
    })),
  };

  // Grades — latest 3 tests overall
  const grades = await Grade.find({ student: studentId }).sort({ createdAt: -1 }).limit(3);
  const tests = grades.map((g) => ({
    id: String(g._id),
    subject: g.subject,
    examType: g.examType,
    marksObtained: g.marksObtained,
    totalMarks: g.totalMarks,
    percentage: g.totalMarks > 0 ? Math.round((g.marksObtained / g.totalMarks) * 100) : null,
    createdAt: g.createdAt,
  }));

  // Fees — all records + pending total
  const feeDocs = await Fee.find({ student: studentId }).sort({ createdAt: -1 });
  const totalPending = feeDocs.reduce(
    (sum, f) => sum + Math.max(0, f.totalAmount - (f.paidAmount || 0)),
    0,
  );
  const feesItems = feeDocs.map((f) => ({
    id: String(f._id),
    term: f.term,
    totalAmount: f.totalAmount,
    paidAmount: f.paidAmount,
    pendingAmount: Math.max(0, f.totalAmount - (f.paidAmount || 0)),
    status: f.status,
    dueDate: f.dueDate,
  }));

  return {
    student,
    attendance,
    tests,
    fees: { totalPending, items: feesItems },
  };
}

// @desc    Aggregated snapshot for a single student
// @route   GET /api/users/:id/summary
// @access  Staff/Admin
exports.getStudentSummary = asyncHandler(async (req, res) => {
  const snapshot = await buildStudentSnapshot(req.params.id);
  if (!snapshot) {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }
  res.json({ success: true, data: snapshot });
});

// @desc    Download a single student's report as PDF
// @route   GET /api/users/:id/summary/pdf
// @access  Staff/Admin
exports.getStudentSummaryPdf = asyncHandler(async (req, res) => {
  const snapshot = await buildStudentSnapshot(req.params.id);
  if (!snapshot) {
    return res.status(404).json({ success: false, message: 'Student not found' });
  }

  const s = snapshot.student;
  const { buildStudentReportPdf } = require('../utils/studentReportPdf');
  const pdf = await buildStudentReportPdf({
    student: {
      name: s.name,
      rollNumber: s.rollNumber,
      class: s.class,
      classLabel: formatClassLabel(s.class) || s.class,
      board: s.board,
      parentName: s.parentName,
      parentPhone: s.parentPhone,
      address: s.address,
    },
    attendance: snapshot.attendance,
    tests: snapshot.tests,
    fees: snapshot.fees,
  });

  const filename = `Gurukul-${s.rollNumber || 'student'}-report.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(pdf);
});
