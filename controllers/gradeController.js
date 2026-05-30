const Grade = require('../models/Grade');
const { asyncHandler } = require('../middleware/error');

// @desc    Add grade
// @route   POST /api/grades
// @access  Staff only
exports.addGrade = asyncHandler(async (req, res) => {
  const grade = await Grade.create({ ...req.body, addedBy: req.user._id });
  res.status(201).json({ success: true, data: grade });
});

// @desc    Bulk add grades
// @route   POST /api/grades/bulk
// @access  Staff only
exports.bulkAddGrades = asyncHandler(async (req, res) => {
  // req.body.grades = [{ student, subject, examType, marksObtained, totalMarks, ... }]
  const gradeData = req.body.grades.map(g => ({ ...g, addedBy: req.user._id }));
  const grades = await Grade.insertMany(gradeData);
  res.status(201).json({ success: true, count: grades.length, data: grades });
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
