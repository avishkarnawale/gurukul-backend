const Grade = require('../models/Grade');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/error');

function letterGrade(marksObtained, totalMarks) {
  const percentage = (marksObtained / totalMarks) * 100;
  if (percentage >= 90) return 'O';
  if (percentage >= 75) return 'A+';
  if (percentage >= 65) return 'A';
  if (percentage >= 55) return 'B+';
  if (percentage >= 50) return 'B';
  if (percentage >= 40) return 'C';
  return 'F';
}

// @desc    Add grade
// @route   POST /api/grades
// @access  Staff only
exports.addGrade = asyncHandler(async (req, res) => {
  const { student, class: cls } = req.body;
  if (!student) {
    return res.status(400).json({ success: false, message: 'Student is required' });
  }
  const user = await User.findById(student).select('role class');
  if (!user || user.role !== 'student') {
    return res.status(400).json({ success: false, message: 'Invalid student' });
  }
  if (cls && user.class !== cls) {
    return res.status(400).json({
      success: false,
      message: 'This student is not enrolled in the selected class',
    });
  }
  const { class: _omit, ...gradeFields } = req.body;
  const grade = await Grade.create({ ...gradeFields, addedBy: req.user._id });
  res.status(201).json({ success: true, data: grade });
});

// @desc    Bulk add grades for a class test
// @route   POST /api/grades/bulk
// @access  Staff only
exports.bulkAddGrades = asyncHandler(async (req, res) => {
  const { grades, class: cls } = req.body;
  if (!Array.isArray(grades) || grades.length === 0) {
    return res.status(400).json({ success: false, message: 'grades array is required' });
  }

  const studentIds = [...new Set(grades.map((g) => String(g.student)))];
  const users = await User.find({ _id: { $in: studentIds }, role: 'student' }).select('_id class');
  const userById = new Map(users.map((u) => [String(u._id), u]));

  const gradeData = [];
  for (const g of grades) {
    const user = userById.get(String(g.student));
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid student in grades list' });
    }
    if (cls && user.class !== cls) {
      return res.status(400).json({
        success: false,
        message: 'One or more students are not enrolled in the selected class',
      });
    }
    gradeData.push({
      student: user._id,
      subject: g.subject,
      examType: g.examType,
      marksObtained: g.marksObtained,
      totalMarks: g.totalMarks,
      grade: letterGrade(g.marksObtained, g.totalMarks),
      addedBy: req.user._id,
    });
  }

  const created = await Grade.insertMany(gradeData);
  res.status(201).json({ success: true, count: created.length, data: created });
});

// @desc    Get grades for a student
// @route   GET /api/grades/student/:studentId?
// @access  Private
exports.getStudentGrades = asyncHandler(async (req, res) => {
  const studentId = req.user.role === 'student' ? req.user._id : req.params.studentId;
  const { subject, examType, semester } = req.query;

  const filter = { student: studentId };
  if (subject) filter.subject = subject;
  if (examType) filter.examType = examType;
  if (semester) filter.semester = Number(semester);

  const grades = await Grade.find(filter).populate('addedBy', 'name').sort({ createdAt: -1 });

  // Build summary
  const summary = {};
  grades.forEach(g => {
    if (!summary[g.subject]) summary[g.subject] = { totalObtained: 0, totalMax: 0, grades: [] };
    summary[g.subject].totalObtained += g.marksObtained;
    summary[g.subject].totalMax += g.totalMarks;
    summary[g.subject].grades.push(g.grade);
  });

  res.json({ success: true, count: grades.length, summary, data: grades });
});

// @desc    Get grades for a class/subject (staff view)
// @route   GET /api/grades/class
// @access  Staff only
exports.getClassGrades = asyncHandler(async (req, res) => {
  const { subject, examType, semester } = req.query;
  const filter = {};
  if (subject) filter.subject = subject;
  if (examType) filter.examType = examType;
  if (semester) filter.semester = Number(semester);

  const grades = await Grade.find(filter).populate('student', 'name rollNumber class').sort({ 'student.rollNumber': 1 });
  res.json({ success: true, count: grades.length, data: grades });
});

// @desc    Update grade
// @route   PUT /api/grades/:id
// @access  Staff only
exports.updateGrade = asyncHandler(async (req, res) => {
  const grade = await Grade.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!grade) return res.status(404).json({ success: false, message: 'Grade not found' });
  res.json({ success: true, data: grade });
});

// @desc    Delete grade
// @route   DELETE /api/grades/:id
// @access  Staff only
exports.deleteGrade = asyncHandler(async (req, res) => {
  await Grade.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Grade deleted' });
});
